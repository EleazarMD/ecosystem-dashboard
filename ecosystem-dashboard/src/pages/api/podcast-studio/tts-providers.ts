/**
 * Shared TTS Provider Functions
 * Used by both voice-preview and generate-audio endpoints
 *
 * ARCHITECTURE: All TTS calls MUST route through AI Gateway
 * - Never call provider APIs directly
 * - AI Gateway handles: routing, monitoring, rate limiting, caching, failover
 * 
 * EMOTION/PROSODY SUPPORT:
 * - For Qwen TTS: Uses 'instruct' parameter to guide voice performance
 * - For Gemini/OpenAI: Emotion markers embedded in text (e.g., [pause], *emphasis*)
 */

// Cache for Google API key to avoid repeated HTTP calls
let cachedGoogleApiKey: string | null = null;
let cacheExpiry: number = 0;

/**
 * Fetch Google API key from AI Inferencing service via HTTP
 * Uses the same endpoint as AI Gateway's AIInferencingClient
 */
async function getGoogleApiKey(): Promise<string> {
  // Return cached key if still valid (cache for 5 minutes)
  if (cachedGoogleApiKey && Date.now() < cacheExpiry) {
    return cachedGoogleApiKey;
  }

  const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';
  const AI_INFERENCING_API_KEY = process.env.AI_INFERENCING_API_KEY || 'ai-inferencing-admin-key-2024';

  // Try podcast-studio first, then ecosystem-dashboard
  const serviceIds = ['podcast-studio', 'ecosystem-dashboard'];
  
  for (const serviceId of serviceIds) {
    try {
      const url = `${AI_INFERENCING_URL}/api/v1/keys/${serviceId}/google`;
      console.log(`🔑 Fetching Google API key from AI Inferencing: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': AI_INFERENCING_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.apiKey) {
          // Cache the key for 5 minutes
          cachedGoogleApiKey = data.apiKey;
          cacheExpiry = Date.now() + 5 * 60 * 1000;
          console.log(`✅ Fetched Google API key from AI Inferencing (service: ${serviceId})`);
          return data.apiKey;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch key for ${serviceId}:`, error);
    }
  }

  throw new Error('Google API key not found in AI Inferencing. Add a Google key for podcast-studio or ecosystem-dashboard service.');
}

export interface TTSOptions {
  text: string;
  voice: string;
  provider: 'gemini' | 'openai' | 'qwen';
  speed?: number;
  pitch?: number;
  model?: string;
  // New: Emotion/prosody guidance for natural dialogue
  emotion?: string;      // e.g., "enthusiastic", "thoughtful", "warm"
  prosody?: string;      // e.g., "building excitement", "slower, deliberate"
  instruct?: string;     // Direct instruction for Qwen TTS
}

/**
 * Retry helper with exponential backoff for overloaded models
 * Increased retries and delays for Gemini TTS rate limits (429 errors)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRateLimited =
        lastError.message?.includes('overloaded') ||
        lastError.message?.includes('429') ||
        lastError.message?.includes('rate limit') ||
        lastError.message?.includes('RESOURCE_EXHAUSTED') ||
        lastError.message?.includes('quota');

      if (!isRateLimited || attempt === maxRetries - 1) {
        throw lastError;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ TTS rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Convert raw PCM audio data to WAV format
 */
function pcmToWav(
  pcmData: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(fileSize, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmData]);
}

/**
 * Build emotion instruction string for TTS
 * Uses vivid, role-based descriptions that Qwen3-TTS responds to best.
 * Qwen3-TTS produces more natural speech with scenario-based prompts
 * ("podcast host chatting with a friend") vs abstract adjectives ("with warmth").
 */
