import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { createAudioGeneration, updateAudioGenerationStatus } from '@/lib/db/podcast-studio-db';
import { getAssetById, type ProductionConfig } from '@/lib/sound-library';
import { generateTTS } from './tts-providers';
import { audioJobs, type AudioGenerationJob, type AudioPhase } from '@/lib/audio-generation-jobs';

interface VoiceAssignment {
  speakerId: string;
  voiceName: string;
  voiceId: string;
  voiceProvider: 'qwen' | 'gemini' | 'openai';
  gender: string;
  accent: string;
  speakingRate: number;
  pitch: number;
}

interface ConversationTurn {
  id: string;
  speaker: string;
  content: string;
  emotion?: string;
  prosody?: string;
  duration?: number;
}

interface Speaker {
  id: string;
  name: string;
  role: string;
}

// Get Qwen TTS endpoint from AI Inferencing database
async function getQwenTTSBaseUrl(): Promise<string> {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.AI_GATEWAY_DB || 'ai_gateway_db',
    user: process.env.POSTGRES_USER || 'eleazar',
    password: process.env.POSTGRES_PASSWORD || '',
  });

  const result = await pool.query(
    'SELECT base_url FROM provider_endpoints WHERE endpoint_id = $1 AND is_active = true',
    ['qwen-tts-clone']
  );
  await pool.end();
  
  if (!result.rows[0]?.base_url) {
    throw new Error('Qwen TTS endpoint not configured in AI Inferencing');
  }
  
  return result.rows[0].base_url;
}

