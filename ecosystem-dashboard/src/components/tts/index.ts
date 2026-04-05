/**
 * TTS Components - Export all TTS-related components
 */

export { VoiceSelector } from './VoiceSelector';
export { ReadAloudButton } from './ReadAloudButton';
export { useQwenTTS, SERVICE_VOICE_DEFAULTS, VOICE_CATEGORIES } from '@/hooks/useQwenTTS';
export type { VoiceProfile, TTSOptions } from '@/hooks/useQwenTTS';