function buildEmotionInstruct(emotion?: string, prosody?: string, language?: string): string {
  const isSpanish = language?.toLowerCase() === 'spanish';
  
  // BASELINE: Vivid role-based instruction, not abstract adjectives
  // Qwen3-TTS needs a character/scenario to anchor its delivery
  const baselineEn = 'Casual podcast host chatting with a friend over coffee: relaxed, natural rhythm with real pauses and varied pacing';
  const baselineEs = 'Conductor de podcast mexicano platicando con un amigo tomando café: ritmo relajado y natural con pausas reales y entonación variada';
  const baseline = isSpanish ? baselineEs : baselineEn;
  
  if (!emotion) {
    return baseline;
  }
  
  // Map emotions to vivid SCENARIO-BASED delivery descriptions
  // Qwen3-TTS responds to role-playing and character descriptions, not adjective lists
  const emotionHintsEn: Record<string, string> = {
    // Warm/opening emotions
    'warm': 'Friendly podcast host welcoming listeners like old friends: genuine smile in the voice, unhurried and inviting',
    'friendly': 'Two friends catching up: easy laughter ready, relaxed and genuinely happy to be talking',
    'curious': 'Podcast host who just discovered something fascinating: leaning forward, eyebrows raised, genuinely wanting to know more',
    'intrigued': 'Someone hearing an interesting story for the first time: engaged, slightly surprised, wanting details',
    // Exploration/engaged emotions
    'thoughtful': 'Host pausing to really think about what was just said: slower pace, considering each word, processing out loud',
    'interested': 'Engaged listener in a great conversation: nodding along, making small reactions, fully present',
    'amused': 'Host who just heard something unexpectedly funny: slight chuckle in the voice, light and playful',
    // Rising action emotions
    'energized': 'Podcast host getting excited as the story builds: pace picking up naturally, voice getting more animated',
    'surprised': 'Host reacting to an unexpected revelation: genuine "wait, really?" energy, slightly breathless',
    // Climax emotions (stronger delivery)
    'excited': 'Host at the best part of the story: can barely contain enthusiasm, speaking faster, voice bright and animated',
    'amazed': 'Someone who just had their mind blown: wide-eyed wonder, emphasis on key words, slight disbelief',
    'passionate': 'Host speaking about something they deeply care about: conviction in every word, measured intensity',
    'emphatic': 'Making an important point that the listener needs to hear: deliberate pacing, strong emphasis on key phrases',
    // Resolution emotions
    'reflective': 'Host winding down after a deep conversation: slower, contemplative, letting ideas settle',
    'satisfied': 'Wrapping up a great episode: content smile in the voice, warm and complete',
    'hopeful': 'Looking forward to possibilities: uplifted tone, genuine optimism without being cheesy',
    'grateful': 'Host genuinely thanking the audience: sincere, warm, unhurried',
    // Professional/academic emotions
    'professional': 'Experienced analyst explaining findings: clear, confident, measured but not stiff',
    'clear': 'Teacher making a complex point simple: deliberate pacing, emphasis on clarity',
    'focused': 'Expert zeroing in on the key detail: precise, no wasted words, direct',
    'precise': 'Scientist presenting data: careful with each word, methodical but not robotic',
    'analytical': 'Thoughtful analyst breaking down a problem: logical flow, connecting ideas step by step',
    'measured': 'Seasoned journalist delivering important news: steady, trustworthy, controlled pacing',
    'concerned': 'Host discussing something worrying: genuine concern, slightly lower pitch, serious but not alarmist',
    'authoritative': 'Expert speaking from deep knowledge: confident, grounded, commanding attention naturally',
    // Educational emotions
    'encouraging': 'Mentor helping someone understand: patient, supportive, celebrating small victories',
    'patient': 'Teacher explaining something for the second time: no frustration, genuinely wanting the listener to get it',
    // Neutral fallbacks
    'neutral': baseline,
    'conversational': baseline,
  };
  
  const emotionHintsEs: Record<string, string> = {
    'warm': 'Conductor de podcast dando la bienvenida como a viejos amigos: sonrisa genuina en la voz, sin prisa y acogedor',
    'friendly': 'Dos amigos poniéndose al día: risa fácil, relajados y contentos de estar platicando',
    'curious': 'Conductor que acaba de descubrir algo fascinante: inclinándose hacia adelante, genuinamente queriendo saber más',
    'intrigued': 'Alguien escuchando una historia interesante por primera vez: enganchado, ligeramente sorprendido',
    'thoughtful': 'Conductor haciendo pausa para pensar en lo que se dijo: ritmo más lento, considerando cada palabra',
    'interested': 'Oyente enganchado en una gran conversación: asintiendo, haciendo pequeñas reacciones, totalmente presente',
    'amused': 'Conductor que escuchó algo inesperadamente gracioso: ligera risa en la voz, ligero y juguetón',
    'energized': 'Conductor emocionándose mientras la historia crece: ritmo acelerando naturalmente, voz más animada',
    'surprised': 'Conductor reaccionando a una revelación inesperada: energía genuina de "espera, en serio?", ligeramente sin aliento',
    'excited': 'Conductor en la mejor parte de la historia: apenas puede contener el entusiasmo, hablando más rápido',
    'amazed': 'Alguien a quien le acaban de volar la mente: asombro con ojos abiertos, énfasis en palabras clave',
    'passionate': 'Conductor hablando de algo que le importa profundamente: convicción en cada palabra',
    'emphatic': 'Haciendo un punto importante: ritmo deliberado, énfasis fuerte en frases clave',
    'reflective': 'Conductor cerrando después de una conversación profunda: más lento, contemplativo',
    'satisfied': 'Cerrando un gran episodio: sonrisa contenta en la voz, cálido y completo',
    'hopeful': 'Mirando hacia las posibilidades: tono elevado, optimismo genuino',
    'grateful': 'Conductor agradeciendo genuinamente a la audiencia: sincero, cálido, sin prisa',
    'professional': 'Analista experimentado explicando hallazgos: claro, confiado, mesurado pero no rígido',
    'clear': 'Maestro haciendo simple un punto complejo: ritmo deliberado, énfasis en claridad',
    'focused': 'Experto enfocándose en el detalle clave: preciso, sin palabras de más, directo',
    'precise': 'Científico presentando datos: cuidadoso con cada palabra, metódico pero no robótico',
    'analytical': 'Analista reflexivo desglosando un problema: flujo lógico, conectando ideas paso a paso',
    'measured': 'Periodista experimentado dando noticias importantes: estable, confiable, ritmo controlado',
    'concerned': 'Conductor discutiendo algo preocupante: preocupación genuina, tono ligeramente más grave',
    'authoritative': 'Experto hablando desde conocimiento profundo: confiado, sólido, comandando atención naturalmente',
    'encouraging': 'Mentor ayudando a alguien a entender: paciente, solidario, celebrando pequeños logros',
    'patient': 'Maestro explicando algo por segunda vez: sin frustración, genuinamente queriendo que el oyente entienda',
    'neutral': baseline,
    'conversational': baseline,
  };
  
  const hintMap = isSpanish ? emotionHintsEs : emotionHintsEn;
  const hint = hintMap[emotion.toLowerCase()];
  
  // Phase baseline (from audioDirection) provides orchestration context
  // Map to vivid scenario descriptions that Qwen3-TTS can act on
  const phaseBaselineHintsEn: Record<string, string> = {
    'warm-curious': 'opening a conversation with genuine interest',
    'engaged-building': 'getting deeper into a fascinating topic, building momentum',
    'intensifying': 'the story is getting really good, energy rising naturally',
    'peak-intensity': 'the most exciting part of the conversation, fully animated',
    'settling-reflective': 'winding down, letting the big ideas settle in',
    'professional-warm': 'expert who is also genuinely personable',
    'precise-measured': 'careful analyst being exact with important details',
    'engaged-authoritative': 'knowledgeable host fully in their element',
    'considered-emphasis': 'making a point that really matters, with weight',
    'curious-inviting': 'drawing the listener in with genuine curiosity',
    'clear-patient': 'making sure everyone follows along, no rush',
    'engaged-focused': 'locked in on the topic, fully present',
    'illuminating': 'the moment where everything clicks into place',
    'warm-encouraging': 'supportive and uplifting, like a good mentor',
    'warm-professional': 'approachable expert, friendly but knowledgeable',
    'engaged-curious': 'actively exploring ideas, asking real questions',
    'dynamic-responsive': 'reacting naturally to what the other person says',
    'focused-impactful': 'delivering the key takeaway with conviction',
    'warm-grateful': 'genuinely thankful, wrapping up with heart',
  };
  const phaseBaselineHintsEs: Record<string, string> = {
    'warm-curious': 'abriendo una conversación con interés genuino',
    'engaged-building': 'profundizando en un tema fascinante, construyendo momentum',
    'intensifying': 'la historia se pone buena, la energía sube naturalmente',
    'peak-intensity': 'la parte más emocionante de la conversación, totalmente animado',
    'settling-reflective': 'cerrando, dejando que las grandes ideas se asienten',
    'professional-warm': 'experto que también es genuinamente accesible',
    'precise-measured': 'analista cuidadoso siendo exacto con detalles importantes',
    'engaged-authoritative': 'conductor conocedor totalmente en su elemento',
    'considered-emphasis': 'haciendo un punto que realmente importa, con peso',
  };
  
  // If we have a specific emotion hint, use it directly (it's already a full scenario)
  if (hint && hint !== baseline) {
    // If we also have a phase baseline, append it as context
    if (prosody) {
      const phaseHintMap = isSpanish ? phaseBaselineHintsEs : phaseBaselineHintsEn;
      const phaseHint = phaseHintMap[prosody.toLowerCase()];
      if (phaseHint) {
        return `${hint} — ${phaseHint}`;
      }
    }
    return hint;
  }
  
  // If we only have a phase baseline, combine with the baseline character
  if (prosody) {
    const phaseHintMap = isSpanish ? phaseBaselineHintsEs : phaseBaselineHintsEn;
    const phaseHint = phaseHintMap[prosody.toLowerCase()];
    if (phaseHint) {
      return `${baseline} — ${phaseHint}`;
    }
  }
  
  return baseline;
}