// Safety net: strip any remaining script markers that TTS would read aloud.
// The prompts now instruct LLMs to use TTS-native punctuation (ellipses, em dashes,
// interjections) instead of markers, but this catches anything that slips through.
function sanitizeForTTS(text: string): string {
  let cleaned = text;
  // Remove bracket annotations: [pause], [beat], [laughs], [sighs], etc.
  cleaned = cleaned.replace(/\[\w+[\w\s]*\]/g, '');
  // Remove markdown bold first (before emphasis, since ** contains *)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  // Remove markdown emphasis: *word* or *multiple words* (keep the text inside)
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  // Remove parenthetical stage directions: (pauses), (laughing), etc.
  // But preserve normal parenthetical speech like "(which is crazy)" by only
  // matching single-word or two-word stage directions
  cleaned = cleaned.replace(/\(\s*(?:pause|pauses|beat|laughs?|laughing|sighs?|sighing|chuckles?|chuckling|gasps?|whispers?|whispering|clears throat|coughs?)\s*\)/gi, '');
  // Collapse multiple spaces into one
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

// Gemini-aware sanitizer: preserves Gemini-supported expression tags while
// stripping unsupported markers and markdown formatting.
// Supported tags: [laughing], [whispering], [sighing], [shouting],
// [speaking slowly], [sarcasm], [clears throat]
const GEMINI_SUPPORTED_TAGS = /\[(laughing|whispering|sighing|shouting|speaking slowly|sarcasm|clears throat|robotic)\]/gi;

function sanitizeForGeminiTTS(text: string): string {
  let cleaned = text;
  // Temporarily protect Gemini-supported tags
  const preserved: string[] = [];
  cleaned = cleaned.replace(GEMINI_SUPPORTED_TAGS, (match) => {
    preserved.push(match);
    return `__GEMINI_TAG_${preserved.length - 1}__`;
  });
  // Strip all other bracket annotations
  cleaned = cleaned.replace(/\[\w+[\w\s]*\]/g, '');
  // Restore Gemini-supported tags
  preserved.forEach((tag, i) => {
    cleaned = cleaned.replace(`__GEMINI_TAG_${i}__`, tag);
  });
  // Remove markdown bold/emphasis (keep text inside)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  // Remove parenthetical stage directions
  cleaned = cleaned.replace(/\(\s*(?:pause|pauses|beat|gasps?|coughs?)\s*\)/gi, '');
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  return cleaned.trim();
}

// Generate TTS for a single turn
async function generateTurnAudio(
  text: string,
  voiceId: string,
  speed: number,
  baseUrl: string,
  language?: string
): Promise<Buffer> {
  // Clean script markers before sending to TTS
  const cleanedText = sanitizeForTTS(text);
  console.log(`🎙️ Generating TTS for voice ${voiceId}: "${cleanedText.substring(0, 50)}..."`);
  
  // Map language to TTS language parameter
  const ttsLanguage = language === 'spanish' ? 'Spanish' : language === 'english' ? 'English' : 'Auto';
  
  const response = await fetch(`${baseUrl}/api/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanedText,
      voice_id: voiceId,
      language: ttsLanguage,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS failed for voice ${voiceId}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Mix music audio onto speech audio with fade-in/fade-out envelope
// Returns a new WAV buffer with music overlaid on speech
function mixMusicOntoSpeech(
  speechBuffer: Buffer,
  musicBuffer: Buffer,
  musicVolume: number = 0.3,
  fadeInMs: number = 3000,
  fadeOutMs: number = 2000,
  sampleRate: number = 24000,
  maxMusicDurationMs: number = 20000  // Limit music to 20 seconds by default
): Buffer {
  // Extract raw PCM data from both buffers
  const extractPCM = (buf: Buffer): { data: Buffer; dataOffset: number; dataSize: number } => {
    let offset = 12;
    while (offset < buf.length - 8) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        return { data: buf.subarray(offset + 8, offset + 8 + chunkSize), dataOffset: offset, dataSize: chunkSize };
      }
      offset += 8 + chunkSize;
    }
    return { data: Buffer.alloc(0), dataOffset: 0, dataSize: 0 };
  };

  const speech = extractPCM(speechBuffer);
  const music = extractPCM(musicBuffer);

  if (speech.dataSize === 0) return speechBuffer;
  if (music.dataSize === 0) return speechBuffer;

  // Work on a copy of the speech buffer
  const result = Buffer.from(speechBuffer);
  const speechStart = speech.dataOffset + 8;

  const fadeInSamples = Math.floor((fadeInMs / 1000) * sampleRate);
  const fadeOutSamples = Math.floor((fadeOutMs / 1000) * sampleRate);
  const musicSamples = music.dataSize / 2; // 16-bit samples
  const speechSamples = speech.dataSize / 2;
  
  // Limit music duration to maxMusicDurationMs (e.g., 20 seconds)
  const maxMusicSamples = Math.floor((maxMusicDurationMs / 1000) * sampleRate);

  // Mix music into speech, but only for the limited duration
  const mixLength = Math.min(speechSamples, musicSamples, maxMusicSamples);
  
  console.log(`🎵 Mixing intro music: ${Math.round(mixLength / sampleRate)}s of music onto ${Math.round(speechSamples / sampleRate)}s of speech`);

  for (let i = 0; i < mixLength; i++) {
    const speechSample = result.readInt16LE(speechStart + i * 2);
    let musicSample = music.data.readInt16LE(i * 2);

    // Apply volume
    musicSample = Math.round(musicSample * musicVolume);

    // Apply fade-in envelope
    if (i < fadeInSamples) {
      const fadeRatio = i / fadeInSamples;
      // Use smooth ease-in curve (quadratic)
      musicSample = Math.round(musicSample * fadeRatio * fadeRatio);
    }

    // Apply fade-out envelope near the end of the music mix
    const samplesFromEnd = mixLength - i;
    if (samplesFromEnd < fadeOutSamples) {
      const fadeRatio = samplesFromEnd / fadeOutSamples;
      musicSample = Math.round(musicSample * fadeRatio * fadeRatio);
    }

    // Mix (add with clipping protection)
    const mixed = Math.max(-32768, Math.min(32767, speechSample + musicSample));
    result.writeInt16LE(mixed, speechStart + i * 2);
  }

  return result;
}

// Simple WAV concatenation (assumes same format for all clips)
function concatenateWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error('No audio buffers to concatenate');
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  // Parse first WAV header to get format info
  const firstBuffer = buffers[0];
  const sampleRate = firstBuffer.readUInt32LE(24);
  const bitsPerSample = firstBuffer.readUInt16LE(34);
  const numChannels = firstBuffer.readUInt16LE(22);

  // Extract raw audio data from each WAV (skip 44-byte header)
  const audioDataChunks: Buffer[] = [];
  let totalDataSize = 0;

  for (const buffer of buffers) {
    // Find 'data' chunk
    let dataOffset = 12;
    while (dataOffset < buffer.length - 8) {
      const chunkId = buffer.toString('ascii', dataOffset, dataOffset + 4);
      const chunkSize = buffer.readUInt32LE(dataOffset + 4);
      
      if (chunkId === 'data') {
        const audioData = buffer.subarray(dataOffset + 8, dataOffset + 8 + chunkSize);
        audioDataChunks.push(audioData);
        totalDataSize += audioData.length;
        break;
      }
      dataOffset += 8 + chunkSize;
    }
  }

  // Create new WAV with concatenated data
  const headerSize = 44;
  const outputBuffer = Buffer.alloc(headerSize + totalDataSize);

  // Write WAV header
  outputBuffer.write('RIFF', 0);
  outputBuffer.writeUInt32LE(36 + totalDataSize, 4);
  outputBuffer.write('WAVE', 8);
  outputBuffer.write('fmt ', 12);
  outputBuffer.writeUInt32LE(16, 16); // fmt chunk size
  outputBuffer.writeUInt16LE(1, 20); // PCM format
  outputBuffer.writeUInt16LE(numChannels, 22);
  outputBuffer.writeUInt32LE(sampleRate, 24);
  outputBuffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
  outputBuffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
  outputBuffer.writeUInt16LE(bitsPerSample, 34);
  outputBuffer.write('data', 36);
  outputBuffer.writeUInt32LE(totalDataSize, 40);

  // Copy audio data
  let offset = headerSize;
  for (const chunk of audioDataChunks) {
    chunk.copy(outputBuffer, offset);
    offset += chunk.length;
  }

  return outputBuffer;
}

// Load audio file (MP3 or WAV) and convert to WAV buffer
async function loadAudioFile(filePath: string, volume: number = 1.0): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    console.log(`🎵 Loading audio file: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Audio file not found: ${fullPath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    console.log(`📁 Read ${fileBuffer.length} bytes from ${filePath}`);
    
    // Check if it's already a WAV file
    if (filePath.endsWith('.wav')) {
      console.log(`✅ File is already WAV format`);
      // Apply volume adjustment if needed
      if (volume !== 1.0) {
        return adjustWavVolume(fileBuffer, volume);
      }
      return fileBuffer;
    }
    
    // For MP3 files, we need to convert to WAV
    // Use ffmpeg for conversion
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const os = require('os');
    
    // First check if ffmpeg is available
    try {
      await execAsync('which ffmpeg');
    } catch {
      console.error(`❌ ffmpeg is not installed! Cannot convert MP3 to WAV.`);
      console.error(`   Please install ffmpeg: sudo apt install ffmpeg`);
      console.error(`   Or convert audio files to WAV format manually.`);
      return null;
    }
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-convert-'));
    const tempMp3 = path.join(tempDir, 'input.mp3');
    const tempWav = path.join(tempDir, 'output.wav');
    
    fs.writeFileSync(tempMp3, fileBuffer);
    console.log(`🔄 Converting MP3 to WAV with ffmpeg...`);
    
    // Convert MP3 to WAV with ffmpeg (mono, 24kHz to match TTS output)
    await execAsync(`ffmpeg -i "${tempMp3}" -ar 24000 -ac 1 -acodec pcm_s16le "${tempWav}" -y`, { timeout: 30000 });
    
    let wavBuffer = fs.readFileSync(tempWav);
    console.log(`✅ Converted to WAV: ${wavBuffer.length} bytes`);
    
    // Clean up temp files
    fs.unlinkSync(tempMp3);
    fs.unlinkSync(tempWav);
    fs.rmdirSync(tempDir);
    
    // Apply volume adjustment if needed
    if (volume !== 1.0) {
      wavBuffer = adjustWavVolume(wavBuffer, volume);
    }
    
    return wavBuffer;
  } catch (error) {
    console.error(`❌ Failed to load audio file ${filePath}:`, error);
    return null;
  }
}

// Adjust WAV volume
function adjustWavVolume(wavBuffer: Buffer, volume: number): Buffer {
  // Find data chunk
  let dataOffset = 12;
  while (dataOffset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
    
    if (chunkId === 'data') {
      // Create a copy of the buffer
      const result = Buffer.from(wavBuffer);
      
      // Adjust each 16-bit sample
      for (let i = dataOffset + 8; i < dataOffset + 8 + chunkSize; i += 2) {
        const sample = result.readInt16LE(i);
        const adjusted = Math.max(-32768, Math.min(32767, Math.round(sample * volume)));
        result.writeInt16LE(adjusted, i);
      }
      
      return result;
    }
    dataOffset += 8 + chunkSize;
  }
  
  return wavBuffer;
}

// Trim trailing silence from a WAV buffer
// Scans from the end of the audio data backwards to find where actual audio ends
function trimTrailingSilence(wavBuffer: Buffer, thresholdDb: number = -40): Buffer {
  // Convert dB threshold to linear amplitude (16-bit range)
  const thresholdLinear = Math.pow(10, thresholdDb / 20) * 32768;
  
  // Find data chunk
  let dataOffset = 12;
  let dataSize = 0;
  while (dataOffset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
    
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    dataOffset += 8 + chunkSize;
  }
  
  if (dataSize === 0) return wavBuffer;
  
  const audioStart = dataOffset + 8;
  const audioEnd = audioStart + dataSize;
  
  // Scan backwards from end to find last non-silent sample
  // Use a window of ~10ms (240 samples at 24kHz) to avoid cutting on single quiet samples
  const windowSize = 240; // ~10ms at 24kHz
  let lastLoudSample = audioEnd;
  
  for (let i = audioEnd - 2; i >= audioStart; i -= 2) {
    const sample = Math.abs(wavBuffer.readInt16LE(i));
    if (sample > thresholdLinear) {
      // Found audio — keep a small tail (~20ms) for natural decay
      lastLoudSample = Math.min(audioEnd, i + (windowSize * 2));
      // Align to 2-byte boundary (16-bit samples)
      lastLoudSample = lastLoudSample + (lastLoudSample % 2);
      break;
    }
  }
  
  const trimmedDataSize = lastLoudSample - audioStart;
  const silenceTrimmedMs = Math.round(((audioEnd - lastLoudSample) / 2) / 24); // samples to ms at 24kHz
  
  if (silenceTrimmedMs < 20) {
    // Less than 20ms of silence — not worth trimming
    return wavBuffer;
  }
  
  // Rebuild WAV with trimmed data
  const headerSize = audioStart; // Preserve original header (may be > 44 bytes)
  const newBuffer = Buffer.alloc(headerSize + trimmedDataSize);
  
  // Copy header
  wavBuffer.copy(newBuffer, 0, 0, headerSize);
  
  // Update RIFF size
  newBuffer.writeUInt32LE(headerSize - 8 + trimmedDataSize, 4);
  
  // Update data chunk size
  newBuffer.writeUInt32LE(trimmedDataSize, dataOffset + 4);
  
  // Copy trimmed audio data
  wavBuffer.copy(newBuffer, headerSize, audioStart, lastLoudSample);
  
  if (silenceTrimmedMs > 50) {
    console.log(`   ✂️ Trimmed ${silenceTrimmedMs}ms trailing silence`);
  }
  
  return newBuffer;
}

// Also trim leading silence (TTS sometimes adds a brief silence at the start)
function trimLeadingSilence(wavBuffer: Buffer, thresholdDb: number = -40): Buffer {
  const thresholdLinear = Math.pow(10, thresholdDb / 20) * 32768;
  
  let dataOffset = 12;
  let dataSize = 0;
  while (dataOffset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    dataOffset += 8 + chunkSize;
  }
  
  if (dataSize === 0) return wavBuffer;
  
  const audioStart = dataOffset + 8;
  const audioEnd = audioStart + dataSize;
  
  // Scan forward to find first non-silent sample
  let firstLoudSample = audioStart;
  for (let i = audioStart; i < audioEnd - 2; i += 2) {
    const sample = Math.abs(wavBuffer.readInt16LE(i));
    if (sample > thresholdLinear) {
      // Keep a tiny lead-in (~5ms) for natural attack
      firstLoudSample = Math.max(audioStart, i - 240);
      firstLoudSample = firstLoudSample - (firstLoudSample % 2); // align
      break;
    }
  }
  
  const leadSilenceMs = Math.round(((firstLoudSample - audioStart) / 2) / 24);
  if (leadSilenceMs < 20) return wavBuffer;
  
  const trimmedDataSize = audioEnd - firstLoudSample;
  const headerSize = audioStart;
  const newBuffer = Buffer.alloc(headerSize + trimmedDataSize);
  
  wavBuffer.copy(newBuffer, 0, 0, headerSize);
  newBuffer.writeUInt32LE(headerSize - 8 + trimmedDataSize, 4);
  newBuffer.writeUInt32LE(trimmedDataSize, dataOffset + 4);
  wavBuffer.copy(newBuffer, headerSize, firstLoudSample, audioEnd);
  
  if (leadSilenceMs > 50) {
    console.log(`   ✂️ Trimmed ${leadSilenceMs}ms leading silence`);
  }
  
  return newBuffer;
}

// Add silence between turns (creates a WAV buffer of silence)
function createSilence(durationMs: number, sampleRate: number = 24000): Buffer {
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Data is already zeros (silence)
  return buffer;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { script, voiceAssignments, speakers, productionConfig, projectId, scriptId, language, ttsModel, audioDirection, scriptMetadata } = req.body;
  const useGeminiTTS = ttsModel?.startsWith('gemini-');

  if (!script || !Array.isArray(script) || script.length === 0) {
    return res.status(400).json({ error: 'No script provided' });
  }

  if (!voiceAssignments || !Array.isArray(voiceAssignments)) {
    return res.status(400).json({ error: 'No voice assignments provided' });
  }

  // Create job ID and initialize job status
  const jobId = uuidv4();
  const audioId = uuidv4();
  
  // Estimate total generation time:
  // - Gemini: ~3s/turn (2s TTS + 800ms rate limit + overhead)
  // - Qwen: ~4s/turn (3-5s TTS + overhead)
  // - Assembly/mixing: ~5-10s
  // - File save + DB: ~3-5s
  const perTurnMs = useGeminiTTS ? 3000 : 4000;
  const ttsEstimateMs = script.length * perTurnMs;
  const postProcessMs = 12000; // assembly + mixing + save
  const estimatedTotalMs = ttsEstimateMs + postProcessMs;

  // Initialize job in the jobs store
  audioJobs.set(jobId, {
    status: 'pending',
    progress: 0,
    message: 'Initializing audio generation...',
    currentTurn: 0,
    totalTurns: script.length,
    phase: 'initializing' as AudioPhase,
    phaseDetail: 'Preparing TTS pipeline...',
    estimatedTotalMs,
    startedAt: Date.now(),
  });

  console.log('🎬 Starting async podcast audio generation');
  console.log(`   Job ID: ${jobId}`);
  console.log(`   Script turns: ${script.length}`);
  console.log(`   Voice assignments: ${voiceAssignments.length}`);
  console.log(`   Language: ${language || 'auto'}`);
  console.log(`   TTS Model: ${ttsModel || 'qwen-tts-base'}`);
  console.log(`   Provider: ${useGeminiTTS ? 'Gemini' : 'Qwen'}`);
  if (scriptMetadata) {
    console.log(`   Style: ${scriptMetadata.podcastStyle || 'unknown'} | Audience: ${scriptMetadata.audience || 'general'}`);
    console.log(`   Speakers: ${scriptMetadata.speakerProfiles?.map((s: any) => `${s.name} (${s.gender})`).join(', ') || 'unknown'}`);
  }

  // Return job ID immediately (202 Accepted)
  res.status(202).json({ jobId, audioId, totalTurns: script.length });

  // Process audio generation in background
  processAudioGeneration(jobId, audioId, {
    script,
    voiceAssignments,
    speakers,
    productionConfig,
    projectId,
    scriptId,
    language,
    ttsModel,
    useGeminiTTS,
    audioDirection,
    scriptMetadata,
  }).catch(error => {
    console.error('❌ Background audio generation failed:', error);
  });
}

// Background audio generation function
async function processAudioGeneration(
  jobId: string,
  audioId: string,
  params: {
    script: ConversationTurn[];
    voiceAssignments: VoiceAssignment[];
    speakers: Speaker[];
    productionConfig: any;
    projectId?: string;
    scriptId?: string;
    language?: string;
    ttsModel?: string;
    useGeminiTTS: boolean;
    audioDirection?: {
      arcTemplate: string;
      baselineTone: string;
      language: string;
      phases: Array<{ phase: string; startTurn: number; endTurn: number; baseline: string }>;
      turnEmotions: Array<{ turnIndex: number; emotion: string; phase: string | null }>;
    };
    scriptMetadata?: {
      speakerProfiles?: Array<{ name: string; gender: string; role: string; personality: string }>;
      podcastStyle?: string;
      audience?: string;
      language?: string;
      tone?: string;
      podcastFormat?: string;
    };
  }
) {
  const { script, voiceAssignments, speakers, productionConfig, projectId, scriptId, language, ttsModel, useGeminiTTS, audioDirection, scriptMetadata } = params;
  
  // Log audio direction metadata if present
  if (audioDirection) {
    console.log(`🎼 Audio direction received: ${audioDirection.arcTemplate} template, ${audioDirection.phases?.length || 0} phases`);
  }
  
  // Extract overlap/trim settings
  const trimSilence = productionConfig?.trimSilence ?? true;
  const silenceThresholdDb = productionConfig?.silenceThresholdDb ?? -40;
  const minGapMs = productionConfig?.minGapMs ?? 80;
  const maxGapMs = productionConfig?.maxGapMs ?? 500;
  const overlapDuration = productionConfig?.overlapDuration ?? 'none';

  console.log(`   ✂️ Trim silence: ${trimSilence} (threshold: ${silenceThresholdDb}dB)`);
  console.log(`   ⏱️ Gap range: ${minGapMs}ms - ${maxGapMs}ms, overlap: ${overlapDuration}`);

  const startTime = Date.now();
  let dbRecord: any = null;

  // Update job status
  const updateJob = (updates: Partial<AudioGenerationJob>) => {
    const existing = audioJobs.get(jobId);
    if (existing) {
      audioJobs.set(jobId, { ...existing, ...updates });
    }
  };

  // Create initial database record if projectId provided
  if (projectId) {
    try {
      dbRecord = await createAudioGeneration({
        project_id: projectId,
        script_id: scriptId,
        version: 1,
        file_path: '', // Will update after saving
        file_size_bytes: 0,
        duration_seconds: 0,
        format: 'wav',
        sample_rate: 24000,
        tts_provider: (useGeminiTTS ? 'gemini' : 'qwen') as any,
        tts_model: ttsModel || 'qwen-tts-base',
        status: 'generating',
        is_current: true,
      });
      console.log(`📝 Created audio generation record: ${dbRecord.id}`);
    } catch (dbError) {
      console.warn('⚠️ Could not create database record:', dbError);
    }
  }

  // Progress weight allocation:
  // TTS generation: 0-80% (each turn = 80/totalTurns %)
  // Assembly/mixing: 80-90%
  // File save + DB:  90-100%
  const TTS_WEIGHT = 80;
  const ASSEMBLY_WEIGHT = 10;
  const SAVE_WEIGHT = 10;

  updateJob({ status: 'processing', phase: 'tts', message: 'Starting TTS generation...', phaseDetail: `0/${script.length} turns` });

  try {
    // Only fetch Qwen URL if using Qwen TTS
    let baseUrl = '';
    if (!useGeminiTTS) {
      baseUrl = await getQwenTTSBaseUrl();
      console.log(`🎙️ Using Qwen TTS at: ${baseUrl}`);
    } else {
      console.log(`🎤 Using Gemini TTS model: ${ttsModel}`);
    }

    // Create speaker -> voice mapping (normalize names to handle case variations)
    const speakerVoiceMap = new Map<string, VoiceAssignment>();
    for (const assignment of voiceAssignments) {
      const speaker = speakers?.find((s: Speaker) => s.id === assignment.speakerId);
      if (speaker) {
        // Store with normalized (uppercase) key for matching
        speakerVoiceMap.set(speaker.name.toUpperCase(), assignment);
      }
    }
    
    // Helper to find voice assignment with case-insensitive matching
    const findVoiceAssignment = (speakerName: string): VoiceAssignment | undefined => {
      return speakerVoiceMap.get(speakerName.toUpperCase());
    };

    // Intelligent pause calculation based on multiple factors
    const calculatePauseDuration = (
      currentTurn: ConversationTurn,
      nextTurn: ConversationTurn | null,
      podcastFormat: string,
      tone: string
    ): number => {
      if (!nextTurn) return 0;

      const sameSpeaker = currentTurn.speaker.toUpperCase() === nextTurn.speaker.toUpperCase();
      const currentEmotion = currentTurn.emotion?.toLowerCase() || 'neutral';
      const nextEmotion = nextTurn.emotion?.toLowerCase() || 'neutral';
      const currentLength = currentTurn.content.split(/\s+/).length;
      
      // Base timing by podcast format
      let basePause = 0;
      switch (podcastFormat?.toLowerCase()) {
        case 'interview':
        case 'roundtable':
          basePause = 350; // Professional conversational pace
          break;
        case 'narrative':
        case 'documentary':
          basePause = 500; // More contemplative, allows ideas to land
          break;
        case 'news':
        case 'briefing':
          basePause = 250; // Crisp, efficient
          break;
        case 'educational':
        case 'tutorial':
          basePause = 400; // Clear separation for comprehension
          break;
        default:
          basePause = 350;
      }
      
      // Adjust for tone
      switch (tone?.toLowerCase()) {
        case 'formal':
        case 'professional':
          basePause += 50; // More measured
          break;
        case 'casual':
        case 'conversational':
          basePause -= 50; // More fluid
          break;
        case 'energetic':
        case 'dynamic':
          basePause -= 75; // Faster pace
          break;
        case 'contemplative':
        case 'thoughtful':
          basePause += 100; // Allow reflection
          break;
      }
      
      // Same speaker continuing (shorter pause)
      if (sameSpeaker) {
        basePause *= 0.4; // 40% of base for continuity
        
        // Even shorter for quick interjections or short responses
        if (currentLength < 5) {
          basePause *= 0.7; // Quick back-and-forth
        }
      } else {
        // Speaker change - adjust based on emotional context
        
        // Longer pause after questions (allows thinking time)
        if (currentTurn.content.trim().endsWith('?')) {
          basePause += 150;
        }
        
        // Longer pause after statements that need to land
        const impactfulEmotions = ['serious', 'emphatic', 'concerned', 'surprised', 'realizing'];
        if (impactfulEmotions.includes(currentEmotion)) {
          basePause += 100;
        }
        
        // Shorter pause for quick reactions
        const quickEmotions = ['excited', 'amused', 'intrigued', 'curious'];
        if (quickEmotions.includes(nextEmotion) && nextTurn.content.split(/\s+/).length < 10) {
          basePause *= 0.7; // Quick reaction
        }
        
        // Longer pause for emotional shifts
        const emotionalShift = currentEmotion !== nextEmotion && 
                              !['neutral', 'conversational'].includes(currentEmotion) &&
                              !['neutral', 'conversational'].includes(nextEmotion);
        if (emotionalShift) {
          basePause += 75;
        }
      }
      
      // Clamp to user-configured min/max gap bounds
      return Math.max(minGapMs, Math.min(maxGapMs, Math.round(basePause)));
    };

    // Generate audio for each turn
    const audioBuffers: Buffer[] = [];
    let totalDuration = 0;
    const podcastFormat = productionConfig?.format || 'roundtable';
    const podcastTone = productionConfig?.tone || 'conversational';

    console.log(`🎚️ Timing profile: ${podcastFormat} format, ${podcastTone} tone`);

    for (let i = 0; i < script.length; i++) {
      const turn = script[i] as ConversationTurn;
      const voiceAssignment = findVoiceAssignment(turn.speaker);
      
      // Update job progress — TTS phase is 0-80% of total
      const ttsProgress = Math.round((i / script.length) * TTS_WEIGHT);
      updateJob({
        progress: ttsProgress,
        currentTurn: i + 1,
        phase: 'tts',
        message: `🎙️ Generating turn ${i + 1}/${script.length}: ${turn.speaker}`,
        phaseDetail: `${i + 1}/${script.length} turns`,
      });

      if (!voiceAssignment) {
        console.warn(`⚠️ No voice assignment for speaker: ${turn.speaker}, using default`);
      }

      const isSpanish = language?.toLowerCase() === 'spanish';
      const rawVoiceId = voiceAssignment?.voiceId || (useGeminiTTS ? 'Charon' : (isSpanish ? 'mexican_male_warm' : 'american_male_refined'));
      const speed = voiceAssignment?.speakingRate || 1.0;
      const pitch = voiceAssignment?.pitch || 0;

      // Voice-provider mismatch guard: detect if voice belongs to wrong provider
      // Gemini voices are PascalCase names (Charon, Aoede, Puck, etc.)
      // Qwen voices are snake_case IDs (american_male_refined, mexican_female_warm, etc.)
      const isGeminiVoice = /^[A-Z][a-z]/.test(rawVoiceId);
      let voiceId = rawVoiceId;

      if (useGeminiTTS && !isGeminiVoice) {
        // Qwen voice sent to Gemini — fall back to gender-appropriate Gemini default
        const speakerGender = voiceAssignment?.gender;
        voiceId = speakerGender === 'female' ? 'Aoede' : 'Charon';
        if (i === 0) console.warn(`⚠️ Voice mismatch: Qwen voice "${rawVoiceId}" used with Gemini TTS, falling back to "${voiceId}"`);
      } else if (!useGeminiTTS && isGeminiVoice) {
        // Gemini voice sent to Qwen — fall back to language+gender-appropriate Qwen default
        const speakerGender = voiceAssignment?.gender;
        if (isSpanish) {
          voiceId = speakerGender === 'female' ? 'mexican_female_warm' : 'mexican_male_warm';
        } else {
          voiceId = speakerGender === 'female' ? 'american_female_warm' : 'american_male_refined';
        }
        if (i === 0) console.warn(`⚠️ Voice mismatch: Gemini voice "${rawVoiceId}" used with Qwen TTS, falling back to "${voiceId}"`);
      }

      try {
        // Determine emotion from audioDirection metadata if available
        // This ensures orchestrated emotional delivery based on the arc
        let turnEmotion = turn.emotion;
        let phaseBaseline: string | undefined;
        
        if (audioDirection?.phases && audioDirection?.turnEmotions) {
          // Find which phase this turn belongs to
          const phase = audioDirection.phases.find(
            p => i >= p.startTurn && i < p.endTurn
          );
          if (phase) {
            phaseBaseline = phase.baseline;
          }
          // Get emotion from audioDirection if available (more reliable than script)
          const directedEmotion = audioDirection.turnEmotions.find(t => t.turnIndex === i);
          if (directedEmotion?.emotion) {
            turnEmotion = directedEmotion.emotion;
          }
        }
        
        // Generate audio for this turn — route to Gemini or Qwen
        let audioBuffer: Buffer;
        if (useGeminiTTS) {
          // For Gemini TTS, use the Gemini voice name directly
          // Use Gemini-aware sanitizer that preserves supported expression tags
          const geminiVoice = voiceId;
          // Pass phaseBaseline as prosody hint for orchestrated delivery
          audioBuffer = await generateTTS(
            sanitizeForGeminiTTS(turn.content),
            geminiVoice,
            'gemini',
            speed,
            pitch,
            ttsModel,
            turnEmotion,
            phaseBaseline || turn.prosody,
            language
          );
        } else {
          // Route Qwen through emotion-aware generateTTS for instruct + language + accent guidance
          audioBuffer = await generateTTS(
            sanitizeForTTS(turn.content),
            voiceId,
            'qwen',
            speed,
            pitch,
            undefined, // model not needed for Qwen
            turnEmotion,
            phaseBaseline || turn.prosody,
            language
          );
        }
        
        // Auto-trim silence from TTS output for tighter pacing
        if (trimSilence) {
          audioBuffer = trimLeadingSilence(audioBuffer, silenceThresholdDb);
          audioBuffer = trimTrailingSilence(audioBuffer, silenceThresholdDb);
        }
        
        audioBuffers.push(audioBuffer);

        // Add intelligent pause between turns
        if (i < script.length - 1) {
          const nextTurn = script[i + 1] as ConversationTurn;
          const pauseDuration = calculatePauseDuration(turn, nextTurn, podcastFormat, podcastTone);
          audioBuffers.push(createSilence(pauseDuration));
          
          // Log timing decisions for first few turns (debugging)
          if (i < 3) {
            console.log(`   ⏱️ Pause after turn ${i + 1}: ${pauseDuration}ms (${turn.speaker} → ${nextTurn.speaker})`);
          }
        }

        // Estimate duration (rough: ~150 words per minute)
        const wordCount = turn.content.split(/\s+/).length;
        totalDuration += (wordCount / 150) * 60; // seconds

        console.log(`✅ Turn ${i + 1}/${script.length} complete (${turn.speaker})`);
        
        // Rate limiting for Gemini TTS: 125 RPM limit = ~480ms minimum between requests
        // Using 800ms to be safe and avoid 429 errors during burst generation
        if (useGeminiTTS && i < script.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (error) {
        console.error(`❌ Failed to generate turn ${i + 1}:`, error);
        throw error;
      }
    }

    // ===== ASSEMBLY: Intro music + speech + outro music =====
    updateJob({
      progress: TTS_WEIGHT, // 80%
      phase: 'assembly',
      message: '🔗 Assembling audio segments...',
      phaseDetail: 'Loading music assets & stitching turns',
      currentTurn: script.length,
    });

    const allBuffers: Buffer[] = [];
    const introPlacement = productionConfig?.introPlacement || 'after-greeting';
    const introVolume = productionConfig?.introVolume || 0.4;
    const introFadeDurationMs = productionConfig?.introFadeDurationMs || 3000;
    
    // Load intro music buffer (raw, without volume pre-applied for 'after-greeting' mode)
    let introMusicBuffer: Buffer | null = null;
    if (productionConfig?.introAssetId) {
      const introAsset = getAssetById(productionConfig.introAssetId);
      if (introAsset) {
        console.log(`🎵 Loading intro music: ${introAsset.name} (placement: ${introPlacement})`);
        // For 'before' mode, pre-apply volume. For 'after-greeting', mixMusicOntoSpeech handles volume.
        introMusicBuffer = await loadAudioFile(
          introAsset.filePath,
          introPlacement === 'before' ? introVolume : 1.0
        );
        if (introMusicBuffer) {
          console.log(`✅ Loaded intro music: ${introAsset.name} (${introAsset.duration}s)`);
        }
      }
    }

    if (introPlacement === 'before' && introMusicBuffer) {
      // === Traditional mode: music plays first, then speech ===
      allBuffers.push(introMusicBuffer);
      allBuffers.push(createSilence(500));
      allBuffers.push(...audioBuffers);
      
    } else if (introPlacement === 'after-greeting' && introMusicBuffer && audioBuffers.length >= 2) {
      // === After-greeting mode: Turn 1 plays clean, music fades in during the silence gap ===
      // 
      // Timeline:
      //   [Turn 1: "Welcome to the show!"]  (clean, no music)
      //   [Silence gap] ← music fade-in STARTS here (a few seconds before turn 2)
      //   [Turn 2-4: "Today we're discussing..."]  ← music continues under these turns
      //   [Music fades out smoothly over ~4 seconds]
      //   [Turn 5+: Remaining turns continue CLEAN (no music)]
      
      // audioBuffers alternates: [turn1_audio, silence, turn2_audio, silence, turn3_audio, silence, ...]
      // So indices: 0=turn1, 1=silence, 2=turn2, 3=silence, 4=turn3, 5=silence, 6=turn4, 7=silence, ...
      
      // Step 1: Add turn 1 (host greeting) — clean, no music
      allBuffers.push(audioBuffers[0]); // Turn 1 speech
      
      // Step 2: Include the silence after turn 1 + turns 2-4 in the music mix region
      // Music fade-in starts during the silence gap, so it's already audible when turn 2 begins
      const introTurnCount = 3; // Number of dialogue turns to play music under (turns 2, 3, and 4)
      // Start from index 1 (silence after turn 1) to include the gap in the music region
      const musicStartIndex = 1; // silence after turn 1
      const musicEndIndex = musicStartIndex + 1 + (introTurnCount * 2); // silence + (turn+silence) * count
      const introBuffers = audioBuffers.slice(musicStartIndex, Math.min(musicEndIndex, audioBuffers.length));
      const remainingBuffers = audioBuffers.slice(Math.min(musicEndIndex, audioBuffers.length));
      
      if (introBuffers.length > 0) {
        const introSpeech = concatenateWavBuffers(introBuffers);
        
        // Step 3: Mix intro music — fade-in covers the silence gap + early turn 2
        const introFadeIn = introFadeDurationMs > 0 ? Math.max(introFadeDurationMs, 5000) : 5000;
        const introFadeOut = 4000; // 4s smooth fade-out for a gradual exit
        const mixedIntro = mixMusicOntoSpeech(
          introSpeech,
          introMusicBuffer,
          introVolume,       // music volume (e.g. 0.3-0.4)
          introFadeIn,       // fade-in duration (5s+ for gradual entry)
          introFadeOut,      // fade-out duration (4s smooth exit)
          24000,             // sample rate
          30000              // max music duration: 30 seconds (covers silence + 3 turns)
        );
        
        allBuffers.push(mixedIntro);
        console.log(`🎵 Mixed intro music: starts at silence gap, covers ${introTurnCount} turns (fade-in: ${introFadeIn}ms, fade-out: ${introFadeOut}ms, volume: ${Math.round(introVolume * 100)}%)`);
      }
      
      // Step 4: Add remaining turns CLEAN (no music)
      if (remainingBuffers.length > 0) {
        allBuffers.push(...remainingBuffers);
        console.log(`🎤 Added ${Math.floor(remainingBuffers.length / 2)} remaining turns (clean, no music)`);
      }
      
    } else {
      // No intro music or only 1 turn — just add speech as-is
      allBuffers.push(...audioBuffers);
    }
    
    // Add outro music if configured
    if (productionConfig?.outroAssetId) {
      const outroAsset = getAssetById(productionConfig.outroAssetId);
      if (outroAsset) {
        console.log(`🎵 Loading outro music: ${outroAsset.name}`);
        const outroBuffer = await loadAudioFile(outroAsset.filePath, productionConfig.outroVolume || 0.4);
        if (outroBuffer) {
          allBuffers.push(createSilence(500));
          allBuffers.push(outroBuffer);
          totalDuration += outroAsset.duration + 0.5;
          console.log(`✅ Added outro music: ${outroAsset.name} (${outroAsset.duration}s)`);
        }
      }
    }

    // Concatenate all assembled audio
    updateJob({
      progress: TTS_WEIGHT + Math.round(ASSEMBLY_WEIGHT * 0.5), // 85%
      phase: 'mixing',
      message: '🎛️ Mixing & concatenating audio...',
      phaseDetail: `${allBuffers.length} segments`,
    });

    console.log(`🔗 Concatenating ${allBuffers.length} audio buffers...`);
    const finalAudio = concatenateWavBuffers(allBuffers);

    const generationTimeMs = Date.now() - startTime;
    console.log(`✅ Audio generation complete: ${finalAudio.length} bytes, ~${Math.ceil(totalDuration)}s, took ${generationTimeMs}ms`);

    // Save to filesystem
    updateJob({
      progress: TTS_WEIGHT + ASSEMBLY_WEIGHT, // 90%
      phase: 'saving',
      message: '💾 Saving audio file...',
      phaseDetail: `${(finalAudio.length / (1024 * 1024)).toFixed(1)} MB`,
    });

    const audioDir = path.join(process.cwd(), 'public', 'audio', 'generated');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const fileName = `podcast_${audioId}.wav`;
    const filePath = path.join(audioDir, fileName);
    const publicPath = `/audio/generated/${fileName}`;

    fs.writeFileSync(filePath, finalAudio);
    console.log(`💾 Saved audio to: ${filePath}`);

    // Update database record with file path, size, duration in a single query
    if (dbRecord) {
      try {
        await updateAudioGenerationStatus(dbRecord.id, 'generated', {
          file_size_bytes: finalAudio.length,
          duration_seconds: Math.ceil(totalDuration),
          generation_time_ms: generationTimeMs,
          file_path: publicPath,
        } as any);
        
        console.log(`📝 Updated database record with file path: ${publicPath}`);
      } catch (dbError) {
        console.warn('⚠️ Could not update database record:', dbError);
      }
    }

    // Update job status to complete
    updateJob({
      status: 'complete',
      progress: 100,
      phase: 'complete',
      message: '✅ Audio generation complete!',
      phaseDetail: `${Math.ceil(totalDuration)}s, ${(finalAudio.length / (1024 * 1024)).toFixed(1)} MB`,
      currentTurn: script.length,
      result: {
        success: true,
        audioId,
        audioUrl: publicPath,
        duration: Math.ceil(totalDuration),
        fileSize: finalAudio.length,
        generationTimeMs,
        turns: script.length,
      },
    });

    console.log(`✅ Job ${jobId} completed successfully`);

  } catch (error) {
    console.error('❌ Audio generation failed:', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Update database record to failed status with error details
    if (dbRecord) {
      try {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await updateAudioGenerationStatus(dbRecord.id, 'failed', {
          error_details: errorMsg.substring(0, 2000),
        } as any);
      } catch (dbError) {
        console.warn('⚠️ Could not update database record to failed:', dbError);
      }
    }

    // Update job status to error
    updateJob({
      status: 'error',
      progress: 0,
      phase: 'error',
      message: `Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};
