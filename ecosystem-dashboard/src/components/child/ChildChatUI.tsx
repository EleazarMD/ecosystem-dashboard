/**
 * Child Chat UI Component
 * 
 * A child-friendly AI chat interface that includes:
 * - Fun, colorful UI
 * - Usage tracking display
 * - Content filtering indicators
 * - Approval request prompts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Avatar,
  Spinner,
  Progress,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Image,
  useBreakpointValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  Divider,
} from '@chakra-ui/react';
import { FiSend, FiArrowLeft, FiClock, FiAlertTriangle, FiTrash2, FiVolume2, FiVolumeX, FiMic, FiMicOff, FiMessageSquare } from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from './BackgroundContextMenu';
import { ChildMessageRenderer, isStoryContent } from './ChildMessageRenderer';
import { ChildChatInput } from './ChildChatInput';
import { HighlightToDefine } from './HighlightToDefine';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  wasFiltered?: boolean;
  filterMessage?: string;
}

interface ConversationHistoryItem {
  id: string;
  characterName?: string;
  characterEmoji?: string;
  theme?: string;
  creativeMode?: boolean;
  creativeActivity?: string;
  spanishMode?: boolean;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  summary?: string;
  topics?: string[];
}

interface InteractiveChoice {
  id: string;
  text: string;
}

/**
 * Parse interactive choices from message content
 * Format: [CHOICE:A|option text] [CHOICE:B|option text]
 */
function parseInteractiveChoices(content: string): { text: string; choices: InteractiveChoice[] } {
  const choiceRegex = /\[CHOICE:([A-Z])\|([^\]]+)\]/g;
  const choices: InteractiveChoice[] = [];
  let match;
  
  while ((match = choiceRegex.exec(content)) !== null) {
    choices.push({
      id: match[1],
      text: match[2].trim(),
    });
  }
  
  // Remove choice markers from the text
  const cleanText = content.replace(choiceRegex, '').trim();
  
  return { text: cleanText, choices };
}

/**
 * Parse image generation tag from message content
 * Format: [GENERATE_IMAGE]{prompt: "..."}[/GENERATE_IMAGE]
 */
function parseImageGenerationTag(content: string): { text: string; imagePrompt: string | null } {
  const imageTagRegex = /\[GENERATE_IMAGE\]\s*\{prompt:\s*"([^"]+)"\}\s*\[\/GENERATE_IMAGE\]/i;
  const match = content.match(imageTagRegex);
  
  if (match) {
    const imagePrompt = match[1];
    const cleanText = content.replace(imageTagRegex, '').trim();
    return { text: cleanText, imagePrompt };
  }
  
  return { text: content, imagePrompt: null };
}

interface ActiveCharacter {
  id?: string;
  name: string;
  emoji: string;
  personality?: string;
  iconPath?: string; // Path to character avatar image
}

interface ChildChatUIProps {
  serviceId: string;
  serviceName: string;
  serviceEmoji: string;
  onBack?: () => void;
  useGooseMind?: boolean; // Use enhanced GooseMind chat with recipes
}

