/**
 * Advanced Text-to-Speech Service (Google ADK Chirp HD style)
 * Provides natural, human-like voice responses with emotion and context
 */

interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  emotion?: 'neutral' | 'friendly' | 'professional' | 'excited' | 'calm';
  language?: string;
  ssml?: boolean;
}

interface VoiceProfile {
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  naturalness: number;
  recommended: boolean;
}

export class AdvancedTTS {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized: boolean = false;
  private voiceProfiles: VoiceProfile[] = [];

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeVoices();
  }

  /**
   * Initialize and catalog available voices
   */
  private async initializeVoices(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = this.synthesis.getVoices();
        this.catalogVoices();
        this.isInitialized = true;
        resolve();
      };

      if (this.voices.length > 0) {
        loadVoices();
      } else {
        this.synthesis.onvoiceschanged = loadVoices;
      }
    });
  }

  /**
   * Catalog and rank voices by naturalness (Google ADK style)
   */
  private catalogVoices(): void {
    this.voiceProfiles = this.voices.map(voice => {
      let naturalness = 0.5; // Base score
      let recommended = false;

      // Prefer neural/premium voices
      if (voice.name.toLowerCase().includes('neural') || 
          voice.name.toLowerCase().includes('premium') ||
          voice.name.toLowerCase().includes('enhanced')) {
        naturalness += 0.3;
        recommended = true;
      }

      // Prefer Google, Microsoft, or Apple voices
      if (voice.name.toLowerCase().includes('google') ||
          voice.name.toLowerCase().includes('microsoft') ||
          voice.name.toLowerCase().includes('apple')) {
        naturalness += 0.2;
      }

      // Prefer specific high-quality voices
      const highQualityVoices = [
        'samantha', 'alex', 'victoria', 'daniel', 'karen', 'moira',
        'google us english', 'microsoft zira', 'microsoft david'
      ];
      
      if (highQualityVoices.some(hq => voice.name.toLowerCase().includes(hq))) {
        naturalness += 0.2;
        recommended = true;
      }

      return {
        name: voice.name,
        lang: voice.lang,
        gender: this.detectGender(voice.name),
        naturalness: Math.min(naturalness, 1.0),
        recommended
      };
    }).sort((a, b) => b.naturalness - a.naturalness);
  }

  /**
   * Detect voice gender from name patterns
   */
  private detectGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    
    const femaleNames = ['samantha', 'victoria', 'karen', 'moira', 'zira', 'hazel', 'susan', 'allison'];
    const maleNames = ['alex', 'daniel', 'david', 'thomas', 'mark', 'paul', 'richard'];
    
    if (femaleNames.some(n => name.includes(n))) return 'female';
    if (maleNames.some(n => name.includes(n))) return 'male';
    
    return 'neutral';
  }

  /**
   * Get best voice for agent and context
   */
  private selectVoice(agentId: string, options: TTSOptions): SpeechSynthesisVoice | null {
    if (!this.isInitialized) return null;

    // Agent-specific voice preferences (Google ADK personalization)
    const agentVoicePreferences = {
      'orchestrator': { gender: 'neutral', professional: true },
      'graph-query': { gender: 'female', analytical: true },
      'vector-search': { gender: 'male', technical: true },
      'documentation': { gender: 'female', friendly: true },
      'reasoning': { gender: 'male', thoughtful: true },
      'memory': { gender: 'neutral', calm: true },
      'integration': { gender: 'male', efficient: true }
    };

    const preference = agentVoicePreferences[agentId as keyof typeof agentVoicePreferences];
    
    // Filter voices by language
    let candidateVoices = this.voices.filter(voice => 
      voice.lang.startsWith(options.language || 'en')
    );

    // Apply gender preference
    if (preference?.gender && preference.gender !== 'neutral') {
      const genderFiltered = candidateVoices.filter(voice => 
        this.detectGender(voice.name) === preference.gender
      );
      if (genderFiltered.length > 0) {
        candidateVoices = genderFiltered;
      }
    }

    // Prefer high-quality voices
    const recommendedVoices = candidateVoices.filter(voice => 
      this.voiceProfiles.find(p => p.name === voice.name)?.recommended
    );

    if (recommendedVoices.length > 0) {
      candidateVoices = recommendedVoices;
    }

    // Return best match
    return candidateVoices[0] || this.voices[0] || null;
  }

  /**
   * Apply emotion and context to speech parameters
   */
  private applyEmotionSettings(utterance: SpeechSynthesisUtterance, emotion: string, context: any): void {
    switch (emotion) {
      case 'friendly':
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        break;
      case 'professional':
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        break;
      case 'excited':
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        utterance.volume = 0.9;
        break;
      case 'calm':
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        utterance.volume = 0.7;
        break;
      default: // neutral
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
    }

    // Adjust for conversation context
    if (context?.conversationLength > 5) {
      utterance.rate *= 1.05; // Slightly faster for ongoing conversations
    }

    if (context?.isFirstInteraction) {
      utterance.pitch *= 1.05; // Slightly higher pitch for greetings
    }
  }

  /**
   * Add natural pauses and emphasis (SSML-like processing)
   */
  private processTextForNaturalSpeech(text: string, context: any): string {
    let processedText = text;

    // Add pauses after questions
    processedText = processedText.replace(/\?/g, '? ');
    
    // Add emphasis to important words
    const emphasisWords = ['important', 'critical', 'urgent', 'please', 'thank you'];
    emphasisWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(regex, `${word}`);
    });

    // Add natural breaks for long sentences
    processedText = processedText.replace(/,/g, ', ');
    processedText = processedText.replace(/\./g, '. ');

    // Agent-specific speech patterns
    if (context?.agentId === 'orchestrator') {
      processedText = processedText.replace(/\bI'll\b/g, "I will");
    }

    return processedText;
  }

  /**
   * Speak text with advanced natural voice (Google ADK Chirp HD style)
   */
  public async speak(
    text: string, 
    agentId: string, 
    options: TTSOptions = {},
    context: any = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeVoices();
    }

    // Stop any current speech
    this.stop();

    // Process text for natural speech
    const processedText = this.processTextForNaturalSpeech(text, { ...context, agentId });

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(processedText);
    
    // Select best voice
    const selectedVoice = this.selectVoice(agentId, options);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Apply emotion and context
    this.applyEmotionSettings(utterance, options.emotion || 'neutral', context);

    // Override with custom options
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;

    // Set up event handlers
    return new Promise((resolve, reject) => {
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`TTS Error: ${event.error}`));
      };

      utterance.onstart = () => {
        console.log(`🔊 [${agentId}] Speaking: "${text.substring(0, 50)}..."`);
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  public stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  public pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  public resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  public isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * Get available voice profiles
   */
  public getVoiceProfiles(): VoiceProfile[] {
    return this.voiceProfiles;
  }

  /**
   * Get recommended voices for agent
   */
  public getRecommendedVoicesForAgent(agentId: string): VoiceProfile[] {
    return this.voiceProfiles.filter(profile => profile.recommended);
  }

  /**
   * Test voice with sample text
   */
  public async testVoice(voiceName: string, sampleText: string = "Hello, this is a voice test."): Promise<void> {
    const voice = this.voices.find(v => v.name === voiceName);
    if (!voice) throw new Error(`Voice ${voiceName} not found`);

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Voice test failed: ${event.error}`));
      
      this.synthesis.speak(utterance);
    });
  }
}

export const advancedTTS = new AdvancedTTS();
