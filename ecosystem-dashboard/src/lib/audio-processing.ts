/**
 * Audio Processing Utilities
 * 
 * Functions for trimming silence, adding transitions, and optimizing
 * multi-speaker podcast audio for natural flow.
 */

/**
 * Trim silence from the beginning and end of a WAV audio buffer
 * Reduces disjoint pauses between speaker turns
 */
export function trimSilence(
  audioBuffer: Buffer,
  options: {
    trimStart?: boolean;
    trimEnd?: boolean;
    silenceThreshold?: number; // RMS threshold (0-32767 for 16-bit)
    minSilenceDuration?: number; // Minimum ms of silence to trim
    sampleRate?: number;
  } = {}
): Buffer {
  const {
    trimStart = true,
    trimEnd = true,
    silenceThreshold = 500, // ~1.5% of max amplitude
    minSilenceDuration = 100, // 100ms
    sampleRate = 24000
  } = options;

  // Validate WAV header
  if (audioBuffer.length < 44) {
    console.warn('⚠️ Audio buffer too small to trim');
    return audioBuffer;
  }

  const wavHeader = audioBuffer.slice(0, 44);
  const pcmData = audioBuffer.slice(44);
  
  // Parse WAV header to get actual sample rate
  const actualSampleRate = wavHeader.readUInt32LE(24);
  const channels = wavHeader.readUInt16LE(22);
  const bitsPerSample = wavHeader.readUInt16LE(34);
  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = channels * bytesPerSample;
  
  // Calculate minimum silence samples
  const minSilenceSamples = Math.floor((minSilenceDuration / 1000) * actualSampleRate);
  
  // Read samples as 16-bit PCM
  const samples: number[] = [];
  for (let i = 0; i < pcmData.length; i += 2) {
    if (i + 1 < pcmData.length) {
      // Read as signed 16-bit integer
      samples.push(pcmData.readInt16LE(i));
    }
  }
  
  if (samples.length === 0) {
    console.warn('⚠️ No samples found in audio');
    return audioBuffer;
  }

  let startIndex = 0;
  let endIndex = samples.length - 1;

  // Trim from start
  if (trimStart) {
    let silentSamples = 0;
    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i]);
      
      if (amplitude < silenceThreshold) {
        silentSamples++;
      } else {
        // Found audio - check if we had enough silence
        if (silentSamples >= minSilenceSamples) {
          startIndex = i;
        }
        break;
      }
    }
  }

  // Trim from end
  if (trimEnd) {
    let silentSamples = 0;
    for (let i = samples.length - 1; i >= startIndex; i--) {
      const amplitude = Math.abs(samples[i]);
      
      if (amplitude < silenceThreshold) {
        silentSamples++;
      } else {
        // Found audio - check if we had enough silence
        if (silentSamples >= minSilenceSamples) {
          endIndex = i;
        }
        break;
      }
    }
  }

  // If no significant trimming, return original
  if (startIndex === 0 && endIndex === samples.length - 1) {
    console.log('   ✂️ No significant silence to trim');
    return audioBuffer;
  }

  // Calculate trimmed duration
  const originalDuration = samples.length / actualSampleRate;
  const trimmedDuration = (endIndex - startIndex + 1) / actualSampleRate;
  const trimmedSeconds = originalDuration - trimmedDuration;
  
  console.log(`   ✂️ Trimmed ${trimmedSeconds.toFixed(2)}s silence (${startIndex} samples from start, ${samples.length - endIndex - 1} from end)`);

  // Create new PCM data with trimmed samples
  const trimmedPCM = Buffer.alloc((endIndex - startIndex + 1) * 2);
  let writeIndex = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    trimmedPCM.writeInt16LE(samples[i], writeIndex);
    writeIndex += 2;
  }

  // Create new WAV header with updated size
  const newWavHeader = Buffer.alloc(44);
  wavHeader.copy(newWavHeader);
  
  const newDataSize = trimmedPCM.length;
  const newFileSize = 36 + newDataSize;
  
  newWavHeader.writeUInt32LE(newFileSize, 4); // File size
  newWavHeader.writeUInt32LE(newDataSize, 40); // Data chunk size

  return Buffer.concat([newWavHeader, trimmedPCM]);
}

