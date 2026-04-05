/**
 * Podcast Product Metadata Types
 * 
 * These represent the final generated podcast product and all its metadata.
 * This is what gets saved to the database and used for distribution/analytics.
 */

export interface PodcastMetadata {
  // Core identification
  id: string;
  projectId: string; // Links back to the PodcastProject
  version: number; // Version number of this generation (1, 2, 3...)
  
  // Podcast information
  title: string;
  description: string;
  episodeNumber?: number;
  seasonNumber?: number;
  
  // Audio file information
  audioUrl: string;
  audioFormat: 'mp3' | 'wav' | 'aac' | 'opus';
  audioBitrate: number; // kbps
  audioSampleRate: number; // Hz (e.g., 44100, 48000)
  duration: number; // seconds
  fileSize: number; // bytes
  
  // Generation metadata
  generatedAt: string; // ISO timestamp
  generatedBy: string; // User ID
  generatedWith: GenerationSettings;
  
  // Speaker metadata - IMPORTANT for analytics and reproduction!
  speakerCount: number; // ← YES, we should store this!
  speakers: GeneratedSpeaker[];
  
  // Voice assignments used (for reproducibility)
  voiceAssignments: VoiceAssignment[];
  
  // Audio processing applied (for reproducibility)
  audioProcessing: AudioProcessingSettings;
  
  // Quality metrics
  qualityMetrics: QualityMetrics;
  
  // Publishing status
  publishStatus: 'draft' | 'published' | 'archived' | 'unlisted';
  publishedAt?: string;
  distributedTo: DistributionPlatform[];
  
  // Analytics
  analytics: PodcastAnalytics;
  
  // Additional content
  coverImageUrl?: string;
  transcriptUrl?: string;
  chapters?: Chapter[];
  showNotes?: string;
  links?: ResourceLink[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedSpeaker {
  id: string; // speaker-1, speaker-2, etc.
  name: string; // The actual speaker name from script
  role: string; // host, guest, expert, etc.
  lineCount: number; // How many lines they had
  totalWords: number; // Word count for this speaker
  estimatedDuration: number; // Seconds this speaker talks
}

export interface VoiceAssignment {
  speakerId: string; // Links to GeneratedSpeaker.id
  speakerName: string; // For convenience
  voiceId: string; // e.g., "Puck", "Charon"
  voiceName: string; // e.g., "Puck (Upbeat, Middle pitch)"
  voiceProvider: 'gemini' | 'openai' | 'elevenlabs' | 'google-tts';
  voiceGender: 'male' | 'female' | 'neutral';
  voiceAccent: string;
  speakingRate: number; // 0.5 - 2.0
  pitch: number; // -20 to +20 semitones
}

export interface GenerationSettings {
  provider: 'gemini' | 'openai';
  model: string; // e.g., "gemini-2.5-pro"
  ttsEngine: string; // e.g., "gemini-audio-modality"
  temperature?: number;
  maxTokens?: number;
}

export interface AudioProcessingSettings {
  noiseReduction: {
    enabled: boolean;
    threshold?: number;
  };
  noiseGate: {
    enabled: boolean;
    threshold: number; // dB
  };
  equalization: {
    enabled: boolean;
    lowCut: number; // Hz
    midBoost: number; // dB
    highShelf: number; // dB
  };
  compression: {
    enabled: boolean;
    threshold: number; // dB
    ratio: number;
    attack: number; // ms
    release: number; // ms
  };
  limiter: {
    enabled: boolean;
    ceiling: number; // dB
  };
  loudnessNormalization: {
    enabled: boolean;
    targetLUFS: number; // e.g., -16 LUFS
  };
  presetUsed?: string; // e.g., "Podcast Standard", "Radio Ready"
}

export interface QualityMetrics {
  loudnessLUFS: number; // Integrated loudness
  peakLevel: number; // dB
  dynamicRange: number; // dB
  signalToNoiseRatio?: number; // dB
  qualityScore?: number; // 0-100 calculated score
}

export interface Chapter {
  time: number; // seconds from start
  title: string;
  description?: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  type?: 'article' | 'video' | 'document' | 'website';
}

export interface DistributionPlatform {
  platform: 'spotify' | 'apple-podcasts' | 'google-podcasts' | 'youtube' | 'soundcloud' | 'rss';
  distributedAt: string;
  platformUrl?: string;
  platformId?: string;
}

export interface PodcastAnalytics {
  playCount: number;
  downloadCount: number;
  uniqueListeners: number;
  averageListenDuration: number; // seconds
  completionRate: number; // 0-1 (percentage who listened to end)
  skipRate: number; // 0-1 (percentage who skipped)
  shareCount: number;
  likeCount: number;
  commentCount: number;
  
  // Listener demographics
  topCountries?: string[];
  topDevices?: string[];
  topApps?: string[];
  
  // Time-based analytics
  listeningPeakHours?: number[]; // Array of hours (0-23)
  
  // Timestamps
  lastUpdated: string;
}

/**
 * Extended PodcastProject type with generated podcasts
 */
export interface PodcastProjectWithMetadata {
  // Original project fields
  id: string;
  title: string;
  researchMaterials: any[];
  script: any[];
  hosts: any[];
  createdAt: string;
  updatedAt: string;
  
  // Generated podcasts
  generatedPodcasts: PodcastMetadata[];
  activePodcastId?: string; // Which one is currently active
}