/**
 * Main TTS generation function with emotion support
 */
export async function generateTTS(
  text: string,
  voice: string,
  provider: 'gemini' | 'openai' | 'qwen',
  speed = 1.0,
  pitch = 0,
  model?: string,
  emotion?: string,
  prosody?: string,
  language?: string
): Promise<Buffer> {
  // Build emotion instruction in the target language
  const emotionInstruct = buildEmotionInstruct(emotion, prosody, language);
  
  if (emotion || prosody) {
    console.log(`🎭 Emotion guidance: "${emotionInstruct}"`);
  }

  if (provider === 'qwen') {
    return await generateQwenTTS(text, voice, speed, emotionInstruct, language);
  } else if (provider === 'gemini') {
    return await generateGeminiTTS(text, voice, speed, pitch, model, emotionInstruct, language);
  } else {
    return await generateOpenAITTS(text, voice, speed);
  }
}

/**
 * Qwen TTS via local vLLM endpoint
 * Uses 'instruct' parameter for emotion/style guidance
 */
async function generateQwenTTS(
  text: string,
  voice: string,
  speed: number,
  instruct?: string,
  language?: string
): Promise<Buffer> {
  const qwenTTSUrl = process.env.QWEN_TTS_API || 'http://100.108.41.22:4200';
  const isSpanish = language?.toLowerCase() === 'spanish';
  
  // Map language to Qwen TTS language parameter
  const ttsLanguage = isSpanish ? 'Spanish' : language?.toLowerCase() === 'english' ? 'English' : 'Auto';
  
  // For Spanish content, anchor the instruct to Mexican Spanish accent
  // This is critical: without explicit accent guidance, Qwen reads Spanish text with English pronunciation
  let finalInstruct = instruct || (isSpanish 
    ? 'Conductor de podcast mexicano platicando con un amigo tomando café: ritmo relajado y natural con pausas reales y entonación variada' 
    : 'Casual podcast host chatting with a friend over coffee: relaxed, natural rhythm with real pauses and varied pacing');
  if (isSpanish && !finalInstruct.toLowerCase().includes('mexicano')) {
    finalInstruct = `Acento mexicano natural, como platicando entre amigos. ${finalInstruct}`;
  }
  
  console.log(`🎤 Using Qwen TTS: ${qwenTTSUrl}`);
  console.log(`   Language: ${ttsLanguage}, Voice: ${voice}`);
  if (finalInstruct) {
    console.log(`   Instruct: "${finalInstruct}"`);
  }

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${qwenTTSUrl}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_id: voice || (isSpanish ? 'mexican_male_warm' : 'american_male_refined'),
        instruct: finalInstruct,
        language: ttsLanguage,
        temperature: 0.85,
        top_p: 0.92,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Qwen TTS error:', errorText);
      throw new Error(`Qwen TTS failed (${res.status}): ${errorText}`);
    }

    return res;
  }, 3, 2000);

  console.log('✅ Qwen TTS succeeded');
  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Check if it's WAV or PCM and convert if needed
  const isPCM = !audioBuffer.toString('ascii', 0, 4).includes('RIFF');
  if (isPCM) {
    console.log('🔄 Converting PCM to WAV');
    return pcmToWav(audioBuffer, 24000, 1, 16);
  }

  return audioBuffer;
}