/**
 * Add a short pause between audio segments for natural transitions
 * Prevents robotic immediate-response feel
 */
export function addTransitionPause(
  durationMs: number = 200,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const bytesPerSample = bitsPerSample / 8;
  const totalBytes = samples * channels * bytesPerSample;
  
  // Create silent PCM data (all zeros)
  return Buffer.alloc(totalBytes, 0);
}

/**
 * Combine audio segments with intelligent silence trimming and optional pauses
 */
export function combineAudioSegments(
  segments: Buffer[],
  options: {
    trimSilence?: boolean;
    transitionPauseMs?: number; // Pause between speakers
    silenceThreshold?: number;
    sampleRate?: number;
  } = {}
): Buffer {
  const {
    trimSilence: shouldTrimSilence = true,
    transitionPauseMs = 250, // 250ms = natural conversation pause
    silenceThreshold = 500,
    sampleRate = 24000
  } = options;

  if (segments.length === 0) {
    throw new Error('No audio segments to combine');
  }

  if (segments.length === 1) {
    return segments[0];
  }

  // Extract first header for reference
  const firstHeader = segments[0].slice(0, 44);
  
  // Process all segments
  const processedSegments: Buffer[] = [];
  const transitionPause = transitionPauseMs > 0 
    ? addTransitionPause(transitionPauseMs, sampleRate)
    : null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Trim silence from this segment
    const trimmed = shouldTrimSilence 
      ? trimSilence(segment, {
          trimStart: i > 0, // Trim start except for first segment
          trimEnd: i < segments.length - 1, // Trim end except for last segment
          silenceThreshold,
          minSilenceDuration: 100,
          sampleRate
        })
      : segment;
    
    // Extract PCM data (skip header)
    const pcmData = trimmed.slice(44);
    processedSegments.push(pcmData);
    
    // Add transition pause between segments (not after last one)
    if (transitionPause && i < segments.length - 1) {
      processedSegments.push(transitionPause);
    }
  }

  // Concatenate all PCM data
  const allPCM = Buffer.concat(processedSegments);
  
  // Create new WAV header with correct total size
  const wavHeader = Buffer.alloc(44);
  firstHeader.copy(wavHeader);
  
  const dataSize = allPCM.length;
  const fileSize = 36 + dataSize;
  
  wavHeader.writeUInt32LE(fileSize, 4); // File size
  wavHeader.writeUInt32LE(dataSize, 40); // Data chunk size

  return Buffer.concat([wavHeader, allPCM]);
}

/**
 * Analyze audio segment to detect silence characteristics
 * Useful for debugging pause issues
 */
export function analyzeSilence(audioBuffer: Buffer): {
  totalDuration: number;
  silenceAtStart: number;
  silenceAtEnd: number;
  audioContent: number;
  peakAmplitude: number;
  averageAmplitude: number;
} {
  if (audioBuffer.length < 44) {
    throw new Error('Invalid WAV buffer');
  }

  const wavHeader = audioBuffer.slice(0, 44);
  const pcmData = audioBuffer.slice(44);
  
  const sampleRate = wavHeader.readUInt32LE(24);
  const silenceThreshold = 500;
  
  // Read samples
  const samples: number[] = [];
  for (let i = 0; i < pcmData.length; i += 2) {
    if (i + 1 < pcmData.length) {
      samples.push(Math.abs(pcmData.readInt16LE(i)));
    }
  }

  // Find first non-silent sample
  let startSilence = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > silenceThreshold) break;
    startSilence++;
  }

  // Find last non-silent sample
  let endSilence = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i] > silenceThreshold) break;
    endSilence++;
  }

  const totalDuration = samples.length / sampleRate;
  const silenceAtStart = startSilence / sampleRate;
  const silenceAtEnd = endSilence / sampleRate;
  const audioContent = (samples.length - startSilence - endSilence) / sampleRate;
  
  // Calculate peak without spreading (prevents stack overflow on large arrays)
  let peakAmplitude = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > peakAmplitude) peakAmplitude = samples[i];
  }
  
  // Calculate average iteratively
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
  }
  const averageAmplitude = sum / samples.length;

  return {
    totalDuration,
    silenceAtStart,
    silenceAtEnd,
    audioContent,
    peakAmplitude,
    averageAmplitude
  };
}
