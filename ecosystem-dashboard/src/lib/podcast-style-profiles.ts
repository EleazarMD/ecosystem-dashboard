/**
 * Podcast Style Profiles
 * 
 * Rich, example-laden guidance for Gemini on how to write different podcast styles.
 * Each profile provides per-stage instructions that get injected into the 5-stage pipeline.
 * 
 * DESIGN: Style × Audience
 *   - 10 STYLES define HOW the conversation sounds (structure, register, dynamics)
 *   - AUDIENCE MODIFIER adjusts register when audience is 'children' (ages 7+)
 *   - Any style can be combined with any audience
 * 
 * TAXONOMY (10 styles):
 * 
 *   PROFESSIONAL:
 *     analytical    — Data science, technical analysis. Evidence-based, rigorous, methodology-aware.
 *     academic      — MBA research, literature reviews. Scholarly, frameworks, intellectual disagreement.
 *     clinical      — Medical/clinical content. Precise, patient-focused, evidence hierarchies.
 *     editorial     — Professional briefings, roundtables. Sharp, opinionated, insight-dense.
 * 
 *   PERSONAL / EXPLORATORY:
 *     narrative     — Conversational storytelling. Scenes, emotional arcs, personal connections.
 *     intimate      — Vulnerable, personal stories. Lived experience, emotional depth.
 *     comedic       — Entertainment-first. Laughs and learning, teasing, absurd comparisons.
 *     lifestyle     — Travel, food, cities, family, recommendations. Practical + vivid + personal.
 * 
 *   EDUCATIONAL / HYBRID:
 *     explainer     — How things work, tutorials, step-by-step. Patient, clear, building understanding.
 *     investigative — Skeptical deep-dives, debates. Challenge assumptions, build a case.
 */

export type PodcastStyle = 'analytical' | 'academic' | 'clinical' | 'narrative' | 'investigative' | 'editorial' | 'intimate' | 'comedic' | 'lifestyle' | 'explainer';

