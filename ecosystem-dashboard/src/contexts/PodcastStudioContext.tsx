import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useModelRegistry } from '../hooks/useModelRegistry';

interface Model {
  id: string;
  name: string;
  provider: string;
  capabilities?: string[];
}

// Context window limits (in characters, roughly 4 chars per token)
const QWEN_CONTEXT_LIMIT_CHARS = 32000 * 4; // ~32K tokens for Qwen3-32B

interface PodcastStudioContextType {
  // Available models from registry
  availableModels: Model[];
  isLoadingModels: boolean;
  
  // Chat model (for conversational responses)
  chatModel: string;
  setChatModel: (model: string) => void;
  
  // Analysis model (for PDF/document analysis)
  analysisModel: string;
  setAnalysisModel: (model: string) => void;
  
  // Script generation model (for podcast scripts)
  scriptModel: string;
  setScriptModel: (model: string) => void;
  
  // Temperature and other shared settings
  temperature: number;
  setTemperature: (temp: number) => void;
  
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  
  // System prompt
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  
  // Context size tracking for auto-switch
  contextSizeChars: number;
  setContextSizeChars: (size: number) => void;
  isLargeContext: boolean; // True when context exceeds Qwen limit
  effectiveModel: string; // The model that will actually be used (may differ from chatModel if auto-switched)
}

export const PodcastStudioContext = createContext<PodcastStudioContextType | undefined>(undefined);

export const usePodcastStudio = () => {
  const context = useContext(PodcastStudioContext);
  if (!context) {
    throw new Error('usePodcastStudio must be used within PodcastStudioProvider');
  }
  return context;
};

interface PodcastStudioProviderProps {
  children: ReactNode;
}

export const PodcastStudioProvider: React.FC<PodcastStudioProviderProps> = ({ children }) => {
  // Get available models from registry (coordinated with AI Gateway)
  const { availableModels, isLoading } = useModelRegistry();
  
  // Independent model selections - will be initialized from registry
  const [chatModel, setChatModel] = useState<string>('');
  const [analysisModel, setAnalysisModel] = useState<string>('');
  const [scriptModel, setScriptModel] = useState<string>('');
  
  // Shared settings
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant specialized in research and content creation for podcasts.');
  
  // Context size tracking for auto-switch to Gemini
  const [contextSizeChars, setContextSizeChars] = useState(0);
  const isLargeContext = contextSizeChars > QWEN_CONTEXT_LIMIT_CHARS;
  const effectiveModel = isLargeContext && (chatModel.includes('qwen') || chatModel === 'qwen3-32b') 
    ? 'gemini-2.0-flash' 
    : chatModel;

  // Initialize models from registry when available
  useEffect(() => {
    if (availableModels.length > 0 && !chatModel) {
      // Find preferred models - prioritize Qwen3-32B (local, free, private)
      const qwen32b = availableModels.find(m => m.id.includes('qwen3-32b') || m.id.includes('qwen3:32b'));
      const geminiFlash = availableModels.find(m => m.id.includes('gemini-2-5-flash') || m.id.includes('gemini-2.5-flash'));
      const geminiPro = availableModels.find(m => m.id.includes('gemini-2-5-pro') || m.id.includes('gemini-2.5-pro'));
      const gpt4 = availableModels.find(m => m.id.includes('gpt-4'));
      
      // Set defaults - prefer Qwen3-32B for all tasks (local, free, private)
      const defaultChat = qwen32b?.id || geminiFlash?.id || gpt4?.id || availableModels[0].id;
      const defaultAnalysis = qwen32b?.id || geminiFlash?.id || gpt4?.id || availableModels[0].id;
      const defaultScript = qwen32b?.id || geminiPro?.id || geminiFlash?.id || gpt4?.id || availableModels[0].id;
      
      setChatModel(defaultChat);
      setAnalysisModel(defaultAnalysis);
      setScriptModel(defaultScript);
      
      console.log('🤖 Podcast Studio models initialized from registry:', {
        chat: defaultChat,
        analysis: defaultAnalysis,
        script: defaultScript,
        totalAvailable: availableModels.length
      });
    }
  }, [availableModels, chatModel]);

  const value = {
    availableModels,
    isLoadingModels: isLoading,
    chatModel,
    setChatModel,
    analysisModel,
    setAnalysisModel,
    scriptModel,
    setScriptModel,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    systemPrompt,
    setSystemPrompt,
    // Context size tracking for auto-switch
    contextSizeChars,
    setContextSizeChars,
    isLargeContext,
    effectiveModel,
  };

  return (
    <PodcastStudioContext.Provider value={value}>
      {children}
    </PodcastStudioContext.Provider>
  );
};