export function ChildChatUI({
  serviceId,
  serviceName,
  serviceEmoji,
  onBack,
  useGooseMind = true, // Default to using GooseMind
}: ChildChatUIProps) {
  const toast = useToast();
  const { avatarEmoji } = useChildTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Get right panel state for input bar positioning
  const { isOpen: isPanelOpen, width: panelWidth } = useRightPanel();
  
  // Tools modal state
  const { isOpen: isToolsOpen, onOpen: onToolsOpen, onClose: onToolsClose } = useDisclosure();
  
  // Mobile/tablet responsive values - initialize with defaults to avoid SSR issues
  const [isMobile, setIsMobile] = useState(false);
  const [avatarSize, setAvatarSize] = useState('40px');
  const [inputSize, setInputSize] = useState<'md' | 'lg'>('lg');
  const [messageFontSize, setMessageFontSize] = useState<'sm' | 'md'>('md');
  const [headerPadding, setHeaderPadding] = useState(3);
  const [maxMessageWidth, setMaxMessageWidth] = useState('70%');

  // Update responsive values on client side only
  useEffect(() => {
    const updateResponsiveValues = () => {
      const width = window.innerWidth;
      const isMobileView = width < 768;
      setIsMobile(isMobileView);
      setAvatarSize(isMobileView ? '32px' : '40px');
      setInputSize(isMobileView ? 'md' : 'lg');
      setMessageFontSize(isMobileView ? 'sm' : 'md');
      setHeaderPadding(isMobileView ? 2 : 3);
      setMaxMessageWidth(isMobileView ? '85%' : '70%');
    };

    updateResponsiveValues();
    window.addEventListener('resize', updateResponsiveValues);
    return () => window.removeEventListener('resize', updateResponsiveValues);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [hasApproval, setHasApproval] = useState<boolean | null>(null);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<ActiveCharacter | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Spanish learning mode state - initialize with defaults to avoid hydration mismatch
  const [spanishMode, setSpanishMode] = useState<{
    enabled: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
    focus: 'vocabulary' | 'grammar' | 'conversation' | 'all';
  }>({ enabled: false, level: 'beginner', focus: 'all' });

  // Read Aloud (TTS) state
  const [readAloudSettings, setReadAloudSettings] = useState<{
    enabled: boolean;
    autoRead: boolean;
  }>({ enabled: false, autoRead: false });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Creative Mode state - for inline image generation from chat
  const [creativeMode, setCreativeMode] = useState<{
    enabled: boolean;
    activity: 'castle' | 'house' | 'cookie' | 'cake' | 'room' | 'spaceship' | 'robot' | 'garden' | 'custom';
  }>({ enabled: false, activity: 'castle' });

  // Image generation state for creative mode
  const [generatingImage, setGeneratingImage] = useState<string | null>(null); // messageId being generated
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({}); // messageId -> imageUrl
  const [expandedImage, setExpandedImage] = useState<string | null>(null); // URL of image to show in modal
  
  // Story continuation state - for interactive storybook
  const [storyContinuationLoading, setStoryContinuationLoading] = useState<string | null>(null); // messageId being continued

  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Load Spanish mode from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('childSpanishMode');
      if (saved) {
        try {
          setSpanishMode(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved Spanish mode:', e);
        }
      }
    }
  }, []);

  // Load messages from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`child-chat-messages-${serviceId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const loadedMessages = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(loadedMessages);
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      }
    }
  }, [serviceId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(`child-chat-messages-${serviceId}`, JSON.stringify(messages));
    }
  }, [messages, serviceId]);

  // Listen for topic selection from right panel
  useEffect(() => {
    const handleTopicSelect = (event: CustomEvent<{ topic: string }>) => {
      const topic = event.detail.topic;
      if (topic) {
        setInput(topic);
        // Auto-send the topic as a message
        setTimeout(() => {
          const sendButton = document.querySelector('[aria-label="Send message"]') as HTMLButtonElement;
          if (sendButton) {
            sendButton.click();
          }
        }, 100);
      }
    };

    window.addEventListener('child-chat-topic-select', handleTopicSelect as EventListener);
    return () => {
      window.removeEventListener('child-chat-topic-select', handleTopicSelect as EventListener);
    };
  }, []);

  // Listen for Spanish mode changes from right panel
  useEffect(() => {
    const handleSpanishModeChange = (event: CustomEvent<{ enabled: boolean; level: string; focus: string }>) => {
      const { enabled, level, focus } = event.detail;
      const newMode = { 
        enabled, 
        level: level as 'beginner' | 'intermediate' | 'advanced', 
        focus: focus as 'vocabulary' | 'grammar' | 'conversation' | 'all' 
      };
      setSpanishMode(newMode);
      localStorage.setItem('childSpanishMode', JSON.stringify(newMode));
      
      // Show a fun message when Spanish mode is toggled
      if (enabled) {
        setMessages(prev => [...prev, {
          id: `spanish-mode-${Date.now()}`,
          role: 'assistant',
          content: `🇲🇽 ¡Hola, amigo! Spanish mode is now ON! ${activeCharacter?.emoji || '⛏️'}\n\nI'll help you learn Spanish while we chat. Try responding to me in Spanish - I'll help you with vocabulary, grammar, and pronunciation!\n\n**¿Estás listo?** (Are you ready?) 🎉`,
          timestamp: new Date(),
        }]);
      }
    };

    window.addEventListener('child-spanish-mode-change', handleSpanishModeChange as EventListener);
    return () => {
      window.removeEventListener('child-spanish-mode-change', handleSpanishModeChange as EventListener);
    };
  }, [activeCharacter]);

  // Listen for character changes from right panel
  useEffect(() => {
    const handleCharacterChange = (event: CustomEvent<{ id: string; name: string; emoji: string; personality?: string; iconPath?: string }>) => {
      const { id, name, emoji, personality, iconPath } = event.detail;
      setActiveCharacter({
        id,
        name,
        emoji,
        personality,
        iconPath,
      });
      
      // Clear previous messages when switching characters
      setMessages([{
        id: `character-switch-${Date.now()}`,
        role: 'assistant',
        content: `${emoji} Hey there! I'm ${name}! Ready to chat and have some fun? What would you like to talk about? 🎮`,
        timestamp: new Date(),
      }]);
      
      // Clear conversation ID since this is a new conversation
      setCurrentConversationId(null);
    };

    window.addEventListener('child-chat-character-change', handleCharacterChange as EventListener);
    return () => {
      window.removeEventListener('child-chat-character-change', handleCharacterChange as EventListener);
    };
  }, []);

  // Listen for Read Aloud settings changes from right panel
  useEffect(() => {
    const handleReadAloudChange = (event: CustomEvent<{ enabled: boolean; autoRead: boolean }>) => {
      const { enabled, autoRead } = event.detail;
      setReadAloudSettings({ enabled, autoRead });
      localStorage.setItem('childReadAloudSettings', JSON.stringify({ enabled, autoRead }));
      
      // Show a message when Read Aloud is enabled
      if (enabled) {
        toast({
          title: '🔊 Read Aloud enabled!',
          description: 'Click the speaker icon on messages to hear them.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    // Load saved settings on mount
    const saved = localStorage.getItem('childReadAloudSettings');
    if (saved) {
      try {
        setReadAloudSettings(JSON.parse(saved));
      } catch (e) {}
    }

    window.addEventListener('child-read-aloud-change', handleReadAloudChange as EventListener);
    return () => {
      window.removeEventListener('child-read-aloud-change', handleReadAloudChange as EventListener);
    };
  }, [toast]);

  // Listen for Creative Mode changes from right panel
  useEffect(() => {
    const handleCreativeModeChange = (event: CustomEvent<{ enabled: boolean; activity: string }>) => {
      const { enabled, activity } = event.detail;
      setCreativeMode({ 
        enabled, 
        activity: activity as typeof creativeMode.activity
      });
      
      // Don't show a message here - let the "Start Creating" button trigger the actual conversation
      // This just updates the state so the API knows we're in creative mode
    };

    window.addEventListener('child-creative-mode-change', handleCreativeModeChange as EventListener);
    return () => {
      window.removeEventListener('child-creative-mode-change', handleCreativeModeChange as EventListener);
    };
  }, [activeCharacter]);

  // Read Aloud function - calls TTS API
  const handleReadAloud = async (messageId: string, text: string) => {
    // Stop current playback if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If clicking the same message, just stop
    if (currentlyPlaying === messageId) {
      setCurrentlyPlaying(null);
      return;
    }

    setCurrentlyPlaying(messageId);

    try {
      console.log('[TTS] Calling /api/child/tts/speak with text length:', text.length);
      const response = await fetch('/api/child/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceType: 'chat',
          sourceId: messageId,
        }),
      });

      console.log('[TTS] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[TTS] Response data:', { hasAudioUrl: !!data.audioUrl, useBrowserTTS: data.useBrowserTTS, error: data.error });
        
        if (data.audioUrl) {
          // Play the audio
          const audio = new Audio(data.audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            setCurrentlyPlaying(null);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setCurrentlyPlaying(null);
            audioRef.current = null;
            toast({
              title: 'Could not play audio',
              status: 'warning',
              duration: 2000,
            });
          };
          await audio.play();
        } else if (data.useBrowserTTS) {
          // Fallback to browser TTS
          const utterance = new SpeechSynthesisUtterance(data.text || text);
          utterance.rate = data.speed || 1.0;
          utterance.onend = () => setCurrentlyPlaying(null);
          utterance.onerror = () => setCurrentlyPlaying(null);
          window.speechSynthesis.speak(utterance);
        }
      } else {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => setCurrentlyPlaying(null);
        utterance.onerror = () => setCurrentlyPlaying(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => setCurrentlyPlaying(null);
      utterance.onerror = () => setCurrentlyPlaying(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop Read Aloud
  const stopReadAloud = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setCurrentlyPlaying(null);
  };

  useEffect(() => {
    // Fetch initial usage and check approval status
    fetchUsage();
    checkApprovalStatus();
    
    // Fetch character and suggestions if using GooseMind
    if (useGooseMind) {
      fetchCharacterAndSuggestions();
    } else if (messages.length === 0) {
      // Add default welcome message only if no saved messages
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi there! 👋 I'm your AI helper. What would you like to talk about today?`,
        timestamp: new Date(),
      }]);
    }
  }, []);

  const fetchCharacterAndSuggestions = async () => {
    try {
      const res = await fetch(`/api/child/goosemind/chat?serviceId=${serviceId}`);
      const data = await res.json();
      
      if (res.ok) {
        if (data.character) {
          setActiveCharacter(data.character);
          
          // Only set greeting if no saved messages
          if (messages.length === 0) {
            const greetings = data.character.greetings || [];
            const greeting = greetings[Math.floor(Math.random() * greetings.length)] 
              || `${data.character.emoji} Hi there! I'm ${data.character.name}!`;
            
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: greeting,
              timestamp: new Date(),
            }]);
          }
        } else if (messages.length === 0) {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi there! 👋 I'm your AI helper. What would you like to talk about today?`,
            timestamp: new Date(),
          }]);
        }
        
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch character:', error);
      // Fallback welcome message only if no saved messages
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hi there! 👋 I'm your AI helper. What would you like to talk about today?`,
          timestamp: new Date(),
        }]);
      }
    }
  };

  const checkApprovalStatus = async () => {
    try {
      const res = await fetch('/api/child/check-approval?requestType=conversation');
      const data = await res.json();
      if (res.ok) {
        setHasApproval(data.hasApproval || !data.isChildAccount);
        if (data.hasPendingRequest) {
          toast({
            title: '⏳ Waiting for approval',
            description: 'Your parent is reviewing your request.',
            status: 'info',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
      // Default to allowing access if check fails
      setHasApproval(true);
    } finally {
      setApprovalChecked(true);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/child/dashboard');
      const data = await res.json();
      if (res.ok) {
        setUsageMinutes(data.todayUsageMinutes);
        setLimitMinutes(data.dailyLimitMinutes);
        
        if (data.remainingMinutes <= 0) {
          setIsBlocked(true);
          setBlockReason('time_limit');
        }
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  // Handle dictionary lookup command
  const handleDictionaryLookup = async (word: string) => {
    try {
      const res = await fetch(`/api/child/dictionary?word=${encodeURIComponent(word)}&source=chat`);
      if (res.ok) {
        const data = await res.json();
        const entry = data.entry;
        
        // Format a kid-friendly dictionary response
        let response = `📖 **${entry.word}** (${entry.partOfSpeech})\n\n`;
        response += `${entry.definition}\n\n`;
        
        if (entry.pronunciation) {
          response += `🔊 Say it: *${entry.pronunciation}*\n\n`;
        }
        
        if (entry.examples && entry.examples.length > 0) {
          response += `✏️ **Examples:**\n`;
          entry.examples.forEach((ex: string) => {
            response += `• ${ex}\n`;
          });
          response += '\n';
        }
        
        if (entry.synonyms && entry.synonyms.length > 0) {
          response += `🔄 **Similar words:** ${entry.synonyms.join(', ')}\n\n`;
        }
        
        if (entry.spanishTranslation) {
          response += `🇲🇽 **En español:** ${entry.spanishTranslation}\n`;
          if (entry.spanishDefinition) {
            response += `   ${entry.spanishDefinition}\n\n`;
          }
        }
        
        if (entry.funFact) {
          response += `💡 **Fun fact:** ${entry.funFact}\n`;
        }
        
        if (entry.relatedWords && entry.relatedWords.length > 0) {
          response += `\n🔍 **Explore more:** ${entry.relatedWords.join(', ')}`;
        }
        
        return response;
      }
    } catch (error) {
      console.error('[Dictionary] Lookup failed:', error);
    }
    return `I couldn't find a definition for "${word}". Try another word! 📚`;
  };

  const handleSend = async (directMessage?: string) => {
    const messageContent = directMessage || input.trim();
    if (!messageContent || loading || isBlocked) return;

    // Check if this is a story continuation request (yes, continue, tell me more, etc.)
    const isContinuationRequest = /^(yes|yeah|yep|sure|ok|okay|continue|more|tell me more|what happens next|go on|keep going|and then\??|yes!*|please!*|yes,?\s*(please|continue|more|tell me))$/i.test(messageContent.trim());
    
    // Find the last assistant message that might be a story
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const isLastMessageStory = lastAssistantMessage && lastAssistantMessage.content.length > 300 && 
      /once upon|adventure|story|tale|magical|suddenly|meanwhile|journey/i.test(lastAssistantMessage.content);
    
    // If user says "yes" or similar and last message was a story, continue it inline
    if (isContinuationRequest && isLastMessageStory && lastAssistantMessage) {
      setInput('');
      // Don't add user message to chat - just continue the story silently
      const continuation = await handleStoryContinuation(lastAssistantMessage.id);
      if (continuation) {
        // Story was continued successfully - no need to add new messages
        return;
      }
      // If continuation failed, fall through to normal message handling
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check for /define command or "what does X mean" pattern
      const defineMatch = messageContent.match(/^\/define\s+(.+)$/i) ||
                          messageContent.match(/^define\s+(.+)$/i) ||
                          messageContent.match(/what does ['"]?(\w+)['"]? mean/i) ||
                          messageContent.match(/what's the meaning of ['"]?(\w+)['"]?/i) ||
                          messageContent.match(/what is ['"]?(\w+)['"]?\??$/i);
      
      if (defineMatch) {
        const word = defineMatch[1].trim().split(/\s+/)[0]; // Get first word
        const definition = await handleDictionaryLookup(word);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-dict',
          role: 'assistant',
          content: definition,
          timestamp: new Date(),
        }]);
        setLoading(false);
        return;
      }

      // Use child chat endpoint (now routes through Goose backend with child-goosemind agent)
      const endpoint = '/api/child/chat';
      
      // Get selected character/recipe from localStorage for multi-tenant recipe loading
      const selectedRecipeId = typeof window !== 'undefined' 
        ? localStorage.getItem('childChatCharacter') 
        : null;
      
      // Build conversation history for context (last 10 messages for all modes)
      // This ensures the AI maintains context of the conversation
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === 'system' ? 'assistant' : m.role,
        content: m.content,
      }));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          message: userMessage.content,
          // Conversation ID for session continuity
          conversationId: currentConversationId || undefined,
          // Selected recipe/character for multi-tenant compliance
          recipeId: selectedRecipeId || undefined,
          // Spanish learning mode settings
          spanishMode: spanishMode.enabled ? {
            enabled: true,
            level: spanishMode.level,
            focus: spanishMode.focus,
          } : undefined,
          // Creative mode settings for inline image generation
          creativeMode: creativeMode.enabled ? {
            enabled: true,
            activity: creativeMode.activity,
          } : undefined,
          // Conversation history for context retention
          conversationHistory,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('[ChildChat] Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid response (status: ${res.status})`);
      }
      
      console.log('[ChildChat] Response status:', res.status, 'Data:', data);

      if (res.ok) {
        // Handle blocked response (returned with 200 status)
        if (data.blocked) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-blocked',
            role: 'system',
            content: data.message || "I can't help with that. Let's talk about something else! 🌟",
            timestamp: new Date(),
            wasFiltered: true,
          }]);
        } else {
          const assistantMessage: Message = {
            id: Date.now().toString() + '-response',
            role: 'assistant',
            content: data.response || "I'm thinking...",
            timestamp: new Date(),
            wasFiltered: data.wasFiltered,
            filterMessage: data.filterMessage,
          };

          setMessages(prev => [...prev, assistantMessage]);
          setUsageMinutes(data.usageMinutes || usageMinutes);
          
          // Update active character with iconPath from response
          if (data.character) {
            setActiveCharacter(data.character);
          }
        }

        if (data.wasFiltered) {
          toast({
            title: '🛡️ Content filtered',
            description: 'Some content was adjusted to keep things safe!',
            status: 'info',
            duration: 3000,
          });
        }

        if (data.usageLimitReached) {
          setIsBlocked(true);
          setBlockReason('time_limit');
        }
      } else if (res.status === 403) {
        // Content blocked or access denied
        if (data.requiresApproval) {
          onOpen(); // Show approval request modal
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-blocked',
            role: 'system',
            content: data.message || "I can't help with that. Let's talk about something else! 🌟",
            timestamp: new Date(),
            wasFiltered: true,
          }]);
        }
      } else {
        throw new Error(data.error || `Server error: ${res.status}`);
      }
    } catch (error) {
      console.error('[ChildChat] Error:', error);
      toast({
        title: 'Oops!',
        description: error instanceof Error ? error.message : 'Something went wrong. Try again!',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle image generation from creative mode
  const handleGenerateImage = async (messageId: string, prompt: string) => {
    setGeneratingImage(messageId);
    
    try {
      console.log('[Creative Mode] Generating image with prompt:', prompt);
      
      const res = await fetch('/api/child/services/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: activeCharacter?.name?.toLowerCase().includes('pusheen') ? 'cartoon' : 'pixel',
          styleLabel: activeCharacter?.name?.toLowerCase().includes('pusheen') ? 'Kawaii' : 'Minecraft',
          styleDescription: activeCharacter?.name?.toLowerCase().includes('pusheen') 
            ? 'Cute kawaii style with pastel colors' 
            : 'Blocky pixel art Minecraft style',
        }),
      });

      const data = await res.json();

      if (data.blocked) {
        toast({
          title: '🎨 Oops!',
          description: data.message || "Let's try a different design!",
          status: 'warning',
          duration: 4000,
        });
        return;
      }

      if (data.imageUrl) {
        // Store the generated image
        setGeneratedImages(prev => ({ ...prev, [messageId]: data.imageUrl }));
        
        // Add a celebration message
        const celebrationMessage: Message = {
          id: `image-ready-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Your creation is ready!** ${activeCharacter?.emoji || '🎨'}\n\nI made this just for you based on all your awesome design choices! What do you think? Want to create something else?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, celebrationMessage]);
        
        toast({
          title: '🎨 Image created!',
          description: 'Your design has been brought to life!',
          status: 'success',
          duration: 4000,
        });
      } else {
        throw new Error(data.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('[Creative Mode] Image generation error:', error);
      toast({
        title: 'Could not create image',
        description: 'Please try again!',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleApprovalRequest = async () => {
    try {
      const res = await fetch('/api/child/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'conversation',
          title: 'Chat Access Request',
          description: `Requesting to continue chatting in ${serviceName}`,
        }),
      });

      const data = await res.json();

      if (data.alreadyApproved) {
        // Already have approval - update state and allow access
        setHasApproval(true);
        toast({
          title: '✅ Already approved!',
          description: data.message || 'You already have approval. Go ahead!',
          status: 'success',
          duration: 3000,
        });
        onClose();
        return;
      }

      toast({
        title: '📨 Request sent!',
        description: 'Your parent will review your request.',
        status: 'success',
        duration: 3000,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to send request',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle story continuation - fetches more story content and updates the existing message
  const handleStoryContinuation = async (messageId: string): Promise<string | null> => {
    setStoryContinuationLoading(messageId);
    
    try {
      // Find the message to continue
      const messageToContiue = messages.find(m => m.id === messageId);
      if (!messageToContiue) return null;
      
      // Build context from the story so far
      const storyContext = messageToContiue.content;
      
      const res = await fetch('/api/child/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          message: 'Continue the story! What happens next?',
          conversationId: currentConversationId || undefined,
          // Pass the story context so AI knows what to continue
          conversationHistory: [
            { role: 'assistant', content: storyContext },
            { role: 'user', content: 'Yes! Continue the story! What happens next?' }
          ],
          // Signal this is a story continuation
          storyContinuation: true,
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.response) {
        // Update the existing message with appended content
        const continuation = data.response;
        
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              content: m.content + '\n\n📖 Chapter continues... 📖\n\n' + continuation,
            };
          }
          return m;
        }));
        
        return continuation;
      } else {
        throw new Error(data.error || 'Failed to continue story');
      }
    } catch (error) {
      console.error('[Story Continuation] Error:', error);
      toast({
        title: '📖 Oops!',
        description: 'Could not continue the story. Try again!',
        status: 'error',
        duration: 3000,
      });
      return null;
    } finally {
      setStoryContinuationLoading(null);
    }
  };

  const handleClearChat = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`child-chat-messages-${serviceId}`);
    }
    setMessages([]);
    setCurrentConversationId(null);
    // Re-fetch character greeting
    if (useGooseMind) {
      fetchCharacterAndSuggestions();
    }
    toast({
      title: '🧹 Chat cleared!',
      description: 'Starting fresh!',
      status: 'success',
      duration: 2000,
    });
  };

  // Fetch conversation history
  const fetchConversationHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/child/conversations?limit=10');
      if (res.ok) {
        const data = await res.json();
        setConversationHistory(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a previous conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/child/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        const conversation = data.conversation;
        
        if (conversation && conversation.messages) {
          // Convert messages to our format
          const loadedMessages: Message[] = conversation.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            wasFiltered: m.wasFiltered,
          }));
          
          setMessages(loadedMessages);
          setCurrentConversationId(conversationId);
          
          // Update character if different
          if (conversation.characterName) {
            setActiveCharacter({
              name: conversation.characterName,
              emoji: conversation.characterEmoji || '🤖',
            });
          }
          
          toast({
            title: '📖 Conversation loaded!',
            description: `Continuing chat with ${conversation.characterName || 'your friend'}`,
            status: 'success',
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast({
        title: 'Failed to load conversation',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Format relative time for display
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const usagePercent = Math.min(100, (usageMinutes / limitMinutes) * 100);
  const remainingMinutes = Math.max(0, limitMinutes - usageMinutes);

  // Get theme colors from context
  const { colors, childExtras } = useChildTheme();
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.chat || backgroundImages?.default;
  
  // Background mode state
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  return (
    <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
    <Box
      minH="calc(100vh - 60px)"
      bg={colors.background}
      backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
      backgroundRepeat={bgStyles.backgroundRepeat}
      backgroundSize={bgStyles.backgroundSize}
      backgroundPosition={bgStyles.backgroundPosition}
      backgroundAttachment={bgStyles.backgroundAttachment}
    >
      {/* Header */}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        boxShadow="lg"
        background={childExtras?.decorations?.headerBanner?.background || 'rgba(255,255,255,0.95)'}
        backgroundImage={[
          childExtras?.decorations?.headerBanner?.pattern,
          childExtras?.decorations?.headerBanner?.texture
        ].filter(Boolean).join(', ')}
        backgroundSize="80px 80px, auto"
        backgroundRepeat="repeat, repeat"
        backgroundPosition="0 0, 0 0"
      >
        <Container maxW="container.md" py={headerPadding} px={{ base: 3, md: 4 }}>
          <HStack justify="space-between" color={childExtras?.decorations?.headerBanner ? 'white' : 'inherit'}>
            <HStack spacing={{ base: 2, md: 3 }}>
              {onBack && (
                <IconButton
                  icon={<FiArrowLeft />}
                  aria-label="Back"
                  variant="ghost"
                  size={{ base: 'sm', md: 'md' }}
                  onClick={onBack}
                  borderRadius="full"
                />
              )}
              <Text fontSize={{ base: 'xl', md: '2xl' }}>{activeCharacter?.emoji || serviceEmoji}</Text>
              {!isMobile && (
                <Text fontWeight="bold" fontSize="lg">
                  {activeCharacter?.name || serviceName}
                </Text>
              )}
              {activeCharacter && !isMobile && (
                <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                  GooseMind
                </Badge>
              )}
              {spanishMode.enabled && (
                <Badge colorScheme="orange" variant="solid" fontSize="xs">
                  🇲🇽 Español
                </Badge>
              )}
            </HStack>
            
            <HStack spacing={{ base: 2, md: 4 }}>
              {/* Conversation History Button */}
              <Popover 
                placement="bottom-end" 
                onOpen={fetchConversationHistory}
              >
                <PopoverTrigger>
                  <IconButton
                    icon={<FiMessageSquare />}
                    aria-label="Previous chats"
                    variant="ghost"
                    size={{ base: 'sm', md: 'md' }}
                    borderRadius="full"
                    colorScheme="blue"
                    title="Previous chats"
                  />
                </PopoverTrigger>
                <PopoverContent 
                  w={{ base: '280px', md: '320px' }} 
                  maxH="400px" 
                  overflowY="auto"
                  bg="white"
                  color="gray.800"
                >
                  <PopoverHeader fontWeight="bold" borderBottomWidth="1px">
                    📖 Previous Chats
                  </PopoverHeader>
                  <PopoverCloseButton />
                  <PopoverBody p={2}>
                    {loadingHistory ? (
                      <HStack justify="center" py={4}>
                        <Spinner size="sm" />
                        <Text fontSize="sm">Loading...</Text>
                      </HStack>
                    ) : conversationHistory.length === 0 ? (
                      <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                        No previous chats yet! Start chatting to save your conversations.
                      </Text>
                    ) : (
                      <VStack spacing={2} align="stretch">
                        {conversationHistory.map((conv) => (
                          <Box
                            key={conv.id}
                            p={2}
                            borderRadius="md"
                            bg={currentConversationId === conv.id ? 'blue.50' : 'gray.50'}
                            borderWidth={currentConversationId === conv.id ? '2px' : '1px'}
                            borderColor={currentConversationId === conv.id ? 'blue.300' : 'gray.200'}
                            cursor="pointer"
                            _hover={{ bg: 'blue.50', borderColor: 'blue.200' }}
                            onClick={() => loadConversation(conv.id)}
                          >
                            <HStack justify="space-between" mb={1}>
                              <HStack spacing={1}>
                                <Text fontSize="md">{conv.characterEmoji || '🤖'}</Text>
                                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                                  {conv.characterName || 'Chat'}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {formatRelativeTime(conv.lastMessageAt)}
                              </Text>
                            </HStack>
                            <HStack spacing={1} flexWrap="wrap">
                              <Badge size="sm" colorScheme="gray" fontSize="xs">
                                {conv.messageCount} msgs
                              </Badge>
                              {conv.creativeMode && (
                                <Badge size="sm" colorScheme="purple" fontSize="xs">
                                  🎨 Creative
                                </Badge>
                              )}
                              {conv.spanishMode && (
                                <Badge size="sm" colorScheme="orange" fontSize="xs">
                                  🇲🇽
                                </Badge>
                              )}
                            </HStack>
                            {conv.summary && (
                              <Text fontSize="xs" color="gray.600" mt={1} noOfLines={1}>
                                {conv.summary}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              {messages.length > 1 && (
                <IconButton
                  icon={<FiTrash2 />}
                  aria-label="Clear chat"
                  variant="ghost"
                  size={{ base: 'sm', md: 'md' }}
                  onClick={handleClearChat}
                  borderRadius="full"
                  colorScheme="red"
                  title="Clear chat history"
                />
              )}
              <HStack spacing={{ base: 1, md: 2 }}>
                <FiClock size={isMobile ? 12 : 16} />
                <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                  {remainingMinutes}m
                </Text>
              </HStack>
              {!isMobile && (
                <Box w="100px">
                  <Progress
                    value={usagePercent}
                    size="sm"
                    colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                    borderRadius="full"
                  />
                </Box>
              )}
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Messages - with semi-transparent overlay for readability */}
      <Box 
        bg="rgba(255,255,255,0.85)" 
        minH="calc(100vh - 140px)"
        css={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Container maxW="container.md" pt={{ base: 4, md: 8 }} pb={{ base: 4, md: 6 }} px={{ base: 3, md: 4 }}>
          <VStack spacing={{ base: 3, md: 4 }} align="stretch" minH="calc(100vh - 280px)" pb={{ base: '120px', md: '100px' }}>
          {messages.map((message) => (
            <HStack
              key={message.id}
              justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
              align="start"
              spacing={{ base: 2, md: 3 }}
            >
              {message.role !== 'user' && (
                <Box
                  bg="white"
                  borderRadius="full"
                  w={avatarSize}
                  h={avatarSize}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize={{ base: 'md', md: 'xl' }}
                  boxShadow="md"
                  flexShrink={0}
                  overflow="hidden"
                >
                  {message.role === 'system' ? '🛡️' : (
                    activeCharacter?.iconPath ? (
                      <Image 
                        src={activeCharacter.iconPath} 
                        alt={activeCharacter.name || 'Character'} 
                        boxSize={avatarSize}
                        objectFit="cover"
                      />
                    ) : (activeCharacter?.emoji || '🤖')
                  )}
                </Box>
              )}
              
              {(() => {
                // Parse choices and image generation tags
                const { text: textWithoutChoices, choices } = message.role === 'assistant' 
                  ? parseInteractiveChoices(message.content)
                  : { text: message.content, choices: [] };
                const { text: messageText, imagePrompt } = message.role === 'assistant'
                  ? parseImageGenerationTag(textWithoutChoices)
                  : { text: textWithoutChoices, imagePrompt: null };
                
                // Check if we should use Minecraft theme (only for Luca's account with minecraft theme)
                const { childExtras } = useChildTheme();
                const isMinecraftTheme = childExtras?.themeName === 'minecraft';
                const isMinecraftChar = isMinecraftTheme && (
                  activeCharacter?.name?.toLowerCase().includes('steve') || 
                  activeCharacter?.name?.toLowerCase().includes('alex') ||
                  activeCharacter?.name?.toLowerCase().includes('creeper') ||
                  activeCharacter?.name?.toLowerCase().includes('enderman') ||
                  activeCharacter?.name?.toLowerCase().includes('villager') ||
                  activeCharacter?.name?.toLowerCase().includes('iron golem') ||
                  activeCharacter?.name?.toLowerCase().includes('redstone')
                );
                
                return (
                  <Box
                    maxW={maxMessageWidth}
                    bg={
                      message.role === 'user'
                        ? (isMinecraftChar ? '#4CAF50' : colors.primary)
                        : message.wasFiltered
                        ? 'orange.100'
                        : (isMinecraftChar ? '#8B4513' : colors.backgroundSecondary)
                    }
                    color={message.role === 'user' ? (isMinecraftChar ? '#FFFFFF' : 'white') : (isMinecraftChar ? '#F5F5DC' : colors.text)}
                    px={{ base: 3, md: 4 }}
                    py={{ base: 2, md: 3 }}
                    borderRadius={isMinecraftChar ? '4px' : '2xl'}
                    borderBottomRightRadius={message.role === 'user' ? (isMinecraftChar ? '4px' : 'sm') : (isMinecraftChar ? '4px' : '2xl')}
                    borderBottomLeftRadius={message.role !== 'user' ? (isMinecraftChar ? '4px' : 'sm') : (isMinecraftChar ? '4px' : '2xl')}
                    boxShadow={isMinecraftChar 
                      ? `4px 4px 0px ${message.role === 'user' ? '#2E7D32' : '#5D4037'}, 2px 2px 0px rgba(0,0,0,0.3)` 
                      : 'md'}
                    border={isMinecraftChar ? '2px solid' : 'none'}
                    borderColor={isMinecraftChar ? (message.role === 'user' ? '#66BB6A' : '#6D4C41') : 'transparent'}
                    position="relative"
                    _before={isMinecraftChar ? {
                      content: '""',
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      right: '2px',
                      height: '30%',
                      bg: message.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
                      borderRadius: '2px',
                      pointerEvents: 'none',
                    } : undefined}
                    fontFamily={isMinecraftChar ? '"VT323", "Press Start 2P", "Courier New", monospace' : 'inherit'}
                    fontSize={isMinecraftChar ? { base: '14px', md: '16px' } : messageFontSize}
                    lineHeight={isMinecraftChar ? '1.5' : 'normal'}
                    fontWeight={isMinecraftChar ? '400' : 'normal'}
                    sx={isMinecraftChar ? {
                      imageRendering: 'pixelated',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    } : undefined}
                  >
                    {message.role === 'assistant' ? (
                      <HighlightToDefine>
                        <ChildMessageRenderer 
                          content={messageText} 
                          theme={activeCharacter?.name?.toLowerCase().includes('pusheen') ? 'pusheen' : 
                                 activeCharacter?.name?.toLowerCase().includes('steve') || activeCharacter?.name?.toLowerCase().includes('alex') ? 'minecraft' : 
                                 'default'}
                          fontSize={messageFontSize}
                          characterName={activeCharacter?.name || 'Buddy'}
                          characterEmoji={activeCharacter?.emoji || '🤖'}
                          characterColor={activeCharacter?.name?.toLowerCase().includes('pusheen') ? 'pink' : 
                                         activeCharacter?.name?.toLowerCase().includes('steve') || activeCharacter?.name?.toLowerCase().includes('alex') ? 'green' : 
                                         'purple'}
                          messageId={message.id}
                          onContinueStory={() => handleStoryContinuation(message.id)}
                          isLoadingContinuation={storyContinuationLoading === message.id}
                        />
                      </HighlightToDefine>
                    ) : (
                      <Text whiteSpace="pre-wrap" fontSize={messageFontSize}>{messageText}</Text>
                    )}
                    
                    {/* Read Aloud Button - only show for AI messages when enabled */}
                    {readAloudSettings.enabled && message.role === 'assistant' && (
                      <HStack mt={2} spacing={1}>
                        <IconButton
                          icon={currentlyPlaying === message.id ? <FiVolumeX /> : <FiVolume2 />}
                          aria-label={currentlyPlaying === message.id ? 'Stop reading' : 'Read aloud'}
                          size="xs"
                          variant="ghost"
                          colorScheme={currentlyPlaying === message.id ? 'red' : 'blue'}
                          borderRadius="full"
                          onClick={() => {
                            if (currentlyPlaying === message.id) {
                              stopReadAloud();
                            } else {
                              handleReadAloud(message.id, messageText);
                            }
                          }}
                          title={currentlyPlaying === message.id ? 'Stop' : 'Read aloud'}
                        />
                        {currentlyPlaying === message.id && (
                          <Text fontSize="2xs" color="blue.500" fontWeight="medium">
                            🔊 Playing...
                          </Text>
                        )}
                      </HStack>
                    )}
                    
                    {/* Interactive Choices - hide when content is a story (booklet has its own buttons) */}
                    {choices.length > 0 && !isStoryContent(messageText) && (
                      <VStack spacing={2} mt={3} align="stretch">
                        <Text fontSize="xs" fontWeight="bold" color="gray.500">
                          👆 Tap to answer:
                        </Text>
                        <HStack flexWrap="wrap" spacing={2}>
                          {choices.map((choice) => (
                            <Button
                              key={choice.id}
                              size="sm"
                              colorScheme={colors.primary.includes('green') ? 'green' : 
                                          colors.primary.includes('purple') ? 'purple' : 
                                          colors.primary.includes('blue') ? 'blue' : 'teal'}
                              variant="outline"
                              borderRadius="full"
                              px={4}
                              py={2}
                              h="auto"
                              whiteSpace="normal"
                              textAlign="left"
                              onClick={() => {
                                // Send the choice directly
                                handleSend(choice.text);
                              }}
                              _hover={{
                                bg: colors.primary,
                                color: 'white',
                                transform: 'scale(1.02)',
                              }}
                              transition="all 0.2s"
                            >
                              <HStack spacing={1}>
                                <Badge 
                                  colorScheme="gray" 
                                  borderRadius="full" 
                                  px={2}
                                  fontSize="xs"
                                >
                                  {choice.id}
                                </Badge>
                                <Text fontSize="sm">{choice.text}</Text>
                              </HStack>
                            </Button>
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    {/* Image Generation Button - Creative Mode */}
                    {imagePrompt && !generatedImages[message.id] && (
                      <VStack spacing={3} mt={4} align="stretch">
                        <Button
                          colorScheme="pink"
                          size="lg"
                          borderRadius="xl"
                          leftIcon={<Text>🎨</Text>}
                          isLoading={generatingImage === message.id}
                          loadingText="Creating your image..."
                          onClick={() => handleGenerateImage(message.id, imagePrompt)}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          ✨ Generate My Creation!
                        </Button>
                        {generatingImage === message.id && (
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            This may take a minute... Your creation is being made! 🎨
                          </Text>
                        )}
                      </VStack>
                    )}

                    {/* Generated Image Display */}
                    {generatedImages[message.id] && (
                      <VStack spacing={2} mt={4} align="stretch">
                        <Box
                          borderRadius="xl"
                          overflow="hidden"
                          boxShadow="lg"
                          border="3px solid"
                          borderColor="pink.200"
                          cursor="pointer"
                          onClick={() => setExpandedImage(generatedImages[message.id])}
                          _hover={{ transform: 'scale(1.02)', borderColor: 'pink.400' }}
                          transition="all 0.2s"
                          position="relative"
                        >
                          <Image
                            src={generatedImages[message.id]}
                            alt="Your creation"
                            w="full"
                            h={{ base: '200px', md: '280px' }}
                            objectFit="cover"
                            bg="gray.100"
                          />
                          <Box
                            position="absolute"
                            bottom={2}
                            right={2}
                            bg="blackAlpha.600"
                            color="white"
                            px={2}
                            py={1}
                            borderRadius="md"
                            fontSize="xs"
                          >
                            🔍 Tap to expand
                          </Box>
                        </Box>
                        <Badge colorScheme="pink" alignSelf="center" fontSize="xs">
                          🌟 Created by You!
                        </Badge>
                      </VStack>
                    )}
                    
                    {message.wasFiltered && (
                      <Badge colorScheme="orange" mt={2} fontSize="xs">
                        🛡️ Safe mode active
                      </Badge>
                    )}
                  </Box>
                );
              })()}

              {message.role === 'user' && (
                <Box
                  bg="white"
                  borderRadius="full"
                  w={avatarSize}
                  h={avatarSize}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize={{ base: 'md', md: 'xl' }}
                  boxShadow="md"
                  overflow="hidden"
                  flexShrink={0}
                >
                  {avatarEmoji.startsWith('/') ? (
                    <Image src={avatarEmoji} alt="avatar" boxSize={avatarSize} objectFit="cover" />
                  ) : (
                    avatarEmoji
                  )}
                </Box>
              )}
            </HStack>
          ))}

          {loading && (
            <HStack justify="flex-start" align="start" spacing={{ base: 2, md: 3 }}>
              <Box
                bg="white"
                borderRadius="full"
                w={avatarSize}
                h={avatarSize}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={{ base: 'md', md: 'xl' }}
                boxShadow="md"
                flexShrink={0}
              >
                {activeCharacter?.emoji || '🤖'}
              </Box>
              <Box bg="white" px={{ base: 3, md: 4 }} py={{ base: 2, md: 3 }} borderRadius="2xl" boxShadow="md">
                <HStack spacing={2}>
                  <Spinner size="sm" color="purple.500" />
                  <Text color="gray.500" fontSize={messageFontSize}>
                    {isMobile ? 'Thinking...' : (activeCharacter ? `${activeCharacter.name} is thinking...` : 'Thinking...')}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          )}

          <div ref={messagesEndRef} />
          </VStack>
        </Container>
      </Box>

      {/* Input - Compact mode with voice input */}
      <Box
        position="fixed"
        bottom={0}
        left={{ base: 0, md: '80px' }}
        right={{ base: 0, md: isPanelOpen ? `${panelWidth}px` : '56px' }}
        bg="white"
        boxShadow="0 -4px 20px rgba(0,0,0,0.1)"
        py={{ base: 2, md: 3 }}
        pb={{ base: 'calc(env(safe-area-inset-bottom) + 8px)', md: 3 }}
        transition="right 0.2s ease-out"
        zIndex={999}
      >
        <Container maxW="container.md" px={{ base: 3, md: 4 }}>
          {isBlocked ? (
            <Alert status="warning" borderRadius="xl" fontSize={{ base: 'sm', md: 'md' }}>
              <AlertIcon />
              <Text>
                {blockReason === 'time_limit'
                  ? "⏰ Time's up for today! Come back tomorrow!"
                  : "🔒 Chat is currently locked."}
              </Text>
            </Alert>
          ) : (
            <ChildChatInput
              showQuickRepliesInline={true}
              onSend={(message) => {
                setInput(message);
                // Trigger send with the message
                setTimeout(() => {
                  const syntheticInput = message;
                  if (syntheticInput.trim()) {
                    setInput('');
                    // Call handleSend logic directly
                    const newMessage: Message = {
                      id: Date.now().toString(),
                      role: 'user',
                      content: syntheticInput,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, newMessage]);
                    setLoading(true);
                    
                    // Make API call
                    fetch('/api/child/goosemind/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: syntheticInput,
                        characterId: activeCharacter?.id,
                        characterName: activeCharacter?.name,
                        spanishMode,
                      }),
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.response) {
                          const aiMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: data.response,
                            timestamp: new Date(),
                          };
                          setMessages(prev => [...prev, aiMessage]);
                          if (data.remainingMinutes !== undefined) {
                            // Update remaining minutes if available
                          }
                        }
                      })
                      .catch(err => {
                        console.error('Chat error:', err);
                        const errorMessage: Message = {
                          id: (Date.now() + 1).toString(),
                          role: 'assistant',
                          content: "Oops! Something went wrong. Can you try again? 🤔",
                          timestamp: new Date(),
                        };
                        setMessages(prev => [...prev, errorMessage]);
                      })
                      .finally(() => setLoading(false));
                  }
                }, 0);
              }}
              isLoading={loading}
              placeholder={isMobile ? "Type or speak..." : "Type your message or tap 🎤 to speak..."}
              mode="compact"
              showVoiceInput={true}
              disabled={isBlocked}
              quickReplies={[
                { emoji: '👋', text: 'Hi!', message: 'Hi! How are you today?' },
                { emoji: '📖', text: 'Story', message: 'Tell me a fun story!' },
                { emoji: '🎮', text: 'Game', message: "Let's play a game!" },
                { emoji: '📚', text: 'Learn', message: 'Teach me something cool!' },
                { emoji: '🤔', text: 'More', message: 'Tell me more about that!' },
                { emoji: '❓', text: 'Help', message: 'I need help with something.' },
              ]}
            />
          )}
        </Container>
      </Box>

      {/* Approval Request Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl" mx={4}>
          <ModalHeader textAlign="center">
            <Text fontSize="3xl" mb={2}>🔐</Text>
            Ask Your Parent
          </ModalHeader>
          <ModalBody textAlign="center">
            <Text>
              This needs your parent's permission. Would you like to send them a request?
            </Text>
          </ModalBody>
          <ModalFooter justifyContent="center">
            <Button variant="ghost" mr={3} onClick={onClose}>
              Not now
            </Button>
            <Button
              colorScheme="purple"
              borderRadius="full"
              onClick={handleApprovalRequest}
            >
              Ask Parent 📨
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Expanded Image Modal */}
      <Modal isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none" maxW="90vw" maxH="90vh">
          <ModalBody p={0} display="flex" justifyContent="center" alignItems="center">
            <Box position="relative">
              <Image
                src={expandedImage || ''}
                alt="Your creation - full size"
                maxW="90vw"
                maxH="85vh"
                objectFit="contain"
                borderRadius="xl"
                boxShadow="2xl"
              />
              <HStack
                position="absolute"
                bottom={4}
                left="50%"
                transform="translateX(-50%)"
                spacing={3}
              >
                <Button
                  colorScheme="pink"
                  size="sm"
                  borderRadius="full"
                  leftIcon={<Text>💾</Text>}
                  onClick={() => {
                    if (expandedImage) {
                      const link = document.createElement('a');
                      link.href = expandedImage;
                      link.download = `my-creation-${Date.now()}.png`;
                      link.click();
                    }
                  }}
                >
                  Save
                </Button>
                <Button
                  colorScheme="gray"
                  size="sm"
                  borderRadius="full"
                  onClick={() => setExpandedImage(null)}
                >
                  Close
                </Button>
              </HStack>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
    </BackgroundContextMenu>
  );
}

export default ChildChatUI;
