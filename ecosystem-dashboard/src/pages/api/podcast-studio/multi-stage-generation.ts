import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { jobs, type ScriptGenerationJob } from '@/lib/script-generation-jobs';
import { createScriptGeneration } from '@/lib/db/podcast-studio-db';
import { getStyleProfile, getChildrenOverlay, inferStyleFromPreset, type StyleProfile } from '@/lib/podcast-style-profiles';

/**
 * Multi-stage podcast script generation endpoint
 * 
 * 5-STAGE PROFESSIONAL PRODUCTION PIPELINE:
 * 
 * Stage 1 - PRODUCER: Strategic analysis of source materials
 *   - Identifies key themes, narratives, and talking points
 *   - Creates episode structure and segment breakdown
 *   - Determines optimal flow and pacing strategy
 * 
 * Stage 2 - WRITER: Full script generation from outline
 *   - Writes natural dialogue based on producer's outline
 *   - Incorporates personality traits for each speaker
 *   - Adds conversational elements (stories, examples, humor)
 * 
 * Stage 3 - DIRECTOR: Creative review and enhancement
 *   - Reviews script for engagement and flow
 *   - Adds dramatic beats and tension points
 *   - Ensures natural conversation rhythm
 * 
 * Stage 4 - VOICE DIRECTOR: Performance annotations
 *   - Adds emotion tags for TTS guidance
 *   - Inserts prosody markers (pauses, emphasis)
 *   - Marks interruptions and overlapping speech
 * 
 * Stage 5 - EDITOR: Final polish and quality assurance
 *   - Checks for consistency and coherence
 *   - Removes redundancy, tightens dialogue
 *   - Ensures proper JSON formatting
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { researchMaterials, preset, productionConfig, projectId, seriesContext } = req.body;

    if (!researchMaterials || researchMaterials.length === 0) {
      return res.status(400).json({ error: 'No research materials provided' });
    }

    // Create job ID
    const jobId = uuidv4();
    
    // Initialize job status
    jobs.set(jobId, {
      status: 'pending',
      progress: 0,
      message: 'Initializing script generation...',
      currentStage: 'init',
    });

    // Start async generation
    generateScript(jobId, researchMaterials, preset, productionConfig, seriesContext, projectId);

    // Return 202 Accepted with job ID
    return res.status(202).json({ jobId });
  } catch (error) {
    console.error('❌ Multi-stage generation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function generateScript(
  jobId: string,
  researchMaterials: any[],
  preset: any,
  productionConfig: any,
  seriesContext: any,
  projectId?: string
) {
  console.log(`🚀 [generateScript] Starting job ${jobId}`);
  console.log(`📦 Materials: ${researchMaterials?.length || 0}, Preset: ${preset?.podcastFormat || 'default'}`);
  
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`❌ [generateScript] Job ${jobId} not found in jobs Map!`);
    return;
  }

  const startTime = Date.now();
  console.log(`✅ [generateScript] Job found, starting processing...`);

  // Initialize stage outputs
  job.stageOutputs = {};
  
  // Determine model selection strategy
  const primaryModel = productionConfig?.writerModel || 'qwen3-32b';
  const isLocalModel = primaryModel === 'qwen3-32b';
  
  // Gemini 2.5 Pro uses "thinking" tokens that consume the maxOutputTokens budget.
  // We need to add overhead so the actual script content isn't truncated.
  // Pro: ~2,000-4,000 thinking tokens, Flash: ~500-1,000, Local: 0
  const getThinkingOverhead = (model: string): number => {
    if (model.includes('gemini-2-5-pro') || model.includes('gemini-2.5-pro')) return 4000;
    if (model.includes('gemini')) return 1500;
    return 0; // Local models (Qwen3) have no thinking overhead
  };
  
  // Model assignment per stage
  const getModelForStage = (stage: number): string => {
    if (isLocalModel) return 'qwen3-32b'; // All stages use local model (free!)
    switch (stage) {
      case 1: return 'gemini-2-5-pro';   // Producer - strategic thinking
      case 2: return primaryModel;        // Writer - user's choice
      case 3: return 'gemini-2-5-flash';  // Director - creative review
      case 4: return 'gemini-2-5-flash';  // Voice Director - annotations
      case 5: return 'gemini-2-5-flash';  // Editor - quality assurance
      default: return primaryModel;
    }
  };

  try {
    // Build context from materials
    const sourceContext = researchMaterials.map(m => 
      `### ${m.title}\n${m.content || m.description || ''}`
    ).join('\n\n---\n\n');

    // Build participant descriptions from preset with generic speaker labels
    const defaultParticipants = [
      { name: 'Speaker 1', role: 'host', gender: 'female', personality: 'Curious and skeptical, challenges assumptions, asks probing follow-up questions' },
      { name: 'Speaker 2', role: 'co-host', gender: 'male', personality: 'Knowledgeable but conversational, shares insights through stories and examples' }
    ];
    const participants = preset.participants?.length > 0 ? preset.participants : defaultParticipants;
    
    // Use participant names from the UI (fall back to generic labels only if no name provided)
    const namedParticipants = participants.map((p: any, i: number) => ({
      ...p,
      name: p.name?.trim() || `Speaker ${i + 1}`,
      gender: p.gender || (i === 0 ? 'female' : 'male')
    }));
    
    const participantDescriptions = namedParticipants.map((p: any, i: number) => {
      const pronouns = p.gender === 'female' ? 'she/her' : p.gender === 'male' ? 'he/him' : 'they/them';
      return `${i + 1}. **${p.name}** (${pronouns}): ${p.personality}`;
    }).join('\n');
    
    const speakerNames = namedParticipants.map((p: any) => p.name).join(', ');

    const targetDuration = productionConfig?.targetDuration || 15;
    const targetWordCount = targetDuration * 150;

    // Language-specific settings (used across all stages)
    const language = preset.language || 'english';
    const isSpanish = language === 'spanish';

    // Extract conversational style settings from preset
    const disfluencyLevel = preset.disfluencyLevel || 'medium';
    const emotionalIntensity = preset.emotionalIntensity || 'natural';
    const interruptionFrequency = preset.interruptionFrequency || 'occasional';
    const includeStories = preset.includeStories !== false;
    const includeExamples = preset.includeExamples !== false;
    
    // Build conversational style instructions based on settings
    const getDisfluencyInstructions = () => {
      switch (disfluencyLevel) {
        case 'high': return `ADD NATURAL SPEECH PATTERNS: Include "um", "you know", "I mean", "like", false starts ("I was going to— actually"), self-corrections, and thinking pauses. Make it sound like real unscripted speech.`;
        case 'medium': return `ADD SOME NATURAL SPEECH: Occasionally include "you know", brief pauses, and natural hesitations. Don't overdo it but make it feel human.`;
        case 'low': return `MINIMAL DISFLUENCIES: Keep speech mostly clean but add occasional natural pauses or brief hesitations for authenticity.`;
        default: return `CLEAN SPEECH: No filler words or hesitations.`;
      }
    };
    
    const getEmotionalInstructions = () => {
      switch (emotionalIntensity) {
        case 'very-expressive': return `HIGHLY EXPRESSIVE: Speakers should show strong emotions - excitement, surprise, genuine laughter, passionate disagreement, "wow" moments. Let personalities shine through with exclamations and reactions.`;
        case 'expressive': return `EXPRESSIVE: Show clear emotions - enthusiasm when excited, genuine curiosity, playful teasing, surprised reactions. Don't be monotone.`;
        case 'natural': return `NATURAL EMOTIONS: Express emotions as they naturally arise - interest, mild surprise, agreement/disagreement. Avoid being flat but don't overact.`;
        default: return `SUBDUED: Keep emotions understated and professional.`;
      }
    };
    
    const getInterruptionInstructions = () => {
      switch (interruptionFrequency) {
        case 'frequent': return `FREQUENT INTERRUPTIONS: Speakers should interrupt each other naturally - finishing sentences, jumping in with reactions ("Wait, really?"), overlapping enthusiasm. This creates energy and chemistry.`;
        case 'occasional': return `OCCASIONAL INTERRUPTIONS: Sometimes speakers interrupt with reactions or to build on a point. Not constant but enough to feel dynamic.`;
        default: return `NO INTERRUPTIONS: Let each speaker finish their thought completely.`;
      }
    };

    // Extract narrative control settings from preset
    const informationDensity = preset.informationDensity || 'moderate';
    const pacing = preset.pacing || 'measured';
    const speakerBalance = preset.speakerBalance || 'equal';
    const humorLevel = preset.humorLevel || 'light';
    const tangentAllowance = preset.tangentAllowance || 'moderate';
    const technicalDepth = preset.technicalDepth || 'accessible';
    const debateIntensity = preset.debateIntensity || 'mild-challenge';

    const getInformationDensityInstructions = () => {
      switch (informationDensity) {
        case 'maximum': return `MAXIMUM DENSITY: Every sentence must carry new information. No filler, no padding, no restating. Cut all banter that doesn't advance understanding. This is a briefing, not a chat.`;
        case 'dense': return `HIGH DENSITY: Pack information tightly. Minimize small talk and reactions. When speakers react, they should add new context or a new angle, not just agree.`;
        case 'moderate': return `BALANCED DENSITY: Mix substantive information with natural conversation. Some banter is fine but every 2-3 turns should introduce a new fact, insight, or perspective.`;
        default: return `LIGHT DENSITY: Prioritize conversational flow over information. Let speakers react, riff, and explore feelings. Facts are springboards for discussion, not the main event.`;
      }
    };

    const getPacingInstructions = () => {
      switch (pacing) {
        case 'rapid-fire': return `RAPID-FIRE PACING: Short turns (10-30 words typical). Quick exchanges. Move through topics fast. No lingering. Energy stays high throughout.`;
        case 'dynamic': return `DYNAMIC PACING: Vary the tempo. Quick exchanges for exciting moments, longer turns for deep insights. Build momentum toward key revelations, then let the energy settle before the next build.`;
        case 'measured': return `MEASURED PACING: Steady, comfortable rhythm. Give each point enough space to land. Not rushed, not slow. Like a well-paced documentary.`;
        default: return `SLOW & REFLECTIVE: Let ideas breathe. Include thinking pauses (ellipsis). Speakers take time to process and reflect. Silence is okay. "Hmm... you know, the more I think about that..." Quality over speed.`;
      }
    };

    const getSpeakerBalanceInstructions = () => {
      switch (speakerBalance) {
        case 'host-led': return `HOST-LED: The host drives the conversation — sets topics, asks questions, steers direction. The other speaker responds, elaborates, and provides expertise. Host speaks ~60% of the time.`;
        case 'expert-led': return `EXPERT-LED: The expert/knowledgeable speaker does most of the heavy lifting — explaining, teaching, sharing insights. The other speaker reacts, asks clarifying questions, and represents the audience. Expert speaks ~60%.`;
        case 'interviewer-guest': return `INTERVIEWER-GUEST: Clear Q&A dynamic. Interviewer asks focused questions, guest gives substantive answers. Interviewer may push back or ask follow-ups but doesn't lecture. Guest speaks ~70%.`;
        default: return `EQUAL BALANCE: Both speakers contribute roughly equally. They build ideas together, take turns leading, and neither dominates.`;
      }
    };

    const getHumorInstructions = () => {
      switch (humorLevel) {
        case 'frequent': return `COMEDY-FORWARD: Humor is a primary tool. Jokes, witty observations, playful teasing, funny analogies. Speakers should make each other (and the audience) laugh regularly. Don't sacrifice accuracy for laughs, but lean into the funny.`;
        case 'light': return `LIGHT HUMOR: Occasional jokes, playful moments, and amusing observations. Humor should feel natural, not forced. A chuckle every few minutes keeps things engaging.`;
        case 'dry-wit': return `DRY WIT: Subtle, clever humor. Understated observations, ironic comments, wry asides. Never slapstick. Think "that's... actually kind of terrifying when you put it that way."`;
        default: return `NO HUMOR: Keep the tone serious and focused throughout. This is not the place for jokes or levity.`;
      }
    };

    const getTangentInstructions = () => {
      switch (tangentAllowance) {
        case 'exploratory': return `EXPLORATORY: Follow curiosity wherever it leads. Tangents are welcome — they often lead to the most interesting insights. "Oh, that reminds me of something completely different but bear with me..." The conversation should feel like a journey of discovery.`;
        case 'moderate': return `MODERATE TANGENTS: Natural digressions are fine if they add color or connect back to the main thread within a few turns. "Quick aside — this relates to..." then circle back.`;
        case 'minimal': return `MINIMAL TANGENTS: Stay focused. Brief asides are okay (1-2 turns max) but always circle back quickly. Don't let the conversation drift.`;
        default: return `STRICT FOCUS: Stay on topic at all times. No tangents, no asides, no digressions. Every turn must directly advance the main discussion.`;
      }
    };

    const getTechnicalDepthInstructions = () => {
      switch (technicalDepth) {
        case 'expert': return `EXPERT DEPTH: Assume the audience has deep domain knowledge. Use technical terminology freely. Discuss implementation details, edge cases, trade-offs, and nuances. No hand-holding or basic explanations.`;
        case 'detailed': return `DETAILED: Go into specifics. Use some technical terms but briefly contextualize them. Discuss mechanisms, processes, and "how it works" — not just "what it does."`;
        case 'accessible': return `ACCESSIBLE: Explain jargon when it appears. Use analogies and metaphors to make complex ideas intuitive. "Think of it like..." The audience is smart but not specialists.`;
        default: return `SURFACE LEVEL: High-level overview only. No jargon. Focus on the "so what?" and big-picture implications rather than technical details.`;
      }
    };

    const getDebateIntensityInstructions = () => {
      switch (debateIntensity) {
        case 'adversarial': return `ADVERSARIAL: Speakers have genuinely opposing views and defend them vigorously. Challenge each other's evidence. "I fundamentally disagree because..." Steel-man the other side, then dismantle it. Heated but respectful.`;
        case 'balanced-debate': return `BALANCED DEBATE: Real disagreements exist and are explored. Speakers push back on each other's points with evidence. "I see your point, but the data actually shows..." Both sides get fair representation.`;
        case 'mild-challenge': return `MILD CHALLENGE: Mostly agreement but with occasional pushback. "That's interesting, but what about..." / "I'm not sure I'd go that far..." Keeps the conversation from being a mutual admiration society.`;
        default: return `AGREEABLE: Speakers build on each other's ideas supportively. Minimal disagreement. They're exploring the topic together as allies, not opponents.`;
      }
    };

    // Build the combined narrative control block for prompts
    const getNarrativeControlBlock = () => `
🎛️ NARRATIVE CONTROL SETTINGS:
${getInformationDensityInstructions()}
${getPacingInstructions()}
${getSpeakerBalanceInstructions()}
${getTechnicalDepthInstructions()}
${getDebateIntensityInstructions()}
${getHumorInstructions()}
${getTangentInstructions()}`;

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 1: PRODUCER - Strategic Analysis & Episode Structure
    // ═══════════════════════════════════════════════════════════════════════════
    job.status = 'processing';
    job.currentStage = 'producer';
    job.progress = 5;
    const stage1Model = getModelForStage(1);
    job.message = `🎬 Stage 1/5: Producer analyzing sources (${stage1Model})...`;
    jobs.set(jobId, { ...job });

    // Determine context limits based on model - Gemini has 1M tokens, Qwen3 has 32K
    const getContextLimit = (model: string): number => {
      if (model.includes('gemini')) return 500000; // ~125K tokens, safe for Gemini's 1M
      return 100000; // ~25K tokens, safe for Qwen3's 32K
    };

    const podcastTone = preset.tone || 'conversational';
    const targetRegion = preset.targetRegion || 'us-central'; // Default: US Central (Texas) for Mexican-American audience
    
    // Resolve podcast style profile — drives rich per-stage prompt guidance
    const styleProfile: StyleProfile = getStyleProfile(
      preset.podcastStyle || inferStyleFromPreset(preset)
    );
    console.log(`🎨 Podcast style: ${styleProfile.id} (${styleProfile.label})`);
    console.log(`   ${styleProfile.references}`);
    
    // Currency conversion guidance based on target region
    const getCurrencyGuidance = () => {
      switch (targetRegion) {
        case 'us-central':
        case 'us-west':
        case 'us-east':
          return `- MONEDA: Convierte TODAS las cantidades monetarias a DÓLARES ESTADOUNIDENSES (USD).\n  - Si el material menciona dirhams, euros, pesos, etc., conviértelos a dólares.\n  - Ejemplo: "500 dirhams" → "aproximadamente 135 dólares"\n  - La audiencia está en Estados Unidos y piensa en dólares.`;
        case 'mexico':
          return `- MONEDA: Convierte TODAS las cantidades monetarias a PESOS MEXICANOS (MXN).\n  - Si el material menciona dirhams, euros, dólares, etc., conviértelos a pesos.\n  - Ejemplo: "100 dólares" → "aproximadamente 1,700 pesos"`;
        case 'spain':
          return `- MONEDA: Convierte TODAS las cantidades monetarias a EUROS (EUR).`;
        default:
          return `- MONEDA: Usa dólares estadounidenses (USD) como moneda de referencia.`;
      }
    };
    
    const producerLanguageInstruction = isSpanish
      ? `\n🌐 IDIOMA: ESPAÑOL MEXICANO\nIMPORTANTE: Todo el contenido debe estar en ESPAÑOL MEXICANO (NO español de España).\n- Evita expresiones ibéricas: "vosotros", "vale", "tío", "mola", "ostras", "guay", "flipar".\n- Usa "ustedes" en lugar de "vosotros".\n${getCurrencyGuidance()}\n- TONO DEL PODCAST: ${podcastTone.toUpperCase()}. Adapta el registro lingüístico al tono indicado (formal, técnico, sofisticado, casual, etc.).\n- REGIÓN OBJETIVO: ${targetRegion === 'us-central' ? 'Mexicano-americanos en Texas/EE.UU.' : targetRegion}\n`
      : `\n🌐 LANGUAGE: ENGLISH\nWrite all content in English.\n- CURRENCY: Use US dollars (USD) for all monetary amounts.\n`;

    const producerPrompt = `You are an experienced podcast PRODUCER known for creating compelling, engaging episodes that audiences love. Your job is to craft a narrative structure that will captivate listeners.
${producerLanguageInstruction}
SOURCE MATERIALS:
${sourceContext.substring(0, getContextLimit(stage1Model))}

PODCAST CONFIGURATION:
- Format: ${preset.podcastFormat || 'roundtable'}
- Duration: ${targetDuration} minutes (~${targetWordCount} words)
- Language: ${language.toUpperCase()}
- Tone: ${preset.tone || 'conversational'}
- Audience: ${preset.audience || 'general'}
- Style: ${preset.style || 'co-host'}
${preset.emphasis ? `\n🎯 SPECIAL FOCUS (CRITICAL - MUST INCLUDE):\n"${preset.emphasis}"\nThis is a MANDATORY request from the user. You MUST incorporate this focus into the podcast narrative. If it mentions specific people, shout-outs, or dedications, these MUST appear prominently in the script.\n` : ''}
PARTICIPANTS (give them chemistry!):
${participantDescriptions}

═══════════════════════════════════════════════════════════════════════════
🎬 YOUR TASK: Create a COMPELLING NARRATIVE episode structure
═══════════════════════════════════════════════════════════════════════════

Think like a STORYTELLER, not a lecturer. The best podcasts tell a STORY — they don't just cover topics.
Your brief must set up a conversation that has:
- A NARRATIVE THREAD that pulls listeners through from start to finish
- REFLECTIVE MOMENTS where hosts think out loud and process what they're learning
- PERSONAL CONNECTIONS where hosts relate the topic to their own lives and feelings
- CALLBACKS where later insights connect back to earlier points
- EMOTIONAL DEPTH — not just information, but how it makes the hosts FEEL

0. **CONTENT PERSPECTIVE** - CRITICAL: Analyze the source material's intent and temporal framing:
   - Is this about FUTURE plans/goals? (e.g., planning a trip, launching a product, upcoming events)
   - Is this a RETROSPECTIVE account? (e.g., reviewing what happened, analyzing past events)
   - Is this ANALYTICAL/EDUCATIONAL? (e.g., explaining concepts, comparing options, teaching)
   - Is this ONGOING/CURRENT? (e.g., current trends, live situations, developing stories)
   The hosts MUST speak from the SAME temporal perspective as the source material.
   If the source is about planning a future vacation → hosts discuss it as a FUTURE plan, NOT as if they already went.
   If the source is a review of past events → hosts discuss what happened.

1. **THE HOOK** - What's the surprising/intriguing angle that will grab listeners in the first 30 seconds?
   Not just a topic introduction — an EMOTIONAL hook that makes listeners care immediately.

2. **THE CENTRAL QUESTION** - What's the ONE big question this episode is really about?
   Every topic should connect back to this central thread. This prevents topic-checklist syndrome.

3. **THE JOURNEY** - What's the narrative arc? How do we build from curiosity to understanding to insight?
   Plan the FLOW so each topic naturally leads to the next, not a list of disconnected segments.

4. **KEY DISCOVERIES** - What are the 3-4 "aha moments" we want listeners to experience?
   For each one, plan: the BUILDUP (how we create anticipation), the REVEAL, and the REFLECTION (how hosts process it).

5. **REFLECTION MOMENTS** - Where should hosts pause to think out loud?
   Plan 3-5 moments where a host says something like "You know what really gets me about this..." or "The more I think about it..." These are CRITICAL for making the podcast feel human, not robotic.

6. **PERSONAL STAKES** - How does this topic affect the hosts personally?
   Plan moments where hosts connect the material to their own lives, fears, hopes, or experiences.
   "This actually worries me because..." / "I keep thinking about how this changes..."

7. **TENSION POINTS** - Where can we create anticipation or friendly debate?

8. **PERSONALITY MOMENTS** - Where can the hosts show chemistry, disagree playfully, or share genuine reactions?

9. **THE PAYOFF** - How does the ending RESOLVE the central question with new understanding?
   The ending should circle back to the hook/central question and show how the hosts' thinking has evolved.

⚠️ CRITICAL: The writer will follow your brief closely. If you plan a topic-checklist, you'll get a topic-checklist podcast. If you plan a STORY with reflections and personal connections, you'll get a compelling narrative podcast. Plan accordingly.

OUTPUT AS JSON:
{
  "contentPerspective": {
    "temporalFrame": "future-planning | retrospective | analytical | ongoing",
    "tenseGuidance": "Describe how hosts should frame the discussion",
    "speakerStance": "What is the hosts' relationship to the content?"
  },
  "episodeTitle": "Compelling title that creates curiosity",
  "centralQuestion": "The ONE big question this episode explores",
  "hook": "The emotional/surprising angle that opens the episode",
  "narrativeArc": {
    "setup": "How we introduce the topic and create emotional investment",
    "exploration": "The journey of discovery — how topics FLOW into each other",
    "climax": "The key insight or revelation that changes how hosts see the topic",
    "resolution": "How we wrap up — circling back to the central question"
  },
  "emotionalArc": {
    "description": "EMOTIONAL SCORE based on podcast format/tone. Select the appropriate template.",
    "selectTemplate": "Choose based on format: narrative-adventure | professional-academic | educational-explainer | interview-discussion | news-briefing",
    "templates": {
      "narrative-adventure": {
        "description": "For storytelling, travel, entertainment - dramatic arc with emotional peaks",
        "phases": [
          {"phase": "opening", "percent": "0-10%", "baseline": "warm-curious", "allowed": ["warm", "curious", "intrigued", "friendly"], "avoid": ["excited", "serious"]},
          {"phase": "exploration", "percent": "10-40%", "baseline": "engaged-building", "allowed": ["curious", "thoughtful", "interested", "warm", "amused"], "avoid": ["excited", "surprised"]},
          {"phase": "rising-action", "percent": "40-70%", "baseline": "intensifying", "allowed": ["intrigued", "surprised", "energized", "curious"], "avoid": ["calm", "neutral"]},
          {"phase": "climax", "percent": "70-85%", "baseline": "peak-intensity", "allowed": ["excited", "surprised", "amazed", "passionate"], "avoid": ["neutral", "calm"]},
          {"phase": "resolution", "percent": "85-100%", "baseline": "settling-reflective", "allowed": ["thoughtful", "warm", "satisfied", "reflective"], "avoid": ["excited", "surprised"]}
        ]
      },
      "professional-academic": {
        "description": "For medical reviews, research, technical analysis - measured and authoritative throughout",
        "phases": [
          {"phase": "introduction", "percent": "0-15%", "baseline": "professional-warm", "allowed": ["professional", "warm", "clear", "focused"], "avoid": ["excited", "casual", "playful"]},
          {"phase": "methodology", "percent": "15-35%", "baseline": "precise-measured", "allowed": ["thoughtful", "precise", "analytical", "clear"], "avoid": ["excited", "surprised", "casual"]},
          {"phase": "findings", "percent": "35-70%", "baseline": "engaged-authoritative", "allowed": ["interested", "thoughtful", "analytical", "measured", "intrigued"], "avoid": ["excited", "amazed", "casual"]},
          {"phase": "implications", "percent": "70-85%", "baseline": "considered-emphasis", "allowed": ["thoughtful", "emphatic", "concerned", "hopeful"], "avoid": ["excited", "amazed", "playful"]},
          {"phase": "conclusion", "percent": "85-100%", "baseline": "professional-warm", "allowed": ["professional", "warm", "satisfied", "thoughtful"], "avoid": ["excited", "surprised"]}
        ]
      },
      "educational-explainer": {
        "description": "For tutorials, how-tos, concept explanations - steady engagement with clarity moments",
        "phases": [
          {"phase": "hook", "percent": "0-10%", "baseline": "curious-inviting", "allowed": ["curious", "warm", "friendly", "intrigued"], "avoid": ["serious", "concerned"]},
          {"phase": "foundation", "percent": "10-35%", "baseline": "clear-patient", "allowed": ["clear", "warm", "thoughtful", "encouraging"], "avoid": ["excited", "rushed"]},
          {"phase": "deep-dive", "percent": "35-70%", "baseline": "engaged-focused", "allowed": ["interested", "thoughtful", "curious", "clear"], "avoid": ["bored", "rushed"]},
          {"phase": "aha-moment", "percent": "70-85%", "baseline": "illuminating", "allowed": ["satisfied", "warm", "clear", "encouraging"], "avoid": ["confused", "concerned"]},
          {"phase": "wrap-up", "percent": "85-100%", "baseline": "warm-encouraging", "allowed": ["warm", "satisfied", "encouraging", "friendly"], "avoid": ["rushed", "concerned"]}
        ]
      },
      "interview-discussion": {
        "description": "For interviews, debates, panel discussions - responsive and dynamic",
        "phases": [
          {"phase": "welcome", "percent": "0-10%", "baseline": "warm-professional", "allowed": ["warm", "friendly", "professional", "curious"], "avoid": ["confrontational"]},
          {"phase": "rapport", "percent": "10-25%", "baseline": "engaged-curious", "allowed": ["curious", "interested", "warm", "amused"], "avoid": ["aggressive", "bored"]},
          {"phase": "substance", "percent": "25-75%", "baseline": "dynamic-responsive", "allowed": ["curious", "thoughtful", "intrigued", "surprised", "amused"], "avoid": ["monotone", "disengaged"]},
          {"phase": "key-insights", "percent": "75-90%", "baseline": "focused-impactful", "allowed": ["thoughtful", "emphatic", "intrigued", "satisfied"], "avoid": ["casual", "distracted"]},
          {"phase": "closing", "percent": "90-100%", "baseline": "warm-grateful", "allowed": ["warm", "satisfied", "grateful", "friendly"], "avoid": ["rushed", "cold"]}
        ]
      },
      "news-briefing": {
        "description": "For news, updates, briefings - consistent professional delivery",
        "phases": [
          {"phase": "headlines", "percent": "0-15%", "baseline": "clear-authoritative", "allowed": ["clear", "professional", "focused"], "avoid": ["casual", "playful"]},
          {"phase": "details", "percent": "15-75%", "baseline": "measured-informative", "allowed": ["clear", "measured", "thoughtful", "concerned"], "avoid": ["excited", "playful"]},
          {"phase": "analysis", "percent": "75-90%", "baseline": "thoughtful-balanced", "allowed": ["thoughtful", "analytical", "measured"], "avoid": ["biased", "emotional"]},
          {"phase": "summary", "percent": "90-100%", "baseline": "professional-clear", "allowed": ["clear", "professional", "warm"], "avoid": ["casual", "rushed"]}
        ]
      }
    }
  },
  "keyDiscoveries": [
    {"insight": "What listeners will learn", "buildup": "How we create anticipation", "reaction": "How hosts react emotionally", "reflection": "How hosts process this"}
  ],
  "reflectionMoments": ["Planned moments where hosts think out loud"],
  "personalConnections": ["Moments where hosts relate the topic to their own lives"],
  "tensionPoints": ["Moments where we can build anticipation or friendly debate"],
  "personalityMoments": ["Opportunities for humor, disagreement, or genuine reactions"],
  "callbacks": ["Points where later insights should reference earlier discussion"],
  "dataHighlights": ["Specific facts/numbers from source that support the narrative"]
}`;

    const producerMaxTokens = 3500 + getThinkingOverhead(stage1Model);
    const producerOutput = await callModel(stage1Model, producerPrompt, 0.7, producerMaxTokens);
    job.stageOutputs!.producer = producerOutput;
    job.progress = 20;
    jobs.set(jobId, { ...job });

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2: WRITER - Full Script Generation
    // ═══════════════════════════════════════════════════════════════════════════
    job.currentStage = 'writer';
    job.progress = 25;
    const stage2Model = getModelForStage(2);
    job.message = `✍️ Stage 2/5: Writer crafting dialogue (${stage2Model})...`;
    jobs.set(jobId, { ...job });

    // Calculate minimum turns based on target duration (approx 30 words per turn, 150 words per minute)
    const minTurns = Math.round(targetWordCount / 30);
    const lengthLabel = preset.length === 'executive' ? 'BRIEF (5 min)' : 
                        preset.length === 'essential' ? 'STANDARD (10 min)' :
                        preset.length === 'comprehensive' ? 'COMPREHENSIVE (20 min)' :
                        preset.length === 'deep-dive' ? 'DEEP-DIVE (30 min)' : 'STANDARD';

    const languageInstructions = isSpanish 
      ? `🌐 IDIOMA: ESPAÑOL MEXICANO (NO ESPAÑOL DE ESPAÑA)
IMPORTANTE: Todo el diálogo debe estar completamente en ESPAÑOL MEXICANO.
- NO USES expresiones de España: "vale", "tío/tía", "mola", "guay", "vosotros", "coger" (usa "tomar" o "agarrar"), "ostras", "flipar".
- Usa "ustedes" en lugar de "vosotros".
${getCurrencyGuidance()}
- TONO: ${podcastTone.toUpperCase()}. El registro lingüístico debe coincidir con este tono:
  * Si es FORMAL/SOFISTICADO: usa vocabulario culto, evita coloquialismos excesivos.
  * Si es TÉCNICO: usa terminología especializada apropiada al tema.
  * Si es CONVERSACIONAL/CASUAL: usa expresiones mexicanas naturales ("órale", "ándale", "padre", "chido", "qué onda").
- Los hablantes deben sonar como mexicanos nativos con el registro apropiado al tono.
- REGIÓN OBJETIVO: ${targetRegion === 'us-central' ? 'Mexicano-americanos en Texas/EE.UU.' : targetRegion}`
      : `🌐 LANGUAGE: ENGLISH
Write the entire dialogue in natural English matching the ${podcastTone} tone.
- CURRENCY: Use US dollars (USD) for all monetary amounts.`;

    const writerPrompt = `You are an award-winning podcast SCRIPT WRITER known for creating engaging, natural conversations that audiences love. Your scripts feel like eavesdropping on two fascinating friends having a genuine discussion.

⚠️⚠️⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️⚠️⚠️
${languageInstructions}
${isSpanish ? 'CADA LÍNEA de diálogo DEBE estar en español. NO escribas en inglés bajo ninguna circunstancia.' : ''}

PRODUCER'S BRIEF:
${JSON.stringify(producerOutput, null, 2)}

SOURCE MATERIALS:
${sourceContext.substring(0, getContextLimit(stage2Model))}

⚠️⚠️⚠️ CRITICAL: CONTENT PERSPECTIVE & TENSE ⚠️⚠️⚠️
The producer's brief includes a "contentPerspective" field. You MUST follow it strictly:
- If temporalFrame is "future-planning": Hosts are discussing plans, possibilities, and what they WILL do or COULD do. Use future tense and conditional. They have NOT done this yet. Say "we should try..." / "imagine when we get there..." / "I've been looking at..." — NOT "we went..." / "it was amazing..."
- If temporalFrame is "retrospective": Hosts are recounting past experiences. Use past tense naturally.
- If temporalFrame is "analytical": Hosts are analyzing/explaining concepts. Use present tense for facts and analysis.
- If temporalFrame is "ongoing": Hosts discuss current events/trends in present tense.
GETTING THE TENSE WRONG WILL RUIN THE EPISODE. If the source is about planning a trip, the hosts must sound like they're PLANNING, not RECOUNTING.

THE SPEAKERS - Give them distinct voices and chemistry:
${participantDescriptions}

SPEAKER NAMES: ${speakerNames}
${preset.emphasis ? `\n🎯 SPECIAL FOCUS (CRITICAL - MUST INCLUDE IN SCRIPT):\n"${preset.emphasis}"\nThis is a MANDATORY request from the user. You MUST incorporate this focus prominently into the script dialogue. If it mentions specific people (e.g., "shout out to Luca & Sofia"), one of the hosts MUST mention them BY NAME in the script. If it's a dedication, include it naturally in the conversation.\n` : ''}

⚠️ CRITICAL: USE CORRECT PRONOUNS
When speakers refer to each other, use the correct pronouns based on their gender:
${namedParticipants.map((p: any) => `- ${p.name}: Use ${p.gender === 'female' ? 'she/her/hers' : p.gender === 'male' ? 'he/him/his' : 'they/them/theirs'}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════
📏 LENGTH: ${lengthLabel} | ${targetDuration} MINUTES | ~${targetWordCount} WORDS | ${minTurns}+ TURNS
═══════════════════════════════════════════════════════════════════════════

🎭 CONVERSATIONAL STYLE SETTINGS:
${getDisfluencyInstructions()}
${getEmotionalInstructions()}
${getInterruptionInstructions()}
${getNarrativeControlBlock()}

═══════════════════════════════════════════════════════════════════════════
🎨 PODCAST STYLE: ${styleProfile.label.toUpperCase()} (${styleProfile.references})
═══════════════════════════════════════════════════════════════════════════
${styleProfile.writerGuidance}
${getChildrenOverlay(preset.audience, 'writer')}

═══════════════════════════════════════════════════════════════════════════
🔥 NARRATIVE PODCAST STYLE — STUDY THE EXAMPLES BELOW CAREFULLY
═══════════════════════════════════════════════════════════════════════════

Your script must sound like two smart, opinionated people having a REAL conversation — not a rehearsed presentation. The difference between a great podcast and a bad one is whether the hosts are THINKING or PERFORMING.

**1. BOTH SPEAKERS MUST CONTRIBUTE INFORMATION (Critical — #1 failure mode):**
- BOTH hosts bring facts, ideas, and perspectives to the table. One host is NOT a hype machine.
- If Speaker A shares a fact, Speaker B should respond with THEIR OWN related fact, a counterpoint, or a deeper angle — not just "¡Órale!" or "¡No me digas!"
- Each speaker should introduce roughly 40-50% of the substantive content

❌ BAD (one host is just a reaction machine):
  A: "The rental car costs 88 dollars a day."
  B: "¡¿Qué?! ¡Ochenta y ocho dólares! ¡No lo puedo creer! ¡Eso es increíble!"
  A: "And there's a restaurant with a play area."
  B: "¡No! ¿En serio? ¡Eso no existe! ¡Me estás bromeando!"

✅ GOOD (both hosts contribute and think):
  A: "I was looking at rental cars and a 7-seater comes out to about 88 a day."
  B: "That's way less than I expected. But here's what I'm thinking — it's not just the money. With three kids you need a mobile base camp. Stroller in the trunk, snacks, change of clothes... You can't do that with ride-shares."
  A: "Exactly. And that connects to something else — the distances between attractions are bigger than you'd think..."

**2. GROUNDED NARRATIVE ARC — Not a listicle:**
- The conversation must have a THESIS that develops, not a list of topics covered sequentially
- Don't organize by category (transport → food → activities). Organize by INSIGHT: start with a misconception, challenge it through evidence, arrive at a new understanding
- The listener should feel the hosts' understanding EVOLVING across the episode
- Each section should raise a question that the NEXT section answers

❌ BAD (listicle structure): "First let's talk about transport. Now food. Now activities. Now budget."
✅ GOOD (thesis-driven): "Everyone thinks X. But when you look at Y, you realize Z. And that changes how you think about the whole trip."

**3. GENUINE DISAGREEMENT & TENSION:**
- Hosts should DISAGREE on at least 2-3 points — not just play devil's advocate for one turn
- Real disagreements: different priorities, different risk tolerances, different values
- One host might be wrong about something and get corrected with evidence
- Some debates should NOT be fully resolved — "I still think you're wrong about that, but let's move on"
- Tension creates engagement. Two people agreeing on everything is boring.

**4. EARNED INSIGHTS — Not announced ones:**
- Never have a speaker SAY they're having a revelation. Let the listener HEAR it happen.

❌ BAD: "Oye... creo que estoy teniendo una revelación. Un 'ajá moment'."
✅ GOOD: "Wait... so if the restaurants have play areas, and the malls have aquariums, and even the desert tours have family packages... this isn't a city that tolerates kids. It was BUILT for families. That's... completely different from what I assumed."

The insight emerges from accumulated evidence, not from a speaker announcing "I'm having an epiphany."

**5. REFLECTIONS THAT GO SOMEWHERE:**
- When a host reflects, it should ADVANCE the conversation, not just restate what was said
- Connect the current topic to something unexpected: personal experience, a broader trend, a worry, a contradiction
- "You know what bothers me about this? It sounds perfect, but what about..." is better than "Wow, that's amazing!"

**6. NATURAL REGISTER & VOCABULARY:**
- Avoid performative exclamations: ¡No me digas! / ¡Órale! / ¡Increíble! should appear SPARINGLY (max 3-4 times in the whole script), not every other turn
- Use the full range of conversational language: understatement, sarcasm, dry humor, skepticism, genuine confusion
- Hosts should sometimes struggle to articulate a thought: "It's like... how do I put this... it's not that it's cheap, it's that the value proposition is completely different from what you'd expect"
- Include mundane connectors that real people use: "anyway", "so the thing is", "but here's my point", "look"

**7. VARIED RHYTHM & TEXTURE:**
- Mix quick reactions (5-15 words) with deep explorations (60-100 words)
- Some turns are just: "Hmm." / "I don't know about that." / "That's fair."
- Some turns are extended reflections where a speaker really digs into an idea
- Include moments where someone TRAILS OFF: "And then you start thinking about... well, you know."
- After a dense section, have a lighter moment: humor, a personal aside, gentle teasing
- NOT every turn needs to be energetic. Some turns should be quiet, uncertain, or contemplative.

**8. STORYTELLING & EXAMPLES:**
${includeStories ? '- Weave in relevant anecdotes, hypothetical scenarios, and "imagine this" moments from the source material' : '- Focus on facts and analysis rather than stories'}
${includeExamples ? '- Use vivid, concrete examples that make abstract points feel real and tangible' : '- Keep discussion at the conceptual level'}
- Paint pictures with words: "Picture this..." / "So there you are, standing in the airport with three kids and..."
- Use specific details from the source to make the story come alive

**9. NATURAL CONVERSATION FLOW:**
- Start with a hook that creates immediate emotional investment
- Build tension/curiosity before revealing key insights
- Have moments of levity between dense information
- End segments with forward momentum — but NOT always "here's where it gets interesting." Vary your transitions.
- The ending should feel like a RESOLUTION, not just stopping — circle back to the opening theme with new understanding

═══════════════════════════════════════════════════════════════════════════
⚠️ TTS FORMATTING (Dual-Engine: Qwen3-TTS + Gemini TTS):
═══════════════════════════════════════════════════════════════════════════
- You MAY use these 6 Gemini expression tags sparingly: [laughing], [whispering], [sighing], [shouting], [speaking slowly], [clears throat]
  (These enhance Gemini TTS and are automatically stripped for Qwen TTS)
- NEVER use [pause], [beat], [chuckles], [gasps], *asterisks*, or (stage directions) — unsupported tags are read literally
- For pauses: use punctuation — ellipsis (...), em dash (—), comma, period
- For emphasis: use sentence structure — "It's not just big. It's massive." or repetition
- For emotion: use natural interjections — "Oh!", "Hmm...", "Wait, what?!", "Ha!"
- For hesitation: use disfluencies — "I mean...", "Well...", "It's— it's incredible"

═══════════════════════════════════════════════════════════════════════════
❌ PODCAST KILLERS — If your script has ANY of these, it will be REJECTED:
═══════════════════════════════════════════════════════════════════════════
- ❌ HYPE-MACHINE CO-HOST: One speaker only reacts with shock/excitement while the other delivers all the information. BOTH speakers must contribute facts and ideas.
- ❌ PERFORMATIVE SURPRISE: "¡No! ¿En serio?" / "¡No lo puedo creer!" / "¡Me estás bromeando!" / "¡Eso no existe!" — Real people don't gasp at every data point. Reserve genuine surprise for 1-2 truly surprising moments.
- ❌ Q&A PING-PONG: One speaker asks, the other answers, repeat. Speakers must BUILD ideas together.
- ❌ TOPIC CHECKLIST / LISTICLE: Covering topics sequentially (transport, then food, then activities, then budget) without a unifying thesis or narrative thread.
- ❌ ANNOUNCED INSIGHTS: "Creo que estoy teniendo una revelación" / "This is my aha moment" — Let insights EMERGE from evidence, don't announce them.
- ❌ EMPTY AFFIRMATIONS: "¡Exacto!" / "Totalmente" / "¡Lo dijiste perfecto!" / "That's a great point!" — these add nothing. If you agree, ADD something new.
- ❌ ZERO DISAGREEMENT: Two speakers who agree on everything. Include real friction on at least 2-3 points.
- ❌ RESTATING THE SAME POINT: Saying the same insight in different words across multiple turns.
- ❌ EXCLAMATION OVERLOAD: More than 3-4 exclamatory reactions (¡Órale! / ¡Qué emoción! / ¡Increíble!) in the entire script. Use understatement, skepticism, and dry humor instead.
- ❌ PADDING CONCLUSIONS: "And that's the key" / "That's what it's all about" — move forward instead.
- ❌ UNIFORM TURN LENGTHS: Every turn being roughly the same length.
- ❌ NO CALLBACKS: Never referencing earlier points or building on previous insights.
- ❌ SUMMARIZING WHAT WAS JUST SAID: Don't have Speaker B restate what Speaker A just explained.
- ❌ TRANSITION CRUTCHES: Overusing "But here's where it gets interesting..." / "Prepárate porque..." / "And that brings us to..." — Vary your transitions.

═══════════════════════════════════════════════════════════════════════════

⚠️⚠️⚠️ MANDATORY LENGTH REQUIREMENT ⚠️⚠️⚠️
Your script MUST be AT LEAST ${minTurns} turns and approximately ${targetWordCount} words.
This is a ${targetDuration}-MINUTE podcast. At 150 words per minute, you need ~${targetWordCount} words.
A script with fewer than ${Math.round(minTurns * 0.7)} turns will be REJECTED.
DO NOT stop writing early. Keep the conversation going through ALL the source material topics.
${isSpanish ? '⚠️ RECUERDA: TODO el diálogo DEBE estar en ESPAÑOL.' : ''}

OUTPUT AS JSON ARRAY - Create a ${targetDuration}-minute conversation with genuine chemistry:
[
  {"speaker": "${namedParticipants[0]?.name || 'Speaker 1'}", "content": "Hook that draws listeners in...", "emotion": "intrigued"},
  {"speaker": "${namedParticipants[1]?.name || 'Speaker 2'}", "content": "Building on that with genuine reaction...", "emotion": "excited"},
  ... continue for ${minTurns}+ turns covering ALL topics from the producer's brief ...
]

Write an ENGAGING ${targetDuration}-minute conversation (${minTurns}+ turns, ~${targetWordCount} words) that listeners will actually enjoy:`;

    // Scale max_tokens based on target duration (longer scripts need more tokens)
    // Each turn averages ~40 words = ~60 tokens (higher for Spanish). Add overhead for JSON structure.
    // Minimum 8192 tokens for any script, scale up aggressively for longer durations.
    // Add thinking token overhead for Gemini models (thinking tokens consume maxOutputTokens budget)
    const baseWriterTokens = Math.max(8192, Math.ceil(minTurns * 80) + 2000);
    const writerMaxTokens = baseWriterTokens + getThinkingOverhead(stage2Model);
    console.log(`📏 Script targets: ${targetDuration}min, ${targetWordCount} words, ${minTurns}+ turns, ${writerMaxTokens} max tokens`);
    const writerOutput = await callModel(stage2Model, writerPrompt, 0.85, writerMaxTokens);
    job.stageOutputs!.writer = writerOutput;
    job.progress = 50;
    jobs.set(jobId, { ...job });

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 3: DIRECTOR - Creative Review & Enhancement
    // ═══════════════════════════════════════════════════════════════════════════
    job.currentStage = 'director';
    job.progress = 55;
    const stage3Model = getModelForStage(3);
    job.message = `🎭 Stage 3/5: Director reviewing flow (${stage3Model})...`;
    jobs.set(jobId, { ...job });

    const directorLangInstruction = isSpanish
      ? `⚠️ IDIOMA: ESPAÑOL MEXICANO - Mantén TODO el diálogo en español mexicano. No uses expresiones de España (vale, tío, mola, vosotros). Usa vocabulario mexicano natural.\n`
      : '';

    const directorPrompt = `You are a podcast DIRECTOR and STORY EDITOR. Your job is to transform this script from an information exchange into a compelling NARRATIVE that listeners can't stop listening to.
${directorLangInstruction}
SCRIPT TO ENHANCE:
${JSON.stringify(writerOutput, null, 2)}

SOURCE MATERIALS (for reference):
${sourceContext.substring(0, getContextLimit(stage3Model))}

SPEAKERS: ${speakerNames}

⚠️ CRITICAL: VERIFY CORRECT PRONOUNS
Ensure speakers use correct pronouns when referring to each other:
${namedParticipants.map((p: any) => `- ${p.name}: Use ${p.gender === 'female' ? 'she/her/hers' : p.gender === 'male' ? 'he/him/his' : 'they/them/theirs'}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════
🎬 DIRECTOR'S STORY ENHANCEMENT — Transform information into narrative
═══════════════════════════════════════════════════════════════════════════

🎨 PODCAST STYLE: ${styleProfile.label.toUpperCase()} (${styleProfile.references})
${styleProfile.directorGuidance}
${getChildrenOverlay(preset.audience, 'director')}

Read the script carefully. Your PRIMARY job is to fix these common problems:

**1. FIX THE HYPE-MACHINE CO-HOST (Most critical fix):**
- Scan for the pattern: Speaker A delivers facts → Speaker B reacts with shock/excitement → repeat
- If one speaker is just gasping ("¡No me digas!" / "¡Increíble!" / "¡Eso no existe!"), REWRITE their turns so they CONTRIBUTE information, counterpoints, or deeper analysis
- BOTH speakers must introduce roughly equal amounts of substantive content
- Replace hollow exclamations with: the speaker's own research, a related personal experience, a skeptical question, or a different angle on the same topic

❌ BEFORE: A: "The car costs $88/day." B: "¡¿Qué?! ¡No lo puedo creer!"
✅ AFTER: A: "The car costs $88/day." B: "That's less than two Ubers. But honestly, what worries me more is parking — I've heard some malls charge extra and the spots are tight for a 7-seater."

**2. STRIP PERFORMATIVE SURPRISE:**
- Count exclamatory reactions (¡Órale! / ¡No manches! / ¡Increíble! / ¡Qué emoción!). If there are more than 3-4 in the ENTIRE script, remove the excess.
- Replace with: understatement ("Hmm, that's actually not bad"), skepticism ("I don't know, that sounds too good"), dry humor, or quiet processing ("Let me think about that for a second...")
- Real surprise is RARE. If everything is surprising, nothing is.

**3. BREAK LISTICLE STRUCTURE:**
- If the script covers topics sequentially (transport → food → activities → budget), RESTRUCTURE it
- Weave topics together: a conversation about restaurants should naturally lead to transport ("how do we even GET there with three kids?"), which connects to budget
- Add a THESIS that develops: "The assumption was X, but evidence shows Y, which means Z"
- Each section should raise a question that the NEXT section answers — not just change subjects

**4. ADD GENUINE DISAGREEMENT:**
- Find at least 2-3 places where speakers can genuinely disagree
- Not just "devil's advocate for one turn" — real friction based on different priorities or values
- Some disagreements should remain UNRESOLVED: "I still think you're underestimating that, but okay"
- One speaker being wrong and getting corrected is more interesting than both being right

**5. ADD REFLECTIONS THAT ADVANCE THE CONVERSATION:**
- After major points, one speaker should connect it to something UNEXPECTED — not just restate it
- "You know what bugs me about this?" is better than "That's amazing!"
- Include moments where a speaker CHANGES THEIR MIND with evidence
- Reflections should open NEW threads, not close existing ones

**6. PACING & RHYTHM:**
- Vary turn lengths dramatically: some 5-word reactions, some 80-word explorations
- NOT every turn needs energy. Include quiet, uncertain, or contemplative moments.
- After dense information, add a lighter moment: humor, gentle teasing, a personal aside
- Add breathing room with reflective pauses (ellipsis) after big insights

**7. TTS-SAFE CONTENT:**
- NEVER add [pause], [beat], [laughs], *asterisks*, or (stage directions) to content
- Use punctuation for pacing: ellipsis (...), em dash (—), commas, periods
- Use interjections for emotion: "Oh!", "Hmm...", "Wait—", "Ha!"
- Content must be speakable words only — our TTS reads markup literally

**8. NORMALIZE SPEAKER NAMES:** Use ONLY: ${speakerNames}

**9. FIX ANY PRONOUN ERRORS:**
- Check every reference to another speaker and ensure correct pronouns are used

OUTPUT AS JSON:
{
  "enhancements": {
    "narrativeFixes": ["Q&A patterns you broke and how you restructured them"],
    "reflectionsAdded": ["Moments of introspection or thinking-out-loud you added"],
    "callbacksCreated": ["Points where you connected earlier and later parts of the conversation"],
    "emotionalDepth": ["Personal connections or vulnerability you added"]
  },
  "revisedScript": [
    {"speaker": "${namedParticipants[0]?.name || 'Speaker 1'}", "content": "...", "emotion": "specific_emotion"},
    {"speaker": "${namedParticipants[1]?.name || 'Speaker 2'}", "content": "...", "emotion": "specific_emotion"}
  ]
}

Transform this into a conversation that tells a STORY, not just exchanges information:`;

    // Director rewrites the full script, needs at least as many tokens as the writer
    const directorMaxTokens = Math.max(baseWriterTokens, 8192) + getThinkingOverhead(stage3Model);
    const directorOutput = await callModel(stage3Model, directorPrompt, 0.7, directorMaxTokens);
    job.stageOutputs!.director = directorOutput;
    job.progress = 70;
    jobs.set(jobId, { ...job });

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 4: VOICE DIRECTOR - Performance Annotations
    // ═══════════════════════════════════════════════════════════════════════════
    job.currentStage = 'voice-director';
    job.progress = 75;
    const stage4Model = getModelForStage(4);
    job.message = `🎤 Stage 4/5: Voice Director adding performance notes (${stage4Model})...`;
    jobs.set(jobId, { ...job });

    const scriptForVoice = directorOutput?.revisedScript || writerOutput;
    
    const voiceLangInstruction = isSpanish
      ? `⚠️ IDIOMA: ESPAÑOL MEXICANO - Mantén TODO el diálogo en español mexicano. Usa interjecciones mexicanas (¡Órale!, ¡Ándale!, ¡Híjole!, ¡No manches!, etc.) en lugar de españolas.\n`
      : '';

    const voiceDirectorPrompt = `You are a VOICE DIRECTOR preparing a podcast script for neural text-to-speech synthesis. Your goal is to make the TTS sound like a real person, not a robot reading text.
${voiceLangInstruction}
SCRIPT:
${JSON.stringify(scriptForVoice, null, 2)}

═══════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: TTS FORMATTING RULES (Dual-Engine Compatible)
═══════════════════════════════════════════════════════════════════════════

This script may be synthesized by either Qwen3-TTS (local) or Gemini TTS (cloud).
Write content that sounds great on BOTH engines using these rules:

**PAUSES — Use punctuation (works on all engines):**
- Comma (,) → brief natural pause
- Period (.) → standard pause
- Ellipsis (...) → thoughtful hesitation or trailing off ("So I was thinking... maybe we should")
- Em dash (—) → abrupt break or interruption ("But the thing is— actually, wait")
- Semicolon (;) → moderate pause between related thoughts

**EMPHASIS — Use sentence structure, not formatting:**
- ❌ WRONG: "That's *really* important"
- ✅ RIGHT: "That's really, really important" (repetition)
- ✅ RIGHT: "And that? That is the key insight." (rhetorical structure)
- ✅ RIGHT: "It's not just important. It's essential." (short declarative sentences)

**EMOTION — Use natural interjections and exclamations:**
- Surprise: "Wait, what?!" / "No way!" / "¡No me digas!"
- Thinking: "Hmm..." / "Well..." / "A ver..."
- Excitement: "Oh!" / "Yes!" / "¡Órale!"
- Hesitation: "I mean..." / "Uh..." / "Es que..."
- Agreement: "Mm-hmm." / "Right, right." / "Sí, sí."
- Realization: "Oh! So that's why..." / "Ahhh, okay okay."

**NATURAL SPEECH DISFLUENCIES (sound great on all TTS):**
- Self-corrections: "It costs about... well, actually closer to two thousand"
- Filler words: "So, like, the thing is..." / "You know what I mean?"
- Stutters for excitement: "It's— it's absolutely incredible"
- Trailing thoughts: "And then there's the whole question of..."

**EXPRESSION TAGS — Dual-Engine Rules:**
You may OPTIONALLY use these 6 Gemini-supported expression tags (they enhance Gemini TTS and are automatically stripped for Qwen TTS):
  ✅ [laughing], [whispering], [sighing], [shouting], [speaking slowly], [clears throat]
Use them SPARINGLY — max 5-8 per script. They work best for genuine moments:
  - [laughing] before a chuckle: "[laughing] Ha, I can't believe that"
  - [whispering] for conspiratorial asides: "[whispering] And here's the part nobody talks about..."
  - [sighing] for exasperation: "[sighing] Look, I've been through this before..."
  - [speaking slowly] for emphasis: "[speaking slowly] This. Changes. Everything."

Do NOT use any OTHER bracketed tags. These are NOT supported and will be read literally:
- ❌ [pause], [beat], [chuckles], [gasps], [excited], [sad] — use punctuation and interjections instead
- ❌ *asterisks* or **bold** — TTS reads the asterisks
- ❌ (parenthetical directions) — TTS reads the parentheses
- ❌ ALL CAPS for emphasis — can cause unnatural pronunciation
- ❌ Emojis — TTS may try to read emoji names

═══════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════
🎨 PODCAST STYLE: ${styleProfile.label.toUpperCase()} — EMOTIONAL REGISTER
═══════════════════════════════════════════════════════════════════════════
${styleProfile.voiceDirectorGuidance}

STYLE-APPROPRIATE EMOTIONS: ${styleProfile.allowedEmotions.join(', ')}
EMOTIONS TO AVOID/MINIMIZE: ${styleProfile.avoidEmotions.join(', ')}
${getChildrenOverlay(preset.audience, 'voiceDirector')}

═══════════════════════════════════════════════════════════════════════════
🎭 NARRATIVE QUALITY CHECK (fix these if present):
═══════════════════════════════════════════════════════════════════════════
Before adding voice direction, scan the script for these problems and FIX them:
- If you see Q&A ping-pong (ask→answer→ask→answer), restructure so speakers build ideas together
- If speakers never reflect or think out loud, add moments of introspection: "You know what gets me about this..."
- If there are no callbacks to earlier points, add connections: "This ties back to what you said about..."
- If every turn starts with a question, rewrite some to start with reflections, reactions, or tangents

═══════════════════════════════════════════════════════════════════════════
🎼 EMOTIONAL ARC ORCHESTRATION (CRITICAL - READ THIS FIRST)
═══════════════════════════════════════════════════════════════════════════

The Producer has defined an EMOTIONAL ARC for this podcast. You MUST follow it.
Each turn's emotion should be determined by WHERE IT FALLS in the script, not just its content.

**HOW TO ASSIGN EMOTIONS:**
1. Calculate each turn's position as a percentage (turn_number / total_turns * 100)
2. Look up which PHASE that percentage falls into
3. Choose an emotion from that phase's ALLOWED emotions
4. AVOID emotions from that phase's AVOID list

**SELECT THE RIGHT TEMPLATE based on podcast format/tone:**

FOR NARRATIVE/ADVENTURE/TRAVEL (storytelling with dramatic arc):
- OPENING (0-10%): warm-curious. Use: warm, curious, intrigued, friendly
- EXPLORATION (10-40%): engaged-building. Use: curious, thoughtful, interested, warm, amused
- RISING ACTION (40-70%): intensifying. Use: intrigued, surprised, energized, curious
- CLIMAX (70-85%): peak-intensity. Use: excited, surprised, amazed, passionate
- RESOLUTION (85-100%): settling-reflective. Use: thoughtful, warm, satisfied, reflective

FOR PROFESSIONAL/ACADEMIC/MEDICAL (measured and authoritative):
- INTRODUCTION (0-15%): professional-warm. Use: professional, warm, clear, focused
- METHODOLOGY (15-35%): precise-measured. Use: thoughtful, precise, analytical, clear
- FINDINGS (35-70%): engaged-authoritative. Use: interested, thoughtful, analytical, measured
- IMPLICATIONS (70-85%): considered-emphasis. Use: thoughtful, emphatic, concerned, hopeful
- CONCLUSION (85-100%): professional-warm. Use: professional, warm, satisfied, thoughtful

FOR EDUCATIONAL/EXPLAINER (steady engagement with clarity):
- HOOK (0-10%): curious-inviting. Use: curious, warm, friendly, intrigued
- FOUNDATION (10-35%): clear-patient. Use: clear, warm, thoughtful, encouraging
- DEEP-DIVE (35-70%): engaged-focused. Use: interested, thoughtful, curious, clear
- AHA-MOMENT (70-85%): illuminating. Use: satisfied, warm, clear, encouraging
- WRAP-UP (85-100%): warm-encouraging. Use: warm, satisfied, encouraging, friendly

FOR INTERVIEW/DISCUSSION (responsive and dynamic):
- WELCOME (0-10%): warm-professional. Use: warm, friendly, professional, curious
- RAPPORT (10-25%): engaged-curious. Use: curious, interested, warm, amused
- SUBSTANCE (25-75%): dynamic-responsive. Use: curious, thoughtful, intrigued, surprised, amused
- KEY-INSIGHTS (75-90%): focused-impactful. Use: thoughtful, emphatic, intrigued, satisfied
- CLOSING (90-100%): warm-grateful. Use: warm, satisfied, grateful, friendly

**ORCHESTRATION RULES:**
- Emotions should FLOW smoothly between adjacent turns — no jarring jumps
- Within each phase, vary between 2-3 emotions from the allowed list (not all of them)
- Transitions between phases should be GRADUAL (1-2 turns of blending)
- The climax is the ONLY place for peak emotions like "excited" or "amazed"
- Most of the podcast (exploration phase) should feel steady and engaged, not dramatic

FOR EACH LINE:
1. Determine which phase this turn belongs to (by percentage)
2. Select an emotion from that phase's allowed list
3. Ensure smooth transition from previous turn's emotion
4. Add natural punctuation for pacing (ellipses, em dashes, commas)
5. Ensure content is speakable — no unsupported markup

OUTPUT AS JSON ARRAY:
[
  {"speaker": "Name", "content": "Dialogue with natural punctuation...", "emotion": "phase_appropriate_emotion", "phase": "opening|exploration|rising-action|climax|resolution"}
]`;

    // Voice director rewrites the full script with annotations
    const voiceDirectorMaxTokens = Math.max(baseWriterTokens, 8192) + getThinkingOverhead(stage4Model);
    const voiceOutput = await callModel(stage4Model, voiceDirectorPrompt, 0.6, voiceDirectorMaxTokens);
    job.stageOutputs!.voiceDirector = voiceOutput;
    job.progress = 85;
    jobs.set(jobId, { ...job });

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 5: EDITOR - Final Polish & Quality Assurance
    // ═══════════════════════════════════════════════════════════════════════════
    job.currentStage = 'editor';
    job.progress = 90;
    const stage5Model = getModelForStage(5);
    job.message = `📝 Stage 5/5: Editor finalizing script (${stage5Model})...`;
    jobs.set(jobId, { ...job });

    const scriptForEdit = Array.isArray(voiceOutput) ? voiceOutput : (voiceOutput?.script || scriptForVoice);

    const editorLangInstruction = isSpanish
      ? `⚠️ IDIOMA: ESPAÑOL MEXICANO - El script DEBE permanecer completamente en español mexicano. Si encuentras expresiones de España (vale, tío, mola, ostras, vosotros), reemplázalas con equivalentes mexicanos.\n`
      : '';

    const editorPrompt = `You are a podcast EDITOR doing final polish. Your job is to ensure the script is CLEAN, CONSISTENT, NARRATIVE, and ready for TTS.
${editorLangInstruction}
SCRIPT TO FINALIZE:
${JSON.stringify(scriptForEdit, null, 2)}

═══════════════════════════════════════════════════════════════════════════
📝 EDITOR'S FINAL POLISH CHECKLIST
═══════════════════════════════════════════════════════════════════════════

**1. NARRATIVE QUALITY GATE (check FIRST — fix before anything else):**
- HYPE-MACHINE CHECK: Does one speaker only react with excitement while the other delivers all the facts?
  → If yes, REWRITE the reactive speaker's turns to contribute their own information, counterpoints, or analysis. Both speakers must carry ~equal substantive weight.
- PERFORMATIVE SURPRISE CHECK: Count exclamatory reactions (¡Órale! / ¡No me digas! / ¡Increíble! / ¡No lo puedo creer!). If more than 3-4 in the whole script, REPLACE excess with understatement, skepticism, or quiet processing.
- LISTICLE CHECK: Are topics covered sequentially (transport → food → activities → budget)?
  → If yes, RESTRUCTURE so topics interweave and each section's question leads to the next section's answer.
- DISAGREEMENT CHECK: Do speakers agree on everything? Add genuine friction on 2-3 points.
- ANNOUNCED INSIGHTS CHECK: Does anyone SAY "I'm having a revelation" or "This is my aha moment"?
  → If yes, REWRITE so the insight emerges from accumulated evidence instead.
- Check for CALLBACKS: Does the conversation reference earlier points with new understanding?
  → If not, add 2-3 callbacks: "Remember when we said X? Now I think..."
- Check for STORY ARC: Does the conversation build toward a thesis, or just list topics?
  → If it's a topic checklist, restructure so insights build on each other

🎨 STYLE-SPECIFIC CHECKS (${styleProfile.label.toUpperCase()}):
${styleProfile.editorGuidance}
${getChildrenOverlay(preset.audience, 'editor')}

**2. PRESERVE THE GOOD STUFF:**
- Keep varied turn lengths (mix of short reactions and longer explorations)
- Keep genuine emotional reactions and personality
- Keep natural speech patterns ("you know", "I mean", etc.)
- Keep the chemistry and back-and-forth dynamic
- Keep callbacks and thematic connections
- PRESERVE THE TENSE/PERSPECTIVE: If hosts are planning something future, keep it future. If recounting, keep it past. Do NOT shift tense during editing.

**3. TTS-READY FORMATTING (Dual-Engine: Qwen3-TTS + Gemini TTS):**
- The "content" field must contain speakable words that sound natural when read aloud
- PRESERVE these 6 Gemini expression tags (they enhance Gemini TTS and are silently skipped by Qwen):
  ✅ [laughing], [whispering], [sighing], [shouting], [speaking slowly], [clears throat]
- REPLACE any OTHER [bracketed] markers:
  → [pause] → use an ellipsis (...) or a sentence break
  → [beat] → use an em dash (—) or comma
  → [chuckles] → rewrite as: "[laughing] Ha!" or just "Ha!"
  → [gasps] → rewrite as: "Wait— oh!"
- If any *asterisk emphasis* remains, REMOVE the asterisks and use repetition or rhetorical structure instead
- If any (parenthetical directions) remain, REMOVE them entirely
- Pauses come from punctuation: commas, ellipses (...), em dashes (—), periods
- Emphasis comes from sentence structure, not formatting
- Fix any broken sentences or incomplete thoughts
- Ensure speaker names are consistent: ${speakerNames}
- Each turn must have: speaker, content, emotion

**4. AGGRESSIVELY CUT REDUNDANCY & FLUFF (Critical for quality):**
- DELETE turns that restate what was just said in different words ("So what you're saying is..." followed by the same point)
- DELETE circular conclusions where speakers keep agreeing with each other without adding new information
- DELETE empty affirmations: "That's a great question/point", "Absolutely!", "Exactly!", "Totalmente", "Sin duda"
- DELETE padding phrases: "And that's the key", "That's what it's all about", "That's the real X" when they add nothing new
- DELETE turns where a speaker summarizes what the other just said — move forward instead
- MERGE turns that make the same point from slightly different angles into ONE stronger turn
- CUT any turn that could be removed without losing information or narrative flow
- If two consecutive turns both express agreement/excitement, KEEP ONLY ONE
- The script should feel TIGHT and PROPULSIVE — every turn must earn its place with new information, a new angle, or genuine emotional progression
- Target: Remove 15-25% of turns that are pure fluff or repetition

**5. EMOTION TAGS - Use specific, varied emotions:**
Good: curious, intrigued, surprised, amused, thoughtful, contemplative, realizing, processing, vulnerable, excited, skeptical, warm, playful, serious, conflicted, nostalgic, wonder
Bad: enthusiastic (overused), happy (too generic), neutral (too flat)

**6. TECHNICAL:**
- Ensure valid JSON array format
- Each turn: {"speaker": "Name", "content": "...", "emotion": "specific_emotion"}
- Target length: ~${targetWordCount} words total (after cutting fluff, the script may be shorter — that's fine)
- You MAY remove redundant turns. The script must remain at least ${Math.round(minTurns * 0.5)} turns of SUBSTANCE.
${isSpanish ? '- El script DEBE permanecer completamente en español.' : ''}

OUTPUT THE FINAL CLEAN JSON ARRAY ONLY (no wrapper object):
[
  {"speaker": "Name", "content": "Engaging dialogue...", "emotion": "specific_emotion"}
]`;

    // Editor outputs the final full script
    const editorMaxTokens = Math.max(baseWriterTokens, 8192) + getThinkingOverhead(stage5Model);
    const finalScript = await callModel(stage5Model, editorPrompt, 0.5, editorMaxTokens);
    job.stageOutputs!.editor = finalScript;
    job.progress = 95;
    jobs.set(jobId, { ...job });

    // Parse final script — handle all possible return types from callModel:
    // 1. Array (already parsed by callModel)
    // 2. Object with nested array (e.g., {revisedScript: [...]} or {finalScript: [...]})
    // 3. String containing JSON array
    // 4. Anything else → fall back to Voice Director output (scriptForEdit)
    let parsedScript: any[] = [];
    if (Array.isArray(finalScript)) {
      parsedScript = finalScript;
    } else if (typeof finalScript === 'object' && finalScript !== null) {
      // Editor may return a wrapper object — extract the array from known keys
      const possibleArrayKeys = ['revisedScript', 'finalScript', 'script', 'dialogue', 'turns'];
      for (const key of possibleArrayKeys) {
        if (Array.isArray(finalScript[key])) {
          parsedScript = finalScript[key];
          console.log(`📝 Editor returned wrapper object, extracted script from "${key}" (${parsedScript.length} turns)`);
          break;
        }
      }
      if (parsedScript.length === 0) {
        console.warn(`⚠️ Editor returned object but no script array found. Keys: ${Object.keys(finalScript).join(', ')}. Falling back to Voice Director output.`);
        parsedScript = Array.isArray(scriptForEdit) ? scriptForEdit : [];
      }
    } else if (typeof finalScript === 'string') {
      const jsonMatch = finalScript.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedScript = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn(`⚠️ Editor returned string but JSON parse failed. Falling back to Voice Director output.`);
          parsedScript = Array.isArray(scriptForEdit) ? scriptForEdit : [];
        }
      } else {
        console.warn(`⚠️ Editor returned string with no JSON array. Falling back to Voice Director output.`);
        parsedScript = Array.isArray(scriptForEdit) ? scriptForEdit : [];
      }
    }

    // Final safety net: if parsedScript is still empty, fall back through the pipeline
    if (parsedScript.length === 0) {
      console.warn(`⚠️ Editor output empty — falling back through pipeline stages...`);
      const fallbacks = [scriptForEdit, voiceOutput, directorOutput, writerOutput];
      for (const fb of fallbacks) {
        if (Array.isArray(fb) && fb.length > 0) {
          parsedScript = fb;
          console.log(`✅ Recovered script from fallback (${parsedScript.length} turns)`);
          break;
        } else if (typeof fb === 'object' && fb !== null && !Array.isArray(fb)) {
          // Try extracting array from object
          const arrKey = Object.keys(fb).find(k => Array.isArray(fb[k]) && fb[k].length > 0);
          if (arrKey) {
            parsedScript = fb[arrKey];
            console.log(`✅ Recovered script from fallback object key "${arrKey}" (${parsedScript.length} turns)`);
            break;
          }
        }
      }
    }

    // Ensure each turn has required fields and normalize speaker names
    const cleanedScript = parsedScript.map((turn: any, index: number) => {
      // Normalize speaker name - remove parenthetical descriptors like "(Curious)"
      let speaker = turn.speaker || 'Speaker 1';
      speaker = speaker.replace(/\s*\([^)]*\)\s*/g, '').trim();
      
      // Map common role-based names to proper names
      if (speaker.toUpperCase().includes('CO-HOST') || speaker.toUpperCase().includes('COHOST')) {
        speaker = index % 2 === 0 ? (namedParticipants[0]?.name || 'Speaker 1') : (namedParticipants[1]?.name || 'Speaker 2');
      } else if (speaker.toUpperCase() === 'HOST') {
        speaker = namedParticipants[0]?.name || 'Speaker 1';
      } else if (speaker.toUpperCase() === 'EXPERT' || speaker.toUpperCase() === 'GUEST') {
        speaker = namedParticipants[1]?.name || 'Speaker 2';
      }
      
      return {
        id: `turn-${index}`,
        speaker,
        content: turn.content || '',
        emotion: turn.emotion || 'neutral',
      };
    });
    
    // Post-process: Fix any consecutive same-speaker turns by inserting interjections
    const fixedScript: any[] = [];
    for (let i = 0; i < cleanedScript.length; i++) {
      const turn = cleanedScript[i];
      const prevTurn = fixedScript[fixedScript.length - 1];
      
      if (prevTurn && prevTurn.speaker.toUpperCase() === turn.speaker.toUpperCase()) {
        // Same speaker twice - insert an interjection from the other speaker
        const otherSpeaker = namedParticipants.find(
          (p: any) => p.name.toUpperCase() !== turn.speaker.toUpperCase()
        )?.name || (turn.speaker === namedParticipants[0]?.name ? (namedParticipants[1]?.name || 'Speaker 2') : (namedParticipants[0]?.name || 'Speaker 1'));
        
        const interjections = isSpanish ? [
          { content: "Sí, sí—", emotion: "agreeing" },
          { content: "Ajá.", emotion: "listening" },
          { content: "Interesante—", emotion: "intrigued" },
          { content: "Espera, o sea—", emotion: "curious" },
          { content: "Hmm.", emotion: "thoughtful" },
        ] : [
          { content: "Right, right—", emotion: "agreeing" },
          { content: "Mm-hmm.", emotion: "listening" },
          { content: "Interesting—", emotion: "intrigued" },
          { content: "Wait, so—", emotion: "curious" },
          { content: "Huh.", emotion: "thoughtful" },
        ];
        const interjection = interjections[Math.floor(Math.random() * interjections.length)];
        
        fixedScript.push({
          id: `turn-${fixedScript.length}`,
          speaker: otherSpeaker,
          content: interjection.content,
          emotion: interjection.emotion,
        });
      }
      
      fixedScript.push({
        ...turn,
        id: `turn-${fixedScript.length}`,
      });
    }
    
    // Use the fixed script
    const finalCleanedScript = fixedScript;

    // Calculate metadata from the fixed script
    const wordCount = finalCleanedScript.reduce((acc: number, turn: any) => acc + (turn.content?.split(' ').length || 0), 0);
    const speakers = Array.from(new Set(finalCleanedScript.map((t: any) => t.speaker)));
    const estimatedDuration = Math.ceil(wordCount / 150 * 60); // ~150 words per minute

    // Save to database if projectId provided
    let savedScriptId: string | null = null;
    if (projectId) {
      try {
        console.log(`💾 Saving script to database for project ${projectId}...`);
        const savedScript = await createScriptGeneration({
          project_id: projectId,
          script_length: preset?.length || 'comprehensive',
          version: 1, // Will be auto-incremented by DB function
          title: `5-Stage Script - ${new Date().toLocaleDateString()}`,
          content: JSON.stringify(finalCleanedScript),
          word_count: wordCount,
          estimated_duration_seconds: estimatedDuration,
          generation_params: {
            preset,
            productionConfig,
            stagesCompleted: 5,
            speakers,
            language: preset.language || 'english',
          },
          ai_model: primaryModel,
          ai_provider: 'ai-gateway',
          generation_time_ms: Date.now() - startTime,
          status: 'generated',
          is_current: true,
        });
        savedScriptId = savedScript.id;
        console.log(`✅ Script saved to database with ID: ${savedScriptId}`);
      } catch (dbError) {
        console.error('⚠️ Failed to save script to database:', dbError);
        // Continue - script is still available in memory
      }
    }

    // Complete
    job.status = 'complete';
    job.progress = 100;
    job.message = '✅ 5-stage production complete!';
    job.currentStage = 'complete';
    job.result = {
      success: true,
      finalScript: finalCleanedScript,
      savedScriptId,
      stageResults: [
        { stage: 'producer', output: producerOutput, success: true, timestamp: new Date().toISOString() },
        { stage: 'writer', output: writerOutput, success: true, timestamp: new Date().toISOString() },
        { stage: 'director', output: directorOutput, success: true, timestamp: new Date().toISOString() },
        { stage: 'voice-director', output: voiceOutput, success: true, timestamp: new Date().toISOString() },
        { stage: 'editor', output: finalScript, success: true, timestamp: new Date().toISOString() },
      ],
      metadata: {
        wordCount,
        turnCount: finalCleanedScript.length,
        speakers,
        // Rich speaker details for voice assignment downstream
        speakerProfiles: namedParticipants.map((p: any) => ({
          name: p.name,
          gender: p.gender || 'neutral',
          role: p.role,
          personality: p.personality,
        })),
        language: preset.language || 'english',
        audience: preset.audience || 'general',
        podcastStyle: styleProfile.id,
        podcastFormat: preset.podcastFormat || 'roundtable',
        tone: preset.tone || 'conversational',
        generatedAt: new Date().toISOString(),
        primaryModel,
        stagesCompleted: 5,
        savedToDatabase: !!savedScriptId,
      },
      // Audio direction metadata - instructs TTS on emotional delivery
      // This is separate from audio settings (volume, gaps, etc.) which are controlled at generation time
      audioDirection: {
        arcTemplate: preset.podcastFormat === 'interview' ? 'interview-discussion' :
                     preset.tone === 'professional' || preset.tone === 'formal' ? 'professional-academic' :
                     preset.tone === 'educational' ? 'educational-explainer' :
                     preset.podcastFormat === 'news' ? 'news-briefing' : 'narrative-adventure',
        baselineTone: preset.tone || 'conversational',
        language: preset.language || 'english',
        // Phase boundaries (turn indices) - computed from script length
        phases: (() => {
          const total = finalCleanedScript.length;
          const arcType = preset.podcastFormat === 'interview' ? 'interview' :
                         preset.tone === 'professional' ? 'professional' : 'narrative';
          if (arcType === 'professional') {
            return [
              { phase: 'introduction', startTurn: 0, endTurn: Math.floor(total * 0.15), baseline: 'professional-warm' },
              { phase: 'methodology', startTurn: Math.floor(total * 0.15), endTurn: Math.floor(total * 0.35), baseline: 'precise-measured' },
              { phase: 'findings', startTurn: Math.floor(total * 0.35), endTurn: Math.floor(total * 0.70), baseline: 'engaged-authoritative' },
              { phase: 'implications', startTurn: Math.floor(total * 0.70), endTurn: Math.floor(total * 0.85), baseline: 'considered-emphasis' },
              { phase: 'conclusion', startTurn: Math.floor(total * 0.85), endTurn: total, baseline: 'professional-warm' },
            ];
          } else if (arcType === 'interview') {
            return [
              { phase: 'welcome', startTurn: 0, endTurn: Math.floor(total * 0.10), baseline: 'warm-professional' },
              { phase: 'rapport', startTurn: Math.floor(total * 0.10), endTurn: Math.floor(total * 0.25), baseline: 'engaged-curious' },
              { phase: 'substance', startTurn: Math.floor(total * 0.25), endTurn: Math.floor(total * 0.75), baseline: 'dynamic-responsive' },
              { phase: 'key-insights', startTurn: Math.floor(total * 0.75), endTurn: Math.floor(total * 0.90), baseline: 'focused-impactful' },
              { phase: 'closing', startTurn: Math.floor(total * 0.90), endTurn: total, baseline: 'warm-grateful' },
            ];
          } else {
            return [
              { phase: 'opening', startTurn: 0, endTurn: Math.floor(total * 0.10), baseline: 'warm-curious' },
              { phase: 'exploration', startTurn: Math.floor(total * 0.10), endTurn: Math.floor(total * 0.40), baseline: 'engaged-building' },
              { phase: 'rising-action', startTurn: Math.floor(total * 0.40), endTurn: Math.floor(total * 0.70), baseline: 'intensifying' },
              { phase: 'climax', startTurn: Math.floor(total * 0.70), endTurn: Math.floor(total * 0.85), baseline: 'peak-intensity' },
              { phase: 'resolution', startTurn: Math.floor(total * 0.85), endTurn: total, baseline: 'settling-reflective' },
            ];
          }
        })(),
        // Per-turn emotion summary (for audio generation to reference)
        turnEmotions: finalCleanedScript.map((turn: any, idx: number) => ({
          turnIndex: idx,
          emotion: turn.emotion || 'neutral',
          phase: turn.phase || null,
        })),
      },
    };
    jobs.set(jobId, { ...job });

  } catch (error) {
    // Log detailed error information for debugging
    console.error('❌ Script generation error:', {
      jobId,
      currentStage: job.currentStage,
      progress: job.progress,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Update job with error state
    job.status = 'error';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.message = `Script generation failed at stage: ${job.currentStage || 'init'}`;
    jobs.set(jobId, { ...job });
  }
}

// Helper function to call any model via AI Gateway
async function callModel(model: string, prompt: string, temperature: number = 0.7, maxTokens: number = 4000): Promise<any> {
  // AI Gateway handles routing to the correct backend (vLLM, Gemini, etc.)
  const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
  const aiGatewayKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

  // Map model names to AI Gateway model IDs
  // These MUST match the model IDs registered in the AI Gateway's Google provider
  // (see core/ai-gateway-v2/src/services/providers/google-provider.js)
  const modelMapping: Record<string, string> = {
    'qwen3-32b': 'qwen3-32b',
    'gemini-2-5-pro': 'gemini-2-5-pro',
    'gemini-2-5-flash': 'gemini-2-5-flash',
  };

  const gatewayModel = modelMapping[model] || model;

  console.log(`🤖 Calling ${model} via AI Gateway (${aiGatewayUrl})...`);

  try {
    // Use AbortController for client-side timeout (5 minutes for long script generation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    const response = await fetch(`${aiGatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': aiGatewayKey,
        'X-Request-Timeout': '300000', // Hint to gateway: 5 minute timeout
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        // Some gateways support timeout in body
        timeout: 300,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI Gateway error (${response.status}):`, errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`✅ ${model} response received (${content.length} chars)`);

    // Try to parse as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        return content;
      }
    }
    return content;
  } catch (error) {
    console.error(`❌ Model ${model} call failed:`, error);
    throw error;
  }
}