/**
 * Gemini TTS via Google Generative Language API (direct)
 * Calls the Gemini TTS model directly — no AI Gateway needed.
 * Returns WAV audio buffer.
 */
async function generateGeminiTTS(
  text: string,
  voice: string,
  speed: number,
  pitch: number,
  model?: string,
  emotionInstruct?: string,
  language?: string
): Promise<Buffer> {
  const ttsModel = model || 'gemini-2.5-flash-preview-tts';
  
  // Fetch API key from AI Inferencing (with env fallback for local dev)
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  
  if (!apiKey) {
    try {
      apiKey = await getGoogleApiKey();
    } catch (error) {
      console.error('❌ Failed to fetch Google API key from AI Inferencing:', error);
      throw new Error('Google API key not available. Configure in AI Inferencing or set GEMINI_API_KEY env var.');
    }
  }

  console.log(`🎤 Using Gemini TTS (${ttsModel}), voice: ${voice}, key: ${apiKey.substring(0, 15)}...`);
  if (emotionInstruct) {
    console.log(`   Emotion hint: "${emotionInstruct}"`);
  }

  // Gemini TTS doesn't support a 'style' field in speechConfig.
  // Instead, embed emotion/prosody guidance as a natural language prefix in the text.
  // IMPORTANT: For non-English languages, the prefix MUST be in the same language
  // to prevent Gemini from switching accents (e.g., Spaniard vs Mexican Spanish).
  let ttsText = text;
  const isSpanish = language?.toLowerCase() === 'spanish';
  
  // Build pace instruction based on speed parameter
  // Gemini TTS uses natural language for speed control
  let paceHint = '';
  if (speed >= 1.3) {
    paceHint = isSpanish ? '[ritmo rápido] ' : '[speak quickly] ';
  } else if (speed >= 1.15) {
    paceHint = isSpanish ? '[ritmo ligeramente rápido] ' : '[speak at a slightly faster pace] ';
  } else if (speed <= 0.85) {
    paceHint = isSpanish ? '[ritmo lento] ' : '[speak slowly] ';
  } else if (speed <= 0.95) {
    paceHint = isSpanish ? '[ritmo ligeramente lento] ' : '[speak at a slightly slower pace] ';
  }
  // Default speed (0.95-1.15) = natural pace, no hint needed
  
  if (isSpanish && emotionInstruct) {
    // All-Spanish prefix to keep the model locked to Mexican Spanish accent
    ttsText = `[Acento mexicano] ${paceHint}${emotionInstruct}: ${text}`;
  } else if (isSpanish) {
    // Even without emotion, hint Mexican accent to prevent drift
    ttsText = `[Acento mexicano] ${paceHint}${text}`;
  } else if (emotionInstruct) {
    ttsText = `${paceHint}${emotionInstruct}: ${text}`;
  } else if (paceHint) {
    ttsText = `${paceHint}${text}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent`;

  const response = await retryWithBackoff(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: ttsText }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Gemini TTS error:', errorText);
      throw new Error(`Gemini TTS failed (${res.status}): ${errorText}`);
    }

    return res;
  }, 3, 2000);

  const data = await response.json();

  // Extract base64-encoded audio from Gemini response
  const candidates = data.candidates || [];
  if (!candidates.length) {
    throw new Error('Gemini TTS returned no candidates');
  }

  const parts = candidates[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
      console.log(`✅ Gemini TTS succeeded: ${pcmBuffer.length} bytes PCM`);
      // Gemini TTS returns raw PCM at 24kHz 16-bit mono — convert to WAV
      return pcmToWav(pcmBuffer, 24000, 1, 16);
    }
  }

  throw new Error('Gemini TTS response contained no audio data');
}

/**
 * OpenAI TTS via AI Gateway
 */
async function generateOpenAITTS(
  text: string,
  voice: string,
  speed: number
): Promise<Buffer> {
  const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
  const aiGatewayKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

  console.log(`🎤 Using OpenAI TTS via AI Gateway: ${aiGatewayUrl}`);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${aiGatewayUrl}/api/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': aiGatewayKey,
      },
      body: JSON.stringify({
        text,
        voice,
        speed,
        model: 'tts-1-hd',
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ AI Gateway TTS error:', errorText);
      throw new Error(`AI Gateway TTS failed (${res.status}): ${errorText}`);
    }

    return res;
  }, 3, 2000);

  console.log('✅ AI Gateway OpenAI TTS succeeded');
  return Buffer.from(await response.arrayBuffer());
}