export interface StyleProfile {
  id: PodcastStyle;
  label: string;
  icon: string;
  description: string;
  references: string;
  writerGuidance: string;
  directorGuidance: string;
  voiceDirectorGuidance: string;
  editorGuidance: string;
  allowedEmotions: string[];
  avoidEmotions: string[];
  defaultArcTemplate: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHILDREN'S AUDIENCE MODIFIER
// Applied on top of any style when audience includes children
// ═══════════════════════════════════════════════════════════════════════════

const CHILDREN_AUDIENCE_OVERLAY = {
  writerOverlay: `
═══ 🧒 CHILDREN'S AUDIENCE MODIFIER (ages 7+) ═══
The audience includes CHILDREN. Adjust your writing accordingly:

**VOCABULARY & REGISTER:**
- Use simple, concrete words. Replace abstractions with things kids can picture.
- ❌ "The economic implications are significant" → ✅ "That means a LOT of money — like, enough to buy a million pizzas"
- Explain any concept a 9-year-old wouldn't know, using analogies to their world (school, games, animals, food, family)
- Short sentences. One idea per sentence when explaining something new.

**ENGAGEMENT:**
- Make it interactive: "Guess what happens next?" / "Can you imagine that?" / "How cool is that?"
- Use vivid sensory details: colors, sounds, sizes compared to things kids know ("as tall as 10 school buses stacked up")
- Include "wow factor" moments — kids love superlatives and extremes
- Speakers should sound genuinely excited about sharing cool things, like a fun teacher or older sibling

**TONE:**
- Warm, encouraging, never condescending ("you probably don't understand" = BAD)
- Humor kids actually find funny: silly comparisons, unexpected facts, gentle absurdity
- Keep energy up — kids tune out during long, slow sections
- Shorter turns (20-50 words max for most turns). Quick back-and-forth.

**CONTENT:**
- Lead with the most interesting/surprising/weird fact — hook them immediately
- "Did you know...?" and "What if I told you...?" are great openers for sections
- Connect everything to kids' lives: school, friends, family, games, animals, food
- If discussing numbers, make them relatable: "That's like if every kid in your school..."
`,

  directorOverlay: `
**CHILDREN'S AUDIENCE FIXES:**
- If any turn is longer than 60 words, break it up or simplify
- If vocabulary is too advanced, replace with kid-friendly alternatives
- If there are no "wow" moments, add surprising facts or vivid comparisons
- If speakers sound like they're lecturing, make it more like a conversation between a cool older sibling and a curious kid
- Add interactive moments: "Can you guess?" / "What would YOU do?"
`,

  voiceDirectorOverlay: `
**CHILDREN'S AUDIENCE EMOTIONAL REGISTER:**
- Baseline: warm, friendly, energetic but not manic
- Speak slightly slower and clearer than adult podcasts
- Emphasis on key words kids need to catch
- Excitement should feel genuine, like sharing a cool discovery with a kid you care about
`,

  editorOverlay: `
**CHILDREN'S AUDIENCE CHECKS:**
- Would a 9-year-old understand every sentence? If not, simplify.
- Are there enough "wow" moments to keep a kid engaged?
- Are turns short enough? (Most under 50 words)
- Is the vocabulary concrete and visual?
- Does it sound like a fun conversation, not a lesson?
`,
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLE PROFILES
// ═══════════════════════════════════════════════════════════════════════════

export const STYLE_PROFILES: Record<PodcastStyle, StyleProfile> = {

  // ─── ANALYTICAL ──────────────────────────────────────────────────────
  analytical: {
    id: 'analytical',
    label: 'Analytical',
    icon: '🔬',
    description: 'Data-driven, technical analysis. Evidence-based, rigorous, methodology-aware.',
    references: 'Think: Lex Fridman, Data Skeptic, Linear Digressions, Talking Machines',

    writerGuidance: `
═══ ANALYTICAL STYLE — How data people actually talk ═══

Two analysts working through data together. They care about methodology, sample sizes,
confidence intervals, and whether the conclusion actually follows from the evidence.

**THE ANALYTICAL VOICE:**
- Speakers quantify everything: "That's a 23% lift, but with an n of 400, I'd want to see the p-value"
- They question methodology: "How did they control for...?" / "What's the baseline here?"
- They distinguish signal from noise: "That could just be seasonal variation"
- They think in models: "If you model this as a regression..." / "The feature importance tells a different story"
- They disagree on interpretation, not facts: "We're looking at the same data but I read it differently"

✅ GOOD:
  A: "So the model accuracy jumped from 78 to 91% after they added the temporal features."
  B: "On the test set or validation? Because if they didn't hold out a proper validation set, that 91 is meaningless."
  A: "Test set. But here's what's interesting — the precision-recall tradeoff shifted. They gained recall but lost precision on the minority class."
  B: "Which makes sense if the temporal features are correlated with the majority class. Did they look at the confusion matrix breakdown?"

❌ BAD:
  A: "The AI model is amazing! 91% accuracy!"
  B: "Wow, that's incredible! AI is changing everything!"

**REGISTER:** Precise, technical but accessible. Numbers and specifics, not hand-waving. Dry humor about bad methodology.
`,

    directorGuidance: `
**ANALYTICAL STYLE FIXES:**
- Add specific numbers where claims are vague
- If speakers agree too easily on interpretation, add methodological pushback
- Ensure both speakers demonstrate technical competence
- Strip performative reactions — analytical surprise is: "Huh. That's a weird distribution."
`,

    voiceDirectorGuidance: `
**ANALYTICAL EMOTIONAL REGISTER:**
- Baseline: focused, precise, engaged but understated
- Appropriate: thoughtful, analytical, intrigued, measured, skeptical, focused
- Peak: "emphatic" when a finding is genuinely surprising, never "excited"
- Pauses = thinking through implications, not drama
`,

    editorGuidance: `
**ANALYTICAL QUALITY CHECKS:**
- Are claims backed by specific data points?
- Is methodology discussed, not just results?
- Do speakers distinguish correlation from causation?
- Strip any "Amazing!" / "Incredible!" reactions
`,

    allowedEmotions: ['thoughtful', 'analytical', 'intrigued', 'precise', 'measured', 'skeptical', 'curious', 'focused', 'reflective', 'emphatic'],
    avoidEmotions: ['excited', 'amazed', 'energized', 'playful', 'amused', 'warm'],
    defaultArcTemplate: 'professional-academic',
  },

  // ─── ACADEMIC ────────────────────────────────────────────────────────
  academic: {
    id: 'academic',
    label: 'Academic',
    icon: '🎓',
    description: 'Scholarly discussion. Frameworks, literature, intellectual disagreement.',
    references: 'Think: Huberman Lab, EconTalk, Sean Carroll\'s Mindscape, Philosophy Bites',

    writerGuidance: `
═══ ACADEMIC STYLE — How scholars actually talk ═══

Two experts thinking through a problem together using frameworks, literature, and evidence.
This is NOT a lecture — it's intellectual sparring with mutual respect.

**THE ACADEMIC VOICE:**
- Speakers cite frameworks: "If you apply Porter's Five Forces here..." / "Through a Bayesian lens..."
- They reference literature: "The 2024 meta-analysis found..." / "Kahneman's work on this suggests..."
- They qualify claims: "The evidence suggests..." / "One interpretation is..." / "We should be careful about..."
- They acknowledge uncertainty: "The data is mixed on..." / "I'm not sure about this, but..."
- They push back on reasoning: "That assumes X, but what if...?" / "There's a competing framework..."

✅ GOOD:
  A: "The interesting thing about this study is the sample size — 12,000 participants across three countries."
  B: "Right, but look at the dropout rate. They started with 12,000 but only 7,800 completed follow-up. That's 35% attrition, which introduces selection bias you can't hand-wave away."
  A: "Fair point. Although they ran sensitivity analyses. The effect held, but the confidence interval widened."
  B: "Which tells you something in itself."

❌ BAD:
  A: "This study is amazing! 12,000 people!"
  B: "Wow! What did they find?"

**REGISTER:** Precise but not jargon-heavy. Longer turns for complex arguments. Dry, intellectual humor. NO exclamation marks except genuine data surprise.
`,

    directorGuidance: `
**ACADEMIC STYLE FIXES:**
- Add intellectual friction where speakers agree too easily
- Add hedging: "suggests" not "proves", "one factor" not "the reason"
- If no methodological discussion, add it: "But how robust is that finding?"
- Strip performative excitement. Academic surprise is quiet: "Huh. That's... not what I expected."
- Ensure BOTH speakers demonstrate expertise
`,

    voiceDirectorGuidance: `
**ACADEMIC EMOTIONAL REGISTER:**
- Baseline: thoughtful, measured, engaged but not excitable
- Appropriate: thoughtful, analytical, intrigued, precise, measured, concerned, skeptical
- Peak: "emphatic" when making a key point, never "excited" or "amazed"
- Disagreement = respectful but firm, not heated
`,

    editorGuidance: `
**ACADEMIC QUALITY CHECKS:**
- Are claims properly qualified?
- Do speakers cite evidence, not just assert opinions?
- Is there genuine intellectual disagreement?
- Are technical terms explained naturally?
- Strip any "¡Increíble!" / "Amazing!" reactions
`,

    allowedEmotions: ['thoughtful', 'analytical', 'intrigued', 'precise', 'measured', 'concerned', 'skeptical', 'curious', 'focused', 'reflective', 'emphatic'],
    avoidEmotions: ['excited', 'amazed', 'energized', 'playful', 'amused'],
    defaultArcTemplate: 'professional-academic',
  },

  // ─── CLINICAL ────────────────────────────────────────────────────────
  clinical: {
    id: 'clinical',
    label: 'Clinical',
    icon: '🏥',
    description: 'Medical/clinical content. Precise, patient-focused, evidence hierarchies.',
    references: 'Think: Peter Attia\'s The Drive, ZDoggMD, Clinical Problem Solvers, The Curbsiders',

    writerGuidance: `
═══ CLINICAL STYLE — How clinicians discuss evidence ═══

Two medical professionals discussing clinical evidence, patient outcomes, and practice implications.
Precision matters — lives depend on getting this right.

**THE CLINICAL VOICE:**
- Speakers think in evidence hierarchies: "That's a case series, not an RCT" / "The NNT is 12, which is..."
- They connect to patient impact: "In practice, what this means for the patient is..."
- They discuss risk-benefit: "The side effect profile is concerning because..."
- They're precise about mechanisms: "The proposed mechanism is..." / "At the cellular level..."
- They acknowledge clinical uncertainty: "The guidelines say X, but in my experience..."

✅ GOOD:
  A: "The Phase III trial showed a 34% relative risk reduction, which sounds impressive until you look at the absolute numbers."
  B: "Right — the absolute risk went from 3.2% to 2.1%. So the NNT is about 91. You'd need to treat 91 patients for one to benefit."
  A: "And the adverse event rate was 8%. So for every patient who benefits, roughly 7 experience side effects."
  B: "Which is why the shared decision-making conversation matters so much here. This isn't a slam dunk."

❌ BAD:
  A: "This new drug is amazing! 34% reduction!"
  B: "Wow, that's a game-changer!"

**REGISTER:** Precise, measured, authoritative but humble. Patient-centered framing. No hype about treatments.
`,

    directorGuidance: `
**CLINICAL STYLE FIXES:**
- Convert relative risk to absolute risk wherever possible
- Add patient-impact framing: "What does this mean for someone sitting in your office?"
- If speakers hype a treatment, add risk-benefit nuance
- Ensure clinical uncertainty is acknowledged: "The evidence is limited to..."
- Add practical clinical pearls alongside the data
`,

    voiceDirectorGuidance: `
**CLINICAL EMOTIONAL REGISTER:**
- Baseline: professional, measured, caring but precise
- Appropriate: thoughtful, professional, concerned, clear, focused, measured, emphatic
- Peak: "emphatic" for patient safety points, "concerned" for risks
- Never casual about outcomes — lives are at stake
`,

    editorGuidance: `
**CLINICAL QUALITY CHECKS:**
- Are relative risks contextualized with absolute numbers?
- Is patient impact discussed, not just data?
- Are treatment claims balanced with risk/side effects?
- Is clinical uncertainty acknowledged?
- Strip any hype language about treatments
`,

    allowedEmotions: ['thoughtful', 'professional', 'concerned', 'clear', 'focused', 'measured', 'emphatic', 'hopeful', 'analytical', 'precise'],
    avoidEmotions: ['excited', 'amazed', 'playful', 'amused', 'energized'],
    defaultArcTemplate: 'professional-academic',
  },

  // ─── EDITORIAL ───────────────────────────────────────────────────────
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    icon: '💼',
    description: 'Sharp, opinionated, insight-dense. Frameworks, actionable takeaways, multiple perspectives.',
    references: 'Think: HBR IdeaCast, a16z Podcast, The Prof G Pod, Acquired, Pivot',

    writerGuidance: `
═══ EDITORIAL STYLE — How smart operators talk shop ═══

Every turn must deliver insight, context, or a useful framework. Speakers are peers who
respect each other's expertise and push each other to sharper thinking.

**THE EDITORIAL VOICE:**
- Speakers think in frameworks: "There are really three factors at play here..."
- They quantify: "That's a 40% improvement, which in this market means..."
- They challenge assumptions: "Everyone says X, but the actual numbers tell a different story..."
- They connect to strategy: "The implication for anyone in this space is..."
- They're direct: "I think that's wrong, and here's why." No hedging for politeness.

✅ GOOD:
  A: "The unit economics don't work at that scale. 60% gross margin on paper, but factor in CAC and churn — which they buried in the footnotes — and you're closer to 35%."
  B: "I noticed that too. But I think they're betting on the retention curve flattening at month six. If it does, the LTV math changes completely."
  A: "It's aspirational until they prove otherwise. And the burn rate in the meantime..."

❌ BAD:
  A: "This company is doing really well!"
  B: "¡Increíble! Tell me more!"

**REGISTER:** Crisp, direct, no filler. Shorter turns (30-60 words). Numbers and specifics. Humor is sharp and observational. Zero exclamation marks.
`,

    directorGuidance: `
**EDITORIAL STYLE FIXES:**
- Add specifics where turns are vague: numbers, percentages, timeframes
- Add strategic disagreement where speakers agree too easily
- Add frameworks or mental models if missing
- Strip ALL performative reactions. Professional surprise = "Huh. Not what I expected."
- Cut any turn that's just agreement — merge or delete
`,

    voiceDirectorGuidance: `
**EDITORIAL EMOTIONAL REGISTER:**
- Baseline: confident, measured, engaged
- Appropriate: focused, analytical, measured, clear, emphatic, intrigued, professional
- Peak: "emphatic" for key strategic points
- Pacing: brisk but not rushed — every word is chosen
`,

    editorGuidance: `
**EDITORIAL QUALITY CHECKS:**
- Does every turn deliver new information, a framework, or a strategic insight?
- Are there specific numbers?
- Is there genuine strategic disagreement?
- Are there actionable takeaways?
- Strip filler: "That's a great point" / "Absolutely" / "Exactly"
`,

    allowedEmotions: ['focused', 'analytical', 'measured', 'clear', 'emphatic', 'intrigued', 'professional', 'concerned', 'skeptical'],
    avoidEmotions: ['warm', 'playful', 'amused', 'vulnerable', 'excited', 'amazed', 'grateful'],
    defaultArcTemplate: 'professional-academic',
  },

  // ─── NARRATIVE ───────────────────────────────────────────────────────
  narrative: {
    id: 'narrative',
    label: 'Narrative',
    icon: '📖',
    description: 'Conversational storytelling. Scenes, emotional arcs, personal connections woven through facts.',
    references: 'Think: Radiolab, 99% Invisible, This American Life, Revisionist History',

    writerGuidance: `
═══ NARRATIVE STYLE — The joy of following a thread ═══

This is about the JOURNEY of understanding. Speakers follow curiosity, discover unexpected
connections, paint vivid scenes, and arrive somewhere they didn't expect.

**THE NARRATIVE VOICE:**
- Speakers paint scenes: "Picture this — it's 1962, you're standing in a lab in Cambridge..."
- They follow tangents that circle back: "That reminds me of something completely different, but stay with me..."
- They make unexpected connections: "You know what this is actually like?"
- They wonder out loud: "I keep thinking about why... what if the real reason is..."
- They're comfortable not knowing: "I have no idea where this is going, but..."

✅ GOOD:
  A: "So here's what I can't stop thinking about. Everyone focuses on the big number. But there's this tiny detail buried in the report that nobody's talking about."
  B: "Which one?"
  A: "They tested this in three cities, and in one of them — just one — the results were completely opposite. Nobody asks why."
  B: "Huh. That actually reminds me of something I read about urban planning in Tokyo. Completely different field, same pattern: what works in one context fails spectacularly in another."
  A: "Okay, now I need to hear this Tokyo story."

❌ BAD:
  A: "Let's talk about topic one."
  B: "Great! What about it?"
  A: "Here are three facts."
  B: "Amazing! Now topic two."

**REGISTER:** Curious, wondering, rich with analogies. Variable turn lengths. Comfortable with uncertainty and open questions.
`,

    directorGuidance: `
**NARRATIVE STYLE FIXES:**
- If too linear, add tangents that circle back with new insight
- If no unexpected connections, add cross-domain analogies
- If speakers just exchange facts, add wondering: "But WHY would that be the case?"
- Let some questions hang unanswered
- Add "rabbit hole" moments where a small detail opens a bigger story
`,

    voiceDirectorGuidance: `
**NARRATIVE EMOTIONAL REGISTER:**
- Baseline: curious, engaged, wondering
- Appropriate: curious, intrigued, thoughtful, surprised (genuine), amused, reflective, energized
- Peak: the "aha" of connecting two unexpected things
- Pacing varies dramatically: fast when excited, slow when processing
`,

    editorGuidance: `
**NARRATIVE QUALITY CHECKS:**
- Does the conversation follow genuine curiosity, or just cover topics?
- Are there unexpected connections between ideas?
- Do tangents circle back with new insight?
- Is there a sense of DISCOVERY — speakers learning in real time?
- Does it feel like a journey, not a report?
`,

    allowedEmotions: ['curious', 'intrigued', 'thoughtful', 'surprised', 'amused', 'reflective', 'energized', 'warm', 'interested', 'amazed'],
    avoidEmotions: ['professional', 'precise', 'authoritative', 'measured', 'emphatic'],
    defaultArcTemplate: 'narrative-adventure',
  },

  // ─── INTIMATE ────────────────────────────────────────────────────────
  intimate: {
    id: 'intimate',
    label: 'Intimate',
    icon: '💬',
    description: 'Vulnerable, personal stories. Lived experience, emotional depth, real human connection.',
    references: 'Think: Brené Brown, Diary of a CEO, On Purpose with Jay Shetty, Armchair Expert',

    writerGuidance: `
═══ INTIMATE STYLE — How people talk when they're being real ═══

The most HUMAN style. Speakers share personal experiences, admit vulnerabilities, and connect
the topic to their own lives. Information serves the story, not the other way around.

**THE INTIMATE VOICE:**
- Speakers share from experience: "When I went through this..." / "My family dealt with something similar..."
- They admit what they don't know: "Honestly, I had no idea about this until..."
- They connect facts to feelings: "When I read that statistic, my stomach dropped because..."
- They're comfortable with silence: "I don't know... I'm still processing that."
- They express real emotions: worry, relief, confusion, gratitude — felt, not performed

✅ GOOD:
  A: "You know what hit me hardest? It wasn't the numbers. It was imagining my mom in that situation. She's 68, lives alone, and if something like this happened... I don't even want to think about it."
  B: "I get that. My dad is the same — he'd never ask for help. And that's the thing nobody talks about, right? It's not just the problem, it's the pride that keeps people from dealing with it."
  A: "The pride thing... yeah. That connects to what we were saying earlier about why the statistics look the way they do."

❌ BAD:
  A: "40% of seniors face this problem."
  B: "¡Qué fuerte! That's a lot!"

**REGISTER:** Warm, intimate. Longer reflective turns. Comfortable with emotion. Humor is self-deprecating and gentle.
`,

    directorGuidance: `
**INTIMATE STYLE FIXES:**
- If all facts and no feelings, add personal connections
- If no personal stories, weave in experiences that relate to the topic
- If vulnerability is missing, add admissions: "I'll be honest, I didn't handle this well when..."
- If it reads like a report, restructure around the HUMAN story
- Don't rush past emotional moments — let them breathe
`,

    voiceDirectorGuidance: `
**INTIMATE EMOTIONAL REGISTER:**
- Baseline: warm, genuine, unhurried
- Appropriate: warm, reflective, vulnerable, concerned, hopeful, grateful, thoughtful, amused
- Peak: genuine worry or hope, not excitement
- Pauses = processing emotion, not data
`,

    editorGuidance: `
**INTIMATE QUALITY CHECKS:**
- Does it feel like overhearing two friends?
- Are personal stories woven in (not just data)?
- Are there vulnerable moments?
- Does the topic connect to speakers' own lives?
- Strip clinical or detached language
`,

    allowedEmotions: ['warm', 'reflective', 'vulnerable', 'concerned', 'hopeful', 'grateful', 'thoughtful', 'amused', 'friendly', 'curious', 'satisfied'],
    avoidEmotions: ['analytical', 'precise', 'authoritative', 'professional', 'emphatic'],
    defaultArcTemplate: 'narrative-adventure',
  },

  // ─── COMEDIC ─────────────────────────────────────────────────────────
  comedic: {
    id: 'comedic',
    label: 'Comedic',
    icon: '😂',
    description: 'Entertainment-first. Laughs and learning in equal measure.',
    references: 'Think: Conan O\'Brien Needs a Friend, SmartLess, No Such Thing as a Fish, My Brother My Brother and Me',

    writerGuidance: `
═══ COMEDIC STYLE — Entertainment that happens to be informative ═══

Primary goal is ENTERTAINMENT. Speakers are genuinely funny, tease each other, go on
ridiculous tangents, and make the listener laugh while accidentally learning something.

**THE COMEDIC VOICE:**
- Speakers tease each other: "Oh, you think you're an expert now?" / "Says the person who..."
- They exaggerate for comedy: "So basically the entire economy runs on... vibes?"
- They make absurd comparisons: "That's like saying my cat could run a Fortune 500 company"
- They have running jokes and callbacks
- They're self-deprecating: "I'm going to pretend I understood that"

✅ GOOD:
  A: "Okay so apparently, and I cannot stress this enough, they spent 400 million dollars on this."
  B: "Four hundred million. With an M."
  A: "With an M. And you know what they got for it?"
  B: "Please tell me it's something good."
  A: "A website that crashes every Tuesday."
  B: "Every Tuesday specifically?"
  A: "Every. Single. Tuesday. Nobody knows why."
  B: "I love that. 'Sorry boss, it's Tuesday again.' That should be a t-shirt."

❌ BAD:
  A: "Here's a funny fact!"
  B: "Ha ha, that's hilarious!"

**REGISTER:** Playful, irreverent, quick-witted. Short punchy turns for timing. Sarcasm, exaggeration, gentle roasting. Humor is EARNED from the material, not forced.
`,

    directorGuidance: `
**COMEDIC STYLE FIXES:**
- If humor feels forced, rewrite so comedy emerges from the material
- If speakers never tease each other, add playful jabs
- If all jokes no substance, ensure each comedic section delivers a real insight
- Add comedic timing: setup → beat → punchline → reaction
- Add running jokes that pay off later
`,

    voiceDirectorGuidance: `
**COMEDIC EMOTIONAL REGISTER:**
- Baseline: playful, energetic, amused
- Appropriate: amused, playful, surprised, energized, warm, friendly, curious
- Peak: genuine laughter energy, not performed excitement
- Pacing supports comedy: quick exchanges for banter, pauses for punchlines
`,

    editorGuidance: `
**COMEDIC QUALITY CHECKS:**
- Is humor specific to the topic (not generic)?
- Do comedic moments also deliver real information?
- Are there running jokes or callbacks?
- Do speakers tease each other naturally?
- Strip "Ha ha, that's so funny!" — if it's funny, the listener knows
`,

    allowedEmotions: ['amused', 'playful', 'surprised', 'energized', 'warm', 'friendly', 'curious', 'excited', 'intrigued'],
    avoidEmotions: ['professional', 'analytical', 'precise', 'measured', 'concerned', 'authoritative'],
    defaultArcTemplate: 'narrative-adventure',
  },

  // ─── LIFESTYLE ───────────────────────────────────────────────────────
  lifestyle: {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: '🌎',
    description: 'Travel, food, cities, family, recommendations. Practical + vivid + personal experience.',
    references: 'Think: Travel podcasts, food shows, city guides. Anthony Bourdain meets practical planning.',

    writerGuidance: `
═══ LIFESTYLE STYLE — Practical advice wrapped in vivid storytelling ═══

This is about REAL experiences and USEFUL information. Speakers share practical tips grounded
in research (prices, logistics, specific venues) while painting vivid pictures of what it's
actually like to be there. The listener should feel like they're getting advice from a
well-traveled friend who did the homework.

**THE LIFESTYLE VOICE:**
- Speakers share specific, actionable details: "The 7-seater rental runs about $88/day" / "Book the 9am slot, it's half the crowd"
- They paint scenes: "Imagine you're walking through this market, the smell of spices hits you, and then you turn the corner and..."
- They balance practical with experiential: logistics AND what it FEELS like
- They share personal tips from experience: "What I wish someone had told me is..."
- They compare options honestly: "The hotel is gorgeous but honestly, for families, the Airbnb makes more sense because..."

✅ GOOD:
  A: "So here's the thing about the Dubai Mall that nobody tells you. Yes, it's massive. But if you go in without a plan, you'll spend three hours just walking and the kids will melt down."
  B: "I learned that the hard way in Bangkok. The trick is to pick ONE anchor attraction and build around it. In this case, the aquarium is the move — it's right on the ground floor, the kids are mesmerized, and there's a food court thirty seconds away for when someone inevitably gets hangry."
  A: "And the timing matters. If you go before 11am, it's practically empty. After 2pm on a Friday? Forget it."
  B: "That's a pro tip right there. But here's what I'd add — the aquarium has a behind-the-scenes tour that costs about $40 extra per person. For the 9-year-old? Worth every penny. For the toddler? Save your money."

❌ BAD:
  A: "The Dubai Mall is amazing!"
  B: "¡Increíble! It's so big!"
  A: "And there's an aquarium!"
  B: "¡No me digas! That sounds incredible!"

**STRUCTURE:**
- Open with the real question the listener has: "How do you actually DO this?"
- Organize by DECISIONS, not categories: "The first choice you need to make is..."
- Include specific prices, times, booking tips — the stuff that actually helps
- Share what went wrong too: "The mistake most people make is..."
- End with a concrete action plan or top 3 tips

**REGISTER:**
- Warm but substantive — not a brochure, not a spreadsheet
- Both speakers contribute tips and experiences (not one expert + one reactor)
- Honest about trade-offs: "It's beautiful but overpriced" / "Skip the tourist trap, here's the local spot"
- Enthusiasm is grounded in specifics, not generic hype
`,

    directorGuidance: `
**LIFESTYLE STYLE FIXES:**
- If it reads like a travel brochure (all positive, no specifics), add honest trade-offs and real prices
- If one speaker is just reacting with "¡Qué padre!", give them their own tips and experiences
- If organized as a listicle (transport, then food, then activities), restructure around decisions and scenarios
- Add "what I wish I'd known" moments and common mistakes to avoid
- Ensure specific, actionable details: prices, times, booking tips, alternatives
`,

    voiceDirectorGuidance: `
**LIFESTYLE EMOTIONAL REGISTER:**
- Baseline: warm, enthusiastic but grounded, like a knowledgeable friend
- Appropriate: warm, curious, amused, energized, friendly, intrigued, satisfied
- Peak: genuine excitement about a great discovery or tip, not performed hype
- Pacing: conversational, slightly faster when sharing exciting finds, slower for practical details
`,

    editorGuidance: `
**LIFESTYLE QUALITY CHECKS:**
- Are there specific prices, times, and booking details?
- Do BOTH speakers contribute practical tips (not one expert + one hype machine)?
- Are trade-offs discussed honestly (not everything is "amazing")?
- Is it organized around decisions/scenarios, not a topic checklist?
- Would the listener actually be able to plan from this information?
- Strip generic enthusiasm — replace with specific reasons WHY something is good
`,

    allowedEmotions: ['warm', 'curious', 'amused', 'energized', 'friendly', 'intrigued', 'satisfied', 'excited', 'thoughtful', 'surprised'],
    avoidEmotions: ['analytical', 'precise', 'professional', 'authoritative', 'concerned'],
    defaultArcTemplate: 'narrative-adventure',
  },

  // ─── EXPLAINER ───────────────────────────────────────────────────────
  explainer: {
    id: 'explainer',
    label: 'Explainer',
    icon: '📐',
    description: 'How things work, tutorials, step-by-step. Patient, clear, building understanding.',
    references: 'Think: Stuff You Should Know, Explain Like I\'m 5, Kurzgesagt style, 3Blue1Brown',

    writerGuidance: `
═══ EXPLAINER STYLE — Making complex things click ═══

The goal is UNDERSTANDING. One speaker might know more, but both are working together to make
a concept clear. The listener should have genuine "aha" moments where something clicks.

**THE EXPLAINER VOICE:**
- Speakers build understanding step by step: "Okay, so first you need to understand X. Once you have that, Y makes sense."
- They use analogies constantly: "Think of it like a highway — the data packets are cars, and bandwidth is the number of lanes"
- They check understanding: "Does that make sense so far?" / "Wait, let me make sure I'm following..."
- They celebrate clarity: "OH. So THAT'S why..." / "Okay, now it clicks."
- They simplify without dumbing down: complex ideas in simple language, not simple ideas

✅ GOOD:
  A: "Okay, so machine learning sounds complicated, but at its core it's doing something really simple. Imagine you're teaching a kid to recognize dogs."
  B: "Like, showing them pictures?"
  A: "Exactly. You show them a thousand pictures — some dogs, some not. Each time they guess wrong, you correct them. After enough corrections, they get really good at it."
  B: "So the 'learning' is just... getting corrected a lot?"
  A: "That's literally it. The math is fancy, but the concept is: guess, check, adjust, repeat."
  B: "Okay, but then how does it go from recognizing dogs to, like, writing essays?"

❌ BAD:
  A: "Machine learning uses gradient descent to optimize a loss function across neural network layers."
  B: "Wow, that's complex! What else?"

**REGISTER:** Patient, clear, encouraging. Lots of analogies. "Aha" moments are the payoff. Both speakers participate in building understanding.
`,

    directorGuidance: `
**EXPLAINER STYLE FIXES:**
- If concepts are introduced without analogies, add them
- If one speaker is just lecturing, make the other ask genuine clarifying questions
- If steps are skipped, slow down: "Wait, back up — how does X connect to Y?"
- Add "aha" moments where understanding visibly clicks
- Ensure the explanation builds — each concept enables the next
`,

    voiceDirectorGuidance: `
**EXPLAINER EMOTIONAL REGISTER:**
- Baseline: clear, patient, warm, encouraging
- Appropriate: curious, clear, warm, encouraging, thoughtful, intrigued, satisfied
- Peak: the "aha" moment — genuine satisfaction when something clicks
- Pacing: steady, slightly slower for key concepts, faster for familiar ground
`,

    editorGuidance: `
**EXPLAINER QUALITY CHECKS:**
- Does each concept build on the previous one?
- Are there analogies for every complex idea?
- Are there genuine "aha" moments?
- Would someone unfamiliar with the topic actually understand this?
- Is the explanation patient without being condescending?
`,

    allowedEmotions: ['curious', 'clear', 'warm', 'encouraging', 'thoughtful', 'intrigued', 'satisfied', 'friendly', 'patient', 'amused'],
    avoidEmotions: ['authoritative', 'emphatic', 'concerned', 'skeptical', 'professional'],
    defaultArcTemplate: 'educational-explainer',
  },

  // ─── INVESTIGATIVE ───────────────────────────────────────────────────
  investigative: {
    id: 'investigative',
    label: 'Investigative',
    icon: '🔍',
    description: 'Skeptical deep-dives, debates. Challenge assumptions, build a case, follow the evidence.',
    references: 'Think: Freakonomics, Revisionist History, Intelligence Squared, The Argument',

    writerGuidance: `
═══ INVESTIGATIVE STYLE — Follow the evidence, challenge everything ═══

Speakers are building a CASE. They question assumptions, follow evidence trails, debate
interpretations, and aren't afraid to disagree. The listener should feel like they're
watching a mystery unfold or a debate sharpen.

**THE INVESTIGATIVE VOICE:**
- Speakers question the obvious: "Everyone assumes X, but what if that's wrong?"
- They follow evidence: "So I dug into the actual data, and here's what I found..."
- They debate genuinely: "I disagree. Here's why..." / "That's one reading, but consider..."
- They build a case step by step: "First this, then this, and when you put it together..."
- They're comfortable with unresolved tension: "I still think you're wrong about that."

✅ GOOD:
  A: "The official story is that this failed because of poor execution. But I don't buy it."
  B: "Why not? The timeline supports it — they were behind schedule from day one."
  A: "Sure, but look at who was making the decisions. The same team succeeded with a harder project two years earlier. Same people, same resources. So what changed?"
  B: "The regulatory environment. But I'd argue that's still an execution problem — they should have anticipated it."
  A: "Or... the real problem was something nobody wants to talk about."
  B: "Go on."

❌ BAD:
  A: "This failed."
  B: "Oh no! Why?"
  A: "Poor execution."
  B: "That makes sense! What else?"

**REGISTER:** Skeptical, probing, direct. Genuine disagreement that isn't always resolved. Building tension and revealing layers. Humor is dry and pointed.
`,

    directorGuidance: `
**INVESTIGATIVE STYLE FIXES:**
- If speakers agree on everything, add genuine disagreement on interpretation
- If the case is presented linearly, add twists: "But then I found something that changes the picture..."
- If no assumptions are challenged, add "What if the conventional wisdom is wrong?"
- Leave some tensions UNRESOLVED — not everything needs a neat answer
- Add layers: surface explanation → deeper cause → even deeper cause
`,

    voiceDirectorGuidance: `
**INVESTIGATIVE EMOTIONAL REGISTER:**
- Baseline: focused, probing, engaged
- Appropriate: intrigued, skeptical, thoughtful, focused, curious, emphatic, concerned
- Peak: the reveal — when evidence points somewhere unexpected
- Pacing: builds tension, slows for key revelations
`,

    editorGuidance: `
**INVESTIGATIVE QUALITY CHECKS:**
- Are assumptions being challenged, not just accepted?
- Is there genuine disagreement (not just devil's advocate)?
- Does the case build in layers?
- Are there unresolved tensions?
- Does the listener feel like they're discovering something?
`,

    allowedEmotions: ['intrigued', 'skeptical', 'thoughtful', 'focused', 'curious', 'emphatic', 'concerned', 'surprised', 'analytical', 'measured'],
    avoidEmotions: ['warm', 'playful', 'grateful', 'friendly', 'amused'],
    defaultArcTemplate: 'narrative-adventure',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the style profile for a given style ID.
 * Falls back to 'narrative' if the style is not recognized.
 */
export function getStyleProfile(style?: string): StyleProfile {
  if (style && style in STYLE_PROFILES) {
    return STYLE_PROFILES[style as PodcastStyle];
  }
  return STYLE_PROFILES.narrative;
}

/**
 * Get the children's audience overlay guidance for a specific stage.
 * Returns empty string if audience is not children.
 */
export function getChildrenOverlay(audience?: string, stage?: 'writer' | 'director' | 'voiceDirector' | 'editor'): string {
  const isChildren = audience?.toLowerCase() === 'children' || audience?.toLowerCase() === 'kids';
  if (!isChildren || !stage) return '';

  switch (stage) {
    case 'writer': return CHILDREN_AUDIENCE_OVERLAY.writerOverlay;
    case 'director': return CHILDREN_AUDIENCE_OVERLAY.directorOverlay;
    case 'voiceDirector': return CHILDREN_AUDIENCE_OVERLAY.voiceDirectorOverlay;
    case 'editor': return CHILDREN_AUDIENCE_OVERLAY.editorOverlay;
    default: return '';
  }
}

/**
 * Infer the best podcast style from a preset's existing config fields.
 * Used for backwards compatibility when presets don't have an explicit podcastStyle.
 */
export function inferStyleFromPreset(preset: {
  tone?: string;
  podcastFormat?: string;
  audience?: string;
  debateIntensity?: string;
  humorLevel?: string;
  emotionalIntensity?: string;
  technicalDepth?: string;
}): PodcastStyle {
  const tone = preset.tone?.toLowerCase() || '';
  const format = preset.podcastFormat?.toLowerCase() || '';
  const audience = preset.audience?.toLowerCase() || '';
  const humor = preset.humorLevel?.toLowerCase() || '';
  const depth = preset.technicalDepth?.toLowerCase() || '';
  const emotion = preset.emotionalIntensity?.toLowerCase() || '';
  const debate = preset.debateIntensity?.toLowerCase() || '';

  // Clinical: medical-related
  if (tone === 'clinical' || format === 'medical') {
    return 'clinical';
  }

  // Analytical: analytical tone, expert depth, technical audience
  if (tone === 'analytical' || (audience === 'technical' && depth === 'expert')) {
    return 'analytical';
  }

  // Academic: scholarly, research-oriented
  if (tone === 'skeptical' || (audience === 'professionals' && depth === 'expert')) {
    return 'academic';
  }

  // Investigative: debate format, adversarial, skeptical
  if (format === 'debate' || debate === 'adversarial' || debate === 'balanced-debate') {
    return 'investigative';
  }

  // Editorial: professional tone, dense info, subdued emotion
  if (tone === 'professional' || tone === 'formal' || (audience === 'executives' && emotion === 'subdued')) {
    return 'editorial';
  }

  // Comedic: energetic tone, frequent humor
  if (tone === 'energetic' || humor === 'frequent' || format === 'comedy') {
    return 'comedic';
  }

  // Intimate: narrative tone, very expressive emotion
  if (tone === 'inspirational' || emotion === 'very-expressive') {
    return 'intimate';
  }

  // Explainer: educational tone
  if (tone === 'educational' || audience === 'students') {
    return 'explainer';
  }

  // Lifestyle: conversational + stories + general audience
  if (tone === 'conversational' && audience === 'general') {
    return 'lifestyle';
  }

  // Default: narrative
  return 'narrative';
}
