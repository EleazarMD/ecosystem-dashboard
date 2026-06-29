/**
 * Art Studio shared types
 */

export type ArtStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export interface ArtImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
  style?: string;
  favorite?: boolean;
  status?: ArtStatus;
  progress?: {
    percent: number;
    message: string;
  };
  /** When the image was generated via the legacy async job queue */
  jobId?: string;
  /** Source of generation: gemini = sync, job = async queue */
  source?: 'gemini' | 'job';
}

export interface ArtStyle {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export interface ArtSize {
  id: string;
  label: string;
  ratio: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3';
}

export interface PromptSuggestion {
  emoji: string;
  text: string;
}

export interface ArtStudioState {
  view: 'canvas' | 'gallery';
  selectedStyle: string;
  selectedSize: string;
  prompt: string;
  currentImage: ArtImage | null;
  images: ArtImage[];
  loading: boolean;
  status: ArtStatus;
}
