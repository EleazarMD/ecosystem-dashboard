import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceInterfaceOptions {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  language?: string;
}

interface VoiceInterfaceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number | null;
}

interface VoiceInterfaceActions {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  speak: (text: string, options?: SpeechSynthesisUtterance) => Promise<void>;
}

export const useVoiceInterface = (
  options: VoiceInterfaceOptions = {}
): VoiceInterfaceState & VoiceInterfaceActions => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check browser support
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) &&
      'speechSynthesis' in window
    );
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.maxAlternatives = options.maxAlternatives ?? 1;
    recognition.lang = options.language ?? 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
          setConfidence(result[0].confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;

    return () => {
      recognition.stop();
    };
  }, [isSupported, options]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      setConfidence(null);
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      setError('Failed to stop speech recognition');
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(null);
  }, []);

  const speak = useCallback(async (
    text: string,
    utteranceOptions?: Partial<SpeechSynthesisUtterance>
  ): Promise<void> => {
    if (!synthRef.current || !text) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        synthRef.current!.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Apply custom options
        if (utteranceOptions) {
          Object.assign(utterance, utteranceOptions);
        }

        // Default voice settings for AI Assistant
        utterance.rate = utteranceOptions?.rate ?? 0.9;
        utterance.pitch = utteranceOptions?.pitch ?? 1.0;
        utterance.volume = utteranceOptions?.volume ?? 0.8;

        // Try to use a pleasant voice
        const voices = synthRef.current!.getVoices();
        const preferredVoice = voices.find(voice =>
          voice.name.includes('Samantha') ||  // macOS
          voice.name.includes('Google US English') || // Chrome
          voice.name.includes('Microsoft Zira') // Windows
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(event.error));

        synthRef.current!.speak(utterance);
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    speak,
  };
};

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
