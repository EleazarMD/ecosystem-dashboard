/**
 * Tesla Dashboard
 * 
 * In-car productivity dashboard optimized for Tesla infotainment screens.
 * Auto-activates Tesla theme based on car's dark/light mode.
 * 
 * Features:
 * - Voice Agent (Nova) — hands-free AI assistant
 * - Email quick view — inbox summary, urgent items
 * - Calendar — today's schedule, upcoming events
 * - Travel — navigation, distance tracking, trip info
 * - Charging — battery status, nearby chargers
 * - Research — quick knowledge queries
 * - Workspace — notes and documents
 */

import React, { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  VStack,
  HStack,
  Icon,
  IconButton,
  Badge,
  Progress,
  Spinner,
  useToast,
  Collapse,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Tooltip,
  Divider,
  Input,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
} from '@chakra-ui/react';
import {
  Mic,
  Mail,
  Calendar,
  Navigation,
  Battery,
  Search,
  FileText,
  Clock,
  MapPin,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Settings,
  Home,
  Globe,
  Brain,
  Cloud,
  Server,
  MessageSquare,
  Trash2,
  Plus,
  History,
  MicOff,
  X,
  Send,
  Sparkles,
  Thermometer,
  Car,
  CloudSun,
  ShoppingCart,
  Play,
  BookOpen,
  Map,
  Newspaper,
  TrendingUp,
  ExternalLink,
  Monitor,
  Bookmark,
  Compass,
  Video,
  Coffee,
  Radio,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import { useColorModeValue, useColorMode } from '@chakra-ui/react';
import { useTeslaSettings } from '@/hooks/useTeslaSettings';
import TeslaSettingsDrawer from '@/components/tesla/TeslaSettingsDrawer';
import TeslaFuturisticTheme from '@/components/tesla/TeslaFuturisticTheme';
import VncKeyboardRelay from '@/components/tesla/VncKeyboardRelay';

// Icon name → component mapping for dynamic bookmarks
const ICON_MAP: Record<string, any> = {
  Play, ShoppingCart, BookOpen, Map, Newspaper, TrendingUp,
  Globe, Search, Mail, Coffee, Radio, FileText, Video,
  Monitor, Brain, Home, Calendar, Settings, Compass,
  Bookmark, ExternalLink, Navigation, Zap, MapPin,
};


// Mock data for demo - replace with real API calls
const mockEmailSummary = {
  unread: 12,
  urgent: 2,
  recent: [
    { from: 'Amazon', subject: 'Your order has shipped', time: '10m ago' },
    { from: 'Calendar', subject: 'Meeting in 30 minutes', time: '25m ago' },
    { from: 'Bank', subject: 'Transaction alert', time: '1h ago' },
  ],
};

const mockCalendarEvents = [
  { title: 'Team Standup', time: '2:00 PM', location: 'Zoom', isNext: true },
  { title: 'Client Call', time: '3:30 PM', location: 'Phone' },
  { title: 'Gym', time: '6:00 PM', location: 'Lifetime Fitness' },
];

const mockTripInfo = {
  destination: 'Home',
  eta: '25 min',
  distance: '18.3 mi',
  traffic: 'Light',
};

const mockChargingInfo = {
  batteryPercent: 72,
  range: '198 mi',
  charging: false,
  nearbyChargers: 3,
};

// ThinkingCard component for collapsible reasoning display
interface ThinkingCardProps {
  toolName: string;
  thinkingText: string;
  isExpanded: boolean;
  onToggle: () => void;
  getToolDisplay: (name: string) => { icon: typeof Search; color: string; label: string; emoji: string };
  bgHover: string;
  bgCard: string;
  borderColor: string;
  textSecondary: string;
}

function ThinkingCard({
  toolName,
  thinkingText,
  isExpanded,
  onToggle,
  getToolDisplay,
  bgHover,
  bgCard,
  borderColor,
  textSecondary,
}: ThinkingCardProps) {
  const toolDisplay = getToolDisplay(toolName);
  const ToolIcon = toolDisplay.icon;
  
  return (
    <Box
      alignSelf="flex-start"
      maxW="90%"
      bg={bgHover}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="16px"
      overflow="hidden"
    >
      {/* Collapsible header */}
      <HStack 
        spacing={2} 
        px={4} 
        py={3}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: bgCard }}
        transition="background 0.2s"
      >
        <Box
          w="24px"
          h="24px"
          borderRadius="full"
          bg={toolDisplay.color}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={ToolIcon} boxSize={3} color="white" />
        </Box>
        <Text fontWeight="semibold" fontSize="sm" color={toolDisplay.color}>
          {toolDisplay.label}
        </Text>
        {toolName && (
          <Badge 
            bg={`${toolDisplay.color.split('.')[0]}.100`}
            color={toolDisplay.color}
            fontSize="xs" 
            borderRadius="full"
          >
            1 section
          </Badge>
        )}
        <Box flex={1} />
        <Icon 
          as={isExpanded ? ChevronUp : ChevronDown} 
          boxSize={4} 
          color={textSecondary} 
        />
      </HStack>
      
      {/* Collapsible content */}
      <Collapse in={isExpanded} animateOpacity>
        <Box px={4} pb={3} pt={1}>
          <VStack align="start" spacing={2}>
            <HStack spacing={2}>
              <Text fontSize="sm">{toolDisplay.emoji}</Text>
              <Text fontSize="sm" color={textSecondary}>
                {thinkingText || '💭 Processing...'}
              </Text>
            </HStack>
            {/* Show tool completion message */}
            {thinkingText.includes('✅') && (
              <Text fontSize="xs" color="green.500" fontWeight="medium">
                {thinkingText}
              </Text>
            )}
          </VStack>
        </Box>
      </Collapse>
      
      {/* Animated processing indicator */}
      <HStack spacing={1} px={4} pb={3} justify="flex-start">
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            w="3px"
            borderRadius="full"
            bg={toolDisplay.color}
            sx={{
              '@keyframes thinkingWave': {
                '0%, 100%': { height: '4px', opacity: 0.4 },
                '50%': { height: '16px', opacity: 1 },
              },
              animation: 'thinkingWave 0.8s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
              height: '4px',
            }}
          />
        ))}
        <Text fontSize="xs" color={textSecondary} ml={2}>
          Processing...
        </Text>
      </HStack>
    </Box>
  );
}

const VncBrowser = memo(React.forwardRef<HTMLIFrameElement, { url?: string }>(
  function VncBrowser({ url }, ref) {
    const src = url || 'https://vnc.hyperspaceanalytics.com/vnc.html?autoconnect=true&resize=scale&show_dot=true';
    return (
      <Box
        as="iframe"
        ref={ref}
        src={src}
        w="100%"
        h="100%"
        border="none"
        display="block"
        title="Agent Browser Preview"
        allow="clipboard-read; clipboard-write; fullscreen; autoplay; encrypted-media"
        // @ts-ignore — allowFullScreen is valid on iframes
        allowFullScreen
      />
    );
  }
), (prev, next) => prev.url === next.url);

export default function TeslaDashboard() {
  const router = useRouter();
  const toast = useToast();
  const { colorMode, setColorMode } = useColorMode();
  const { isOpen: isEmailOpen, onOpen: onEmailOpen, onClose: onEmailClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();

  // Tesla settings (localStorage + API sync)
  const {
    settings: teslaSettings,
    isSaving: isSettingsSaving,
    updateSettings: updateTeslaSettings,
    updateVnc,
    updateBookmarks,
    addBookmark,
    removeBookmark,
    vncUrl,
  } = useTeslaSettings();

  // Theme colors
  const bgBase = useColorModeValue('gray.50', 'gray.900');
  const bgCard = useColorModeValue('white', 'gray.800');
  const bgHover = useColorModeValue('gray.100', 'gray.700');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  const successColor = useColorModeValue('green.500', 'green.400');
  const warningColor = useColorModeValue('orange.500', 'orange.400');
  const cardAccentBg = useColorModeValue('gray.50', 'gray.700');
  const subtleBorder = useColorModeValue('gray.100', 'gray.600');
  const iconBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');
  const cardGlow = useColorModeValue('0 1px 3px rgba(0,0,0,0.08)', '0 1px 3px rgba(0,0,0,0.3)');

  // Voice state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false); // UI state (text or voice)
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  
  // VNC iframe ref for keyboard relay
  const vncIframeRef = useRef<HTMLIFrameElement>(null);

  // Swipeable pages state
  const [currentPage, setCurrentPage] = useState(0);
  const [isBrowserExpanded, setIsBrowserExpanded] = useState(false);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  
  // Wrap setCurrentPage to log all calls
  const setCurrentPageWithLog = useCallback((value: number | ((prev: number) => number)) => {
    const newValue = typeof value === 'function' ? value(currentPage) : value;
    console.log('[Tesla] setCurrentPage called:', newValue);
    console.trace('[Tesla] setCurrentPage stack trace');
    setCurrentPage(newValue);
  }, [currentPage]);
  
  // Debug: log page changes with stack trace
  useEffect(() => {
    console.log('[Tesla] Current page changed to:', currentPage);
    console.trace('[Tesla] Page change stack trace');
  }, [currentPage]);

  // Sync theme from Tesla settings
  useEffect(() => {
    if (teslaSettings.display.theme === 'auto') return;
    if (teslaSettings.display.theme !== colorMode) {
      setColorMode(teslaSettings.display.theme);
    }
  }, [teslaSettings.display.theme, colorMode, setColorMode]);
  
  
  // Conversation state for inline voice UI
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Thinking/reasoning state (like iOS ThinkingCard)
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [currentToolCall, setCurrentToolCall] = useState<{
    name: string;
    args?: Record<string, unknown>;
  } | null>(null);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  
  // Text chat input (parallel feature to voice mirror)
  const [textInput, setTextInput] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  
  
  // Conversation history management (like iOS History) - synced with Nova API
  const [conversationId, setConversationId] = useState<string>(() => `conv-${Date.now()}`);
  const [savedConversations, setSavedConversations] = useState<Array<{
    id: string;
    session_id?: string;
    title: string;
    preview: string;
    message_count: number;
    created_at: number;
    updated_at: number;
  }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // History drawer
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  
  // Email and Calendar data
  const [emailData, setEmailData] = useState<{
    unread: number;
    urgent: number;
    recent: Array<{ 
      from: string; 
      subject: string; 
      date: string;
      ai_summary?: string;
      ai_urgency?: string;
      ai_sentiment?: string;
      ai_intent?: string;
      ai_requires_response?: boolean;
    }>;
  } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    title: string;
    start: string;
    end: string;
    location?: string;
  }>>([]);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  
  // Vehicle data from Tesla Relay
  const [vehicleData, setVehicleData] = useState<{
    vin?: string;
    display_name?: string;
    model?: string;
    state?: string;
    battery_level?: number;
    battery_range?: number;
    charging_state?: string;
    is_climate_on?: boolean;
    inside_temp?: number;
    outside_temp?: number;
    locked?: boolean;
    odometer?: number;
  } | null>(null);
  const [vehicles, setVehicles] = useState<Array<{
    vin: string;
    display_name: string;
    model: string;
    state: string;
  }>>([]);
  const [selectedVin, setSelectedVin] = useState<string | null>(null);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(false);

  // Fetch vehicles list from Tesla Relay
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch('/api/tesla/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
        // Auto-select first online vehicle, or first vehicle if none online
        if (data.length > 0 && !selectedVin) {
          const onlineVehicle = data.find((v: any) => v.state === 'online');
          setSelectedVin(onlineVehicle?.vin || data[0].vin);
        }
      }
    } catch (error) {
      console.error('[Tesla] Failed to fetch vehicles:', error);
    }
  }, [selectedVin]);

  // Fetch vehicle data from Tesla Relay
  const fetchVehicleData = useCallback(async (vin: string) => {
    setIsLoadingVehicle(true);
    try {
      const response = await fetch(`/api/tesla/vehicles/${vin}/data`);
      if (response.ok) {
        const data = await response.json();
        setVehicleData(data);
      }
    } catch (error) {
      console.error('[Tesla] Failed to fetch vehicle data:', error);
    } finally {
      setIsLoadingVehicle(false);
    }
  }, []);

  // Fetch vehicle data when selected VIN changes
  useEffect(() => {
    if (selectedVin) {
      fetchVehicleData(selectedVin);
    }
  }, [selectedVin, fetchVehicleData]);

  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);
  
  // Fetch email data from Hermes Core
  const fetchEmailData = useCallback(async () => {
    setIsLoadingEmail(true);
    try {
      const response = await fetch('/api/hermes/emails/recent?limit=10');
      if (response.ok) {
        const data = await response.json();
        // Transform Hermes response to match our UI format
        const emails = data.emails || [];
        
        // Sort by date descending (most recent first)
        const sortedEmails = [...emails].sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        const urgentCount = sortedEmails.filter((e: any) => e.ai_urgency === 'high').length;
        
        setEmailData({
          unread: data.count || 0,
          urgent: urgentCount,
          recent: sortedEmails.slice(0, 3).map((email: any) => ({
            from: email.from_name || email.from_email,
            subject: email.subject,
            date: email.date,
            ai_summary: email.ai_summary,
            ai_urgency: email.ai_urgency,
            ai_sentiment: email.ai_sentiment,
            ai_intent: email.ai_intent,
            ai_requires_response: email.ai_requires_response,
          })),
        });
      }
    } catch (error) {
      console.error('[Tesla] Failed to fetch email data:', error);
    } finally {
      setIsLoadingEmail(false);
    }
  }, []);
  
  // Fetch calendar events from Hermes Core
  const fetchCalendarEvents = useCallback(async () => {
    setIsLoadingCalendar(true);
    try {
      const response = await fetch('/api/hermes/calendar/upcoming?limit=20');
      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        
        // Filter for upcoming events only (start time after now)
        const upcomingEvents = (data.events || [])
          .filter((event: any) => new Date(event.start_time) > now)
          .sort((a: any, b: any) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          )
          .slice(0, 3)
          .map((event: any) => ({
            title: event.title,
            start: event.start_time,
            end: event.end_time,
            location: event.location,
          }));
        
        setCalendarEvents(upcomingEvents);
      }
    } catch (error) {
      console.error('[Tesla] Failed to fetch calendar events:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);
  
  // Fetch conversation history from Nova API
  const fetchConversationHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/nova/conversations?user_id=eleazar&limit=20');
      if (response.ok) {
        const data = await response.json();
        setSavedConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('[Tesla] Failed to fetch conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);
  
  // Load a specific conversation from Nova API
  const loadConversationFromAPI = useCallback(async (convId: string) => {
    try {
      const response = await fetch(`/api/nova/conversations/${convId}?user_id=eleazar`);
      if (response.ok) {
        const data = await response.json();
        // Convert API messages to our format
        const messages = (data.messages || []).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.timestamp * 1000),
        }));
        setConversationHistory(messages);
        setConversationId(convId);
        return true;
      }
    } catch (error) {
      console.error('[Tesla] Failed to load conversation:', error);
    }
    return false;
  }, []);
  
  // Delete a conversation via Nova API
  const deleteConversationFromAPI = useCallback(async (convId: string) => {
    try {
      const response = await fetch(`/api/nova/conversations/${convId}?user_id=eleazar`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Refresh the list
        await fetchConversationHistory();
        return true;
      }
    } catch (error) {
      console.error('[Tesla] Failed to delete conversation:', error);
    }
    return false;
  }, [fetchConversationHistory]);
  
  // Tool-specific display config
  const getToolDisplay = (toolName: string) => {
    const toolConfig: Record<string, { icon: typeof Search; color: string; label: string; emoji: string }> = {
      get_weather: { icon: Cloud, color: 'blue.400', label: 'Weather', emoji: '🌤️' },
      web_search: { icon: Globe, color: 'green.400', label: 'Web Search', emoji: '🔍' },
      openclaw_delegate: { icon: Brain, color: 'purple.400', label: 'Deep Research', emoji: '🧠' },
      check_studio: { icon: Mail, color: 'orange.400', label: 'Studio', emoji: '📧' },
      get_time: { icon: Clock, color: 'cyan.400', label: 'Time', emoji: '🕐' },
      recall_memory: { icon: Brain, color: 'pink.400', label: 'Memory', emoji: '💭' },
      service_health_check: { icon: Server, color: 'red.400', label: 'Health Check', emoji: '🔧' },
      manage_ticket: { icon: FileText, color: 'yellow.400', label: 'Tickets', emoji: '🎫' },
    };
    return toolConfig[toolName] || { icon: Brain, color: 'purple.400', label: 'Processing', emoji: '✨' };
  };

  // Update clock and set mounted state
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Fetch Email and Calendar data on mount
  useEffect(() => {
    fetchEmailData();
    fetchCalendarEvents();
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchEmailData();
      fetchCalendarEvents();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEmailData, fetchCalendarEvents]);

  // SSE Mirror — auto-connect to active voice session
  useEffect(() => {
    // Poll for active session, auto-activate when found
    const checkSession = async () => {
      try {
        const res = await fetch('/api/nova/mirror/status?user_id=default');
        if (res.ok) {
          const data = await res.json();
          if (data.active && !isVoiceActive) {
            setIsVoiceActive(true);
          } else if (!data.active && isVoiceActive) {
            setIsVoiceActive(false);
            setIsListening(false);
            setIsSpeaking(false);
            setIsThinking(false);
          }
        }
      } catch {
        // Mirror unavailable — silent
      }
    };
    const poller = setInterval(checkSession, 3000);
    checkSession();
    return () => clearInterval(poller);
  }, [isVoiceActive]);

  // SSE Mirror — subscribe to event stream when voice is active
  useEffect(() => {
    if (!isVoiceActive) return;

    const es = new EventSource('/api/nova/mirror/stream?user_id=default&api_key=dashboard-internal-api-key-2024');

    es.addEventListener('user_transcript', (e) => {
      const { text, isFinal } = JSON.parse(e.data);
      if (isFinal) {
        setConversationHistory(prev => [...prev, {
          role: 'user' as const,
          content: text,
          timestamp: new Date(),
        }]);
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(text);
      }
    });

    es.addEventListener('assistant_text', (e) => {
      const { text, isFinal } = JSON.parse(e.data);
      if (isFinal) {
        setIsThinking(false);
        setThinkingText('');
        setCurrentToolCall(null);
        setConversationHistory(prev => [...prev, {
          role: 'assistant' as const,
          content: text,
          timestamp: new Date(),
        }]);
        setAssistantResponse('');
      } else {
        setAssistantResponse(text);
      }
    });

    es.addEventListener('speaking_state', (e) => {
      const { who, active } = JSON.parse(e.data);
      if (who === 'user') {
        setIsListening(active);
        // When user stops speaking and has transcript, enable send button
        if (!active && currentTranscript) {
          // Transcript is ready for manual submission
        }
      }
      if (who === 'bot') setIsSpeaking(active);
    });

    es.addEventListener('thinking', (e) => {
      const { phase, text } = JSON.parse(e.data);
      setIsThinking(phase !== 'done');
      
      // Smart contextual thinking messages matching Nova backend
      if (text) {
        setThinkingText(text);
      } else if (phase === 'thinking') {
        setThinkingText('💭 Analyzing results...');
      } else if (phase === 'responding') {
        setThinkingText('✍️ Composing response...');
      } else if (phase === 'delegating') {
        setThinkingText('🔄 Working on it...');
      }
      
      if (phase === 'done') {
        setCurrentToolCall(null);
        setThinkingText('');
      }
    });

    es.addEventListener('tool_call', (e) => {
      const { name, args } = JSON.parse(e.data);
      setCurrentToolCall({ name, args });
      setIsThinking(true);
      // Smart tool-specific thinking message
      const toolDisplay = getToolDisplay(name);
      setThinkingText(`🔧 Using ${toolDisplay.label}...`);
    });

    es.addEventListener('session_end', () => {
      setIsVoiceActive(false);
      setIsListening(false);
      setIsSpeaking(false);
      // Don't reset isConversationOpen — text chat may still be active
    });

    es.addEventListener('session_start', (e) => {
      const { conversation_id } = JSON.parse(e.data);
      if (conversation_id) setConversationId(conversation_id);
    });

    es.onerror = () => {
      // SSE reconnects automatically
      console.log('[Tesla] Mirror SSE reconnecting...');
    };

    return () => es.close();
  }, [isVoiceActive]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleVoiceToggle = useCallback(async () => {
    const newState = !isConversationOpen;
    setIsConversationOpen(newState);
    
    // Send control command to Nova Mirror API (tap-to-talk)
    try {
      const action = newState ? 'start' : 'stop';
      await fetch('/api/nova/mirror/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: 'default' }),
      });
      console.log(`[Tesla] Sent ${action} listening command to Nova`);
    } catch (error) {
      console.error('[Tesla] Failed to send control command:', error);
    }
  }, [isConversationOpen]);

  const handleNavigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);
  
  // Swipe handlers for page navigation
  const handleSwipeStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSwipeStart({ x: clientX, y: clientY });
  }, []);

  const handleSwipeMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeStart) return;
    
    // For mouse events, only track if button is pressed
    if ('buttons' in e && e.buttons !== 1) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - swipeStart.x;
    
    // Visual feedback: could add transform here if needed
    // For now, just track the movement
  }, [swipeStart]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeStart) return;
    
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const deltaX = clientX - swipeStart.x;
    const deltaY = clientY - swipeStart.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    const threshold = 120;
    const isIntentionalHorizontalSwipe = horizontalDistance > threshold && horizontalDistance > verticalDistance * 1.2;
    
    if (isIntentionalHorizontalSwipe) {
      if (deltaX < 0 && currentPage === 0) {
        // Swipe left: go to page 2
        setCurrentPageWithLog(1);
      } else if (deltaX > 0 && currentPage === 1) {
        // Swipe right: go to page 1
        setCurrentPageWithLog(0);
      }
    }
    setSwipeStart(null);
  }, [swipeStart, currentPage]);
  
  // Start a new conversation
  const handleNewConversation = useCallback(() => {
    // Conversations are auto-saved by Nova, just start fresh
    setConversationId(`conv-${Date.now()}`);
    setConversationHistory([]);
    setCurrentTranscript('');
    setAssistantResponse('');
    setIsThinking(false);
    setThinkingText('');
    setCurrentToolCall(null);
    toast({
      title: 'New conversation started',
      status: 'info',
      duration: 2000,
      position: 'top',
    });
  }, [toast]);
  
  // Clear current conversation (trash) - also deletes from Nova
  const handleClearConversation = useCallback(async () => {
    if (conversationHistory.length > 0) {
      await deleteConversationFromAPI(conversationId);
    }
    setConversationHistory([]);
    setCurrentTranscript('');
    setAssistantResponse('');
    setIsThinking(false);
    setThinkingText('');
    setCurrentToolCall(null);
    toast({
      title: 'Conversation cleared',
      status: 'info',
      duration: 2000,
      position: 'top',
    });
  }, [conversationHistory.length, conversationId, deleteConversationFromAPI, toast]);
  
  // Send text message via Nova text chat API (port 18803)
  const handleSendText = useCallback(async () => {
    const message = textInput.trim();
    if (!message || isSendingText) return;
    
    setTextInput('');
    setIsSendingText(true);
    setIsConversationOpen(true); // Activate conversation view (independent of voice session)
    
    // Add user message to history immediately
    setConversationHistory(prev => [...prev, {
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
    }]);
    
    setIsThinking(true);
    setThinkingText('Processing...');
    
    try {
      const response = await fetch('/api/nova/conversations/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'eleazar',
          conversation_id: conversationId,
          message,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversationHistory(prev => [...prev, {
          role: 'assistant' as const,
          content: data.response || data.text || 'No response',
          timestamp: new Date(),
        }]);
      } else {
        toast({
          title: 'Failed to send message',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[Tesla] Text chat error:', error);
      toast({
        title: 'Connection error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsThinking(false);
      setThinkingText('');
      setIsSendingText(false);
    }
  }, [textInput, isSendingText, conversationId, toast]);
  
  // Load a saved conversation from Nova API
  const handleLoadConversation = useCallback(async (conv: typeof savedConversations[0]) => {
    const success = await loadConversationFromAPI(conv.id);
    if (success) {
      setCurrentTranscript('');
      setAssistantResponse('');
      onHistoryClose();
      toast({
        title: 'Conversation loaded',
        status: 'success',
        duration: 1500,
        position: 'top',
      });
    } else {
      toast({
        title: 'Failed to load conversation',
        status: 'error',
        duration: 2000,
        position: 'top',
      });
    }
  }, [loadConversationFromAPI, onHistoryClose, toast]);
  
  // Toggle voice mute
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    toast({
      title: isMuted ? 'Microphone unmuted' : 'Microphone muted',
      status: 'info',
      duration: 1500,
      position: 'top',
    });
  }, [isMuted, toast]);
  
  // Fetch history when drawer opens
  useEffect(() => {
    if (isHistoryOpen) {
      fetchConversationHistory();
    }
  }, [isHistoryOpen, fetchConversationHistory]);

  // Card component for consistent styling
  const TeslaCard = useMemo(() => {
    return function StableTeslaCard({
      children,
      onClick,
      span = 1,
      rowSpan = 1,
      flex,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      span?: number;
      rowSpan?: number;
      flex?: string | number;
    }) {
      const card = (
        <Box
          bg={bgCard}
          borderRadius="20px"
          p={6}
          h="100%"
          cursor={onClick ? 'pointer' : 'default'}
          onClick={onClick}
          transition="all 0.2s"
          _hover={onClick ? { bg: bgHover, transform: 'scale(1.01)' } : {}}
          border="1px solid"
          borderColor={borderColor}
        >
          {children}
        </Box>
      );
      if (flex !== undefined) {
        return <Box flex={flex} minH={0}>{card}</Box>;
      }
      return (
        <GridItem colSpan={span} rowSpan={rowSpan}>
          {card}
        </GridItem>
      );
    };
  }, [bgCard, bgHover, borderColor]);

  // Render futuristic theme if selected
  if (teslaSettings.display.themeStyle === 'futuristic') {
    return (
      <>
        <TeslaFuturisticTheme
          vehicleData={vehicleData}
          vehicles={vehicles}
          selectedVin={selectedVin}
          onVehicleSelect={(vin: string) => setSelectedVin(vin)}
          emailData={emailData}
          calendarEvents={calendarEvents}
          isLoadingEmail={isLoadingEmail}
          isLoadingCalendar={isLoadingCalendar}
          isLoadingVehicle={isLoadingVehicle}
          onSettingsOpen={onSettingsOpen}
          isVoiceActive={isVoiceActive}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isThinking={isThinking}
          isConversationOpen={isConversationOpen}
          isMuted={isMuted}
          conversationHistory={conversationHistory}
          currentTranscript={currentTranscript}
          assistantResponse={assistantResponse}
          thinkingText={thinkingText}
          currentToolCall={currentToolCall}
          textInput={textInput}
          isSendingText={isSendingText}
          onVoiceToggle={handleVoiceToggle}
          onMuteToggle={handleToggleMute}
          onNewConversation={handleNewConversation}
          onClearConversation={handleClearConversation}
          onSendText={handleSendText}
          onTextInputChange={setTextInput}
          vncUrl={vncUrl}
        />
        <TeslaSettingsDrawer
          isOpen={isSettingsOpen}
          onClose={onSettingsClose}
          settings={teslaSettings}
          isSaving={isSettingsSaving}
          onUpdateSettings={updateTeslaSettings}
          onUpdateVnc={updateVnc}
          onUpdateBookmarks={updateBookmarks}
          onAddBookmark={addBookmark}
          onRemoveBookmark={removeBookmark}
        />
      </>
    );
  }

  // Classic theme (default)
  return (
    <Box
      minH="100vh"
      bg={bgBase}
      p={6}
      color={textPrimary}
    >
      {/* Header (hidden in expanded browser mode) */}
      {!(isBrowserExpanded && currentPage === 1) && (
      <Flex justify="space-between" align="center" mb={6}>
        <HStack spacing={4}>
          <IconButton
            aria-label="Home"
            icon={<Home size={24} />}
            variant="ghost"
            size="lg"
            onClick={() => handleNavigate('/')}
            color={textSecondary}
          />
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">
              {isMounted ? formatTime(currentTime) : '--:-- --'}
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              {isMounted ? currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              }) : '---'}
            </Text>
          </VStack>
        </HStack>

        <HStack spacing={4}>
          {/* Vehicle Selector - text only, no background */}
          <Menu>
            <MenuButton
              as={Button}
              variant="unstyled"
              size="sm"
              rightIcon={<Icon as={ChevronDown} boxSize={4} color={textSecondary} />}
              px={0}
              fontWeight="medium"
              display="flex"
              alignItems="center"
              _hover={{ opacity: 0.8 }}
            >
              <HStack spacing={2}>
                <Icon as={Car} boxSize={4} color={accentColor} />
                <Text>{vehicleData?.display_name || vehicles[0]?.display_name || 'Select Vehicle'}</Text>
              </HStack>
            </MenuButton>
            <MenuList bg="transparent" border="none" boxShadow="none" minW="auto">
              {vehicles.length > 0 ? vehicles.map((vehicle) => (
                <MenuItem 
                  key={vehicle.vin}
                  bg="transparent"
                  _hover={{ opacity: 0.7 }}
                  _focus={{ bg: 'transparent' }}
                  onClick={() => setSelectedVin(vehicle.vin)}
                  px={2}
                  py={1}
                >
                  <HStack spacing={2}>
                    <Text 
                      fontWeight={selectedVin === vehicle.vin ? 'bold' : 'normal'}
                      color={selectedVin === vehicle.vin ? accentColor : textPrimary}
                    >
                      {vehicle.display_name}
                    </Text>
                    <Text fontSize="xs" color={vehicle.state === 'online' ? successColor : textSecondary}>
                      •
                    </Text>
                  </HStack>
                </MenuItem>
              )) : (
                <MenuItem bg="transparent" isDisabled px={2}>
                  <Text color={textSecondary} fontSize="sm">No vehicles</Text>
                </MenuItem>
              )}
            </MenuList>
          </Menu>

          {/* Battery indicator - text only, no background */}
          <HStack spacing={2}>
            <Icon as={Battery} color={(vehicleData?.battery_level ?? mockChargingInfo.batteryPercent) > 20 ? successColor : warningColor} />
            <Text fontWeight="medium">{vehicleData?.battery_level ?? mockChargingInfo.batteryPercent}%</Text>
            <Text fontSize="sm" color={textSecondary}>
              {vehicleData?.battery_range ? `${Math.round(vehicleData.battery_range)} mi` : mockChargingInfo.range}
            </Text>
          </HStack>

          {/* Mute toggle */}
          <IconButton
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            icon={isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            variant="ghost"
            size="lg"
            onClick={() => setIsMuted(!isMuted)}
            color={textSecondary}
          />

          {/* Settings */}
          <IconButton
            aria-label="Settings"
            icon={<Settings size={24} />}
            variant="ghost"
            size="lg"
            onClick={onSettingsOpen}
            color={textSecondary}
          />
        </HStack>
      </Flex>
      )}

      {/* Main Layout - Nova left, Swipeable Cards right */}
      <Flex gap={isBrowserExpanded && currentPage === 1 ? 0 : 5} h={isBrowserExpanded && currentPage === 1 ? 'calc(100vh - 24px)' : 'calc(100vh - 140px)'}>
        {/* Voice Agent - Left Side (hidden when browser expanded) */}
        {!(isBrowserExpanded && currentPage === 1) && (
        <Box w={`${teslaSettings.display.novaWidthPercent}%`} h="100%" flexShrink={0}>
          <Box
            bg={bgCard}
            borderRadius="20px"
            p={6}
            h="100%"
            border="1px solid"
            borderColor={isConversationOpen || isVoiceActive ? accentColor : borderColor}
            transition="all 0.3s"
            boxShadow={isConversationOpen || isVoiceActive ? `0 0 20px ${accentColor}40` : 'none'}
            display="flex"
            flexDirection="column"
          >
            {!isConversationOpen ? (
              /* Idle state - show mic button and text input */
              <VStack spacing={6} align="center" justify="center" h="100%">
                {/* Large mic button */}
                <Box position="relative">
                  <Box
                    as="button"
                    w="120px"
                    h="120px"
                    borderRadius="full"
                    bg={accentColor}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxShadow={`0 8px 32px ${accentColor}40`}
                    cursor="pointer"
                    onClick={handleVoiceToggle}
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)' }}
                    _active={{ transform: 'scale(0.95)' }}
                  >
                    <Icon as={Mic} boxSize={12} color="white" />
                  </Box>
                  
                  {/* Pulse animation when listening */}
                  {isListening && (
                    <Box
                      position="absolute"
                      w="140px"
                      h="140px"
                      borderRadius="full"
                      border="2px solid"
                      borderColor={accentColor}
                      opacity={0.3}
                      sx={{
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)', opacity: 0.3 },
                          '100%': { transform: 'scale(1.2)', opacity: 0 },
                        },
                        animation: 'pulse 1.5s ease-out infinite',
                      }}
                    />
                  )}
                </Box>
                
                <VStack spacing={1}>
                  <Text fontSize="2xl" fontWeight="bold">Nova</Text>
                  <Text color={textSecondary} fontSize="sm">
                    {isVoiceActive 
                      ? (isListening ? 'Listening via iPhone...' : isSpeaking ? 'Speaking...' : 'Ready — tap mic to speak')
                      : 'Tap mic or type below'
                    }
                  </Text>
                </VStack>
                
                {/* Text input */}
                <InputGroup size="lg" maxW="400px" w="100%">
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                    bg={bgHover}
                    border="none"
                    borderRadius="full"
                    _focus={{ boxShadow: 'none', bg: bgCard }}
                    _placeholder={{ color: textSecondary }}
                    isDisabled={isSendingText}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Send message"
                      icon={isSendingText ? <Spinner size="sm" /> : <Icon as={Send} boxSize={5} />}
                      variant="ghost"
                      size="md"
                      borderRadius="full"
                      color={textInput.trim() ? accentColor : textSecondary}
                      onClick={handleSendText}
                      isDisabled={!textInput.trim() || isSendingText}
                    />
                  </InputRightElement>
                </InputGroup>
              </VStack>
            ) : (
              /* Active state - show conversation */
              <Flex direction="column" h="100%">
                {/* Header with status and controls */}
                <Flex justify="space-between" align="center" mb={4}>
                  <HStack spacing={3}>
                    <Tooltip label={isMuted ? "Unmute" : "Mute"} placement="bottom">
                      <Box
                        w="48px"
                        h="48px"
                        borderRadius="full"
                        bg={isMuted ? 'gray.500' : accentColor}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        boxShadow={isMuted ? 'none' : `0 0 20px ${accentColor}`}
                        cursor="pointer"
                        onClick={handleToggleMute}
                        transition="all 0.2s"
                        _hover={{ transform: 'scale(1.05)' }}
                      >
                        <Icon as={isMuted ? MicOff : Mic} boxSize={6} color="white" />
                      </Box>
                    </Tooltip>
                    {/* Manual submit button - for when VAD doesn't detect end of speech */}
                    {isListening && currentTranscript && (
                      <Tooltip label="Submit speech (VAD fallback)" placement="bottom">
                        <IconButton
                          aria-label="Submit speech"
                          icon={<Icon as={Send} boxSize={5} />}
                          size="md"
                          borderRadius="full"
                          colorScheme="green"
                          onClick={async () => {
                            // Force submit current transcript
                            if (currentTranscript.trim()) {
                              setConversationHistory(prev => [...prev, {
                                role: 'user' as const,
                                content: currentTranscript,
                                timestamp: new Date(),
                              }]);
                              await handleSendText();
                              setCurrentTranscript('');
                              setIsListening(false);
                            }
                          }}
                          _hover={{ transform: 'scale(1.05)' }}
                        />
                      </Tooltip>
                    )}
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg">Nova</Text>
                      <HStack spacing={2}>
                        <Box 
                          w="8px" 
                          h="8px" 
                          borderRadius="full" 
                          bg={isMuted ? 'gray.400' : isListening ? successColor : isSpeaking ? accentColor : isThinking ? 'orange.400' : 'gray.400'}
                        />
                        <Text fontSize="sm" color={textSecondary}>
                          {isMuted ? 'Muted' : isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'Ready'}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                  
                  {/* Voice controls: New, History, Trash, End */}
                  <HStack spacing={2}>
                    <Tooltip label="New conversation" placement="bottom">
                      <IconButton
                        aria-label="New conversation"
                        icon={<Icon as={Plus} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        borderRadius="full"
                        color={textSecondary}
                        _hover={{ bg: bgHover, color: accentColor }}
                        onClick={handleNewConversation}
                      />
                    </Tooltip>
                    <Tooltip label="History" placement="bottom">
                      <IconButton
                        aria-label="History"
                        icon={<Icon as={History} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        borderRadius="full"
                        color={textSecondary}
                        _hover={{ bg: bgHover, color: accentColor }}
                        onClick={onHistoryOpen}
                      />
                    </Tooltip>
                    <Tooltip label="Clear conversation" placement="bottom">
                      <IconButton
                        aria-label="Clear conversation"
                        icon={<Icon as={Trash2} boxSize={4} />}
                        variant="ghost"
                        size="sm"
                        borderRadius="full"
                        color={textSecondary}
                        _hover={{ bg: bgHover, color: 'red.400' }}
                        onClick={handleClearConversation}
                        isDisabled={conversationHistory.length === 0}
                      />
                    </Tooltip>
                    <Tooltip label="End call" placement="bottom">
                      <IconButton
                        aria-label="End call"
                        icon={<Icon as={X} boxSize={4} />}
                        colorScheme="red"
                        size="sm"
                        borderRadius="full"
                        onClick={handleVoiceToggle}
                      />
                    </Tooltip>
                  </HStack>
                </Flex>

                {/* Conversation area */}
                <Box 
                  flex={1} 
                  overflowY="auto" 
                  mb={4}
                  px={2}
                  css={{
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': { background: borderColor, borderRadius: '4px' },
                  }}
                >
                  {conversationHistory.length === 0 && !currentTranscript && !assistantResponse ? (
                    <VStack h="100%" justify="center" spacing={2} opacity={0.6}>
                      {/* Empty state - mic button below is the CTA */}
                    </VStack>
                  ) : (
                    <VStack align="stretch" spacing={3}>
                      {/* Previous conversation turns */}
                      {conversationHistory.map((turn, i) => (
                        <Box
                          key={i}
                          alignSelf={turn.role === 'user' ? 'flex-end' : 'flex-start'}
                          maxW="85%"
                          bg={turn.role === 'user' ? accentColor : bgHover}
                          color={turn.role === 'user' ? 'white' : textPrimary}
                          px={4}
                          py={2}
                          borderRadius={turn.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}
                          sx={turn.role === 'assistant' ? {
                            '& p': { margin: 0, fontSize: 'sm' },
                            '& strong': { fontWeight: 'bold' },
                            '& ul, & ol': { pl: 4, my: 1 },
                            '& li': { fontSize: 'sm', my: 0.5 },
                            '& code': { bg: 'blackAlpha.200', px: 1, borderRadius: 'sm', fontSize: 'xs' },
                          } : {}}
                        >
                          {turn.role === 'assistant' ? (
                            <ReactMarkdown>{turn.content}</ReactMarkdown>
                          ) : (
                            <Text fontSize="sm">{turn.content}</Text>
                          )}
                        </Box>
                      ))}
                      
                      {/* Current user transcript (live) */}
                      {currentTranscript && (
                        <Box
                          alignSelf="flex-end"
                          maxW="85%"
                          bg={accentColor}
                          color="white"
                          px={4}
                          py={2}
                          borderRadius="18px 18px 4px 18px"
                          opacity={0.8}
                        >
                          <Text fontSize="sm">{currentTranscript}</Text>
                        </Box>
                      )}
                      
                      {/* Thinking/Reasoning card (like iOS ThinkingCard) - collapsible */}
                      {isThinking && (
                        <ThinkingCard
                          toolName={currentToolCall?.name || ''}
                          thinkingText={thinkingText}
                          isExpanded={isThinkingExpanded}
                          onToggle={() => setIsThinkingExpanded(!isThinkingExpanded)}
                          getToolDisplay={getToolDisplay}
                          bgHover={bgHover}
                          bgCard={bgCard}
                          borderColor={borderColor}
                          textSecondary={textSecondary}
                        />
                      )}
                      
                      {/* Current assistant response (streaming) */}
                      {assistantResponse && (
                        <Box
                          alignSelf="flex-start"
                          maxW="85%"
                          bg={bgHover}
                          px={4}
                          py={2}
                          borderRadius="18px 18px 18px 4px"
                          sx={{
                            '& p': { margin: 0, fontSize: 'sm' },
                            '& strong': { fontWeight: 'bold' },
                            '& ul, & ol': { pl: 4, my: 1 },
                            '& li': { fontSize: 'sm', my: 0.5 },
                            '& code': { bg: 'blackAlpha.200', px: 1, borderRadius: 'sm', fontSize: 'xs' },
                          }}
                        >
                          <ReactMarkdown>{assistantResponse}</ReactMarkdown>
                          {isSpeaking && (
                            <HStack spacing={1} mt={1}>
                              {[...Array(3)].map((_, i) => (
                                <Box
                                  key={i}
                                  w="4px"
                                  h="4px"
                                  borderRadius="full"
                                  bg={accentColor}
                                  animation="pulse 0.6s ease-in-out infinite"
                                  style={{ animationDelay: `${i * 0.2}s` }}
                                />
                              ))}
                            </HStack>
                          )}
                        </Box>
                      )}
                    </VStack>
                  )}
                </Box>

                {/* Voice visualizer - responds to listening, speaking, and thinking states */}
                <Flex justify="center" align="center" h="40px">
                  {(isListening || isSpeaking || isThinking) ? (
                    <HStack spacing={1}>
                      {[...Array(7)].map((_, i) => (
                        <Box
                          key={i}
                          w="4px"
                          bg={isListening ? accentColor : isSpeaking ? successColor : 'gray.400'}
                          borderRadius="full"
                          sx={{
                            '@keyframes voiceWaveActive': {
                              '0%, 100%': { height: '8px' },
                              '50%': { height: '28px' },
                            },
                            '@keyframes voiceWaveSpeaking': {
                              '0%, 100%': { height: '6px' },
                              '50%': { height: '20px' },
                            },
                            '@keyframes voiceWaveThinking': {
                              '0%, 100%': { height: '4px', opacity: 0.5 },
                              '50%': { height: '12px', opacity: 0.8 },
                            },
                            animation: isListening 
                              ? 'voiceWaveActive 0.5s ease-in-out infinite'
                              : isSpeaking 
                                ? 'voiceWaveSpeaking 0.6s ease-in-out infinite'
                                : 'voiceWaveThinking 1s ease-in-out infinite',
                            animationDelay: `${i * 0.07}s`,
                            height: '8px',
                          }}
                        />
                      ))}
                    </HStack>
                  ) : (
                    <HStack spacing={1}>
                      {/* Static idle bars */}
                      {[...Array(7)].map((_, i) => (
                        <Box
                          key={i}
                          w="4px"
                          h={`${6 + Math.abs(3 - i) * 2}px`}
                          bg="gray.300"
                          borderRadius="full"
                          opacity={0.5}
                        />
                      ))}
                    </HStack>
                  )}
                </Flex>
                
                {/* Status text below visualizer */}
                <Text fontSize="xs" color={textSecondary} textAlign="center" mt={1}>
                  {isListening ? 'Listening...' : isSpeaking ? 'Nova is speaking...' : isThinking ? 'Processing...' : 'Ready'}
                </Text>

                {/* Text input — type to chat with Nova */}
                <InputGroup size="md" mt={3}>
                  <Input
                    placeholder="Type a message..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                    bg={bgHover}
                    border="none"
                    borderRadius="full"
                    _focus={{ boxShadow: 'none', bg: bgCard }}
                    _placeholder={{ color: textSecondary }}
                    isDisabled={isSendingText}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Send message"
                      icon={isSendingText ? <Spinner size="sm" /> : <Icon as={Send} boxSize={4} />}
                      variant="ghost"
                      size="sm"
                      borderRadius="full"
                      color={textInput.trim() ? accentColor : textSecondary}
                      onClick={handleSendText}
                      isDisabled={!textInput.trim() || isSendingText}
                    />
                  </InputRightElement>
                </InputGroup>
              </Flex>
            )}
          </Box>
        </Box>
        )}

        {/* Swipeable Cards Container - Right Side (full width when browser expanded) */}
        <Box
          flex={1}
          h="100%"
          overflow="hidden"
          position="relative"
          onTouchStart={isBrowserExpanded ? undefined : handleSwipeStart}
          onTouchEnd={isBrowserExpanded ? undefined : handleSwipeEnd}
          onTouchMove={isBrowserExpanded ? undefined : handleSwipeMove}
          onMouseDown={isBrowserExpanded ? undefined : handleSwipeStart}
          onMouseUp={isBrowserExpanded ? undefined : handleSwipeEnd}
          onMouseMove={isBrowserExpanded ? undefined : handleSwipeMove}
        >
          {/* Page Indicator Dots - Clickable (hidden in expanded browser mode) */}
          {!(isBrowserExpanded && currentPage === 1) && (
          <HStack 
            position="absolute" 
            top={2} 
            left="50%" 
            transform="translateX(-50%)" 
            zIndex={10}
            spacing={3}
            bg={bgBase}
            px={3}
            py={2}
            borderRadius="full"
            opacity={0.9}
          >
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={currentPage === 0 ? accentColor : borderColor}
              transition="all 0.3s"
              cursor="pointer"
              onClick={() => setCurrentPageWithLog(0)}
              _hover={{ transform: 'scale(1.2)' }}
            />
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={currentPage === 1 ? accentColor : borderColor}
              transition="all 0.3s"
              cursor="pointer"
              onClick={() => setCurrentPageWithLog(1)}
              _hover={{ transform: 'scale(1.2)' }}
            />
          </HStack>
          )}

          {/* Swipe Hint - Only show on page 0 */}
          {currentPage === 0 && (
            <HStack
              position="absolute"
              top={2}
              right={2}
              zIndex={10}
              bg={bgCard}
              px={2}
              py={1}
              borderRadius="full"
              fontSize="xs"
              color={textSecondary}
              opacity={0.6}
            >
              <Icon as={ChevronRight} boxSize={3} />
              <Text>Swipe</Text>
            </HStack>
          )}

          {/* Browser shortcut - click to move to Page 2 */}
          {currentPage === 0 && (
            <HStack
              position="absolute"
              bottom={2}
              right={2}
              zIndex={10}
              as="button"
              bg={bgCard}
              px={3}
              py={2}
              borderRadius="full"
              fontSize="xs"
              color={textSecondary}
              opacity={0.85}
              spacing={1}
              onClick={() => setCurrentPageWithLog(1)}
              _hover={{ bg: bgHover, color: accentColor }}
            >
              <Icon as={Globe} boxSize={3} />
              <Text>Custom Browser</Text>
              <Icon as={ChevronRight} boxSize={3} />
            </HStack>
          )}

          {/* Conditional Page Rendering */}
          <Box w="100%" h="100%" position="relative">
            {currentPage === 0 && (
              <Box w="100%" h="100%" p={1}>
              <Grid
                templateColumns="repeat(2, 1fr)"
                templateRows="repeat(3, 1fr)"
                gap={4}
                h="100%"
              >
                {/* AI Insights Card */}
        <TeslaCard>
          <VStack align="start" h="100%" justify="space-between">
            <HStack justify="space-between" w="100%">
              <HStack>
                <Icon as={Sparkles} color={accentColor} boxSize={6} />
                <Text fontWeight="bold" fontSize="lg">AI Insights</Text>
              </HStack>
            </HStack>
            <VStack align="start" spacing={2} flex={1} mt={4} w="100%">
              {isLoadingEmail ? (
                <Text fontSize="sm" color={textSecondary}>Loading...</Text>
              ) : emailData && emailData.recent.length > 0 ? (
                <>
                  {/* Generate clean, minimal insights */}
                  {(() => {
                    const needsResponse = emailData.recent.filter(e => e.ai_requires_response).length;
                    const intents = emailData.recent.reduce((acc: any, e) => {
                      if (e.ai_intent) acc[e.ai_intent] = (acc[e.ai_intent] || 0) + 1;
                      return acc;
                    }, {});
                    const marketingCount = intents['marketing'] || 0;
                    const transactionalCount = intents['transactional'] || 0;
                    
                    const insights = [];
                    
                    // Show all relevant insights in consistent style
                    if (emailData.urgent > 0) {
                      insights.push(
                        <Text
                          key="urgent"
                          fontSize="sm"
                          color={textSecondary}
                          cursor="pointer"
                          onClick={() => {
                            if (isConversationOpen) {
                              setTextInput('Summarize urgent emails and suggest priorities');
                            } else {
                              handleVoiceToggle();
                              setTimeout(() => setTextInput('Summarize urgent emails and suggest priorities'), 100);
                            }
                          }}
                          _hover={{ color: textPrimary }}
                          transition="color 0.2s"
                        >
                          {emailData.urgent} urgent {emailData.urgent === 1 ? 'email' : 'emails'} — tap to prioritize
                        </Text>
                      );
                    }
                    
                    if (needsResponse > 0) {
                      insights.push(
                        <Text
                          key="response"
                          fontSize="sm"
                          color={textSecondary}
                          cursor="pointer"
                          onClick={() => {
                            if (isConversationOpen) {
                              setTextInput(`Draft replies for the ${needsResponse} emails requiring response`);
                            } else {
                              handleVoiceToggle();
                              setTimeout(() => setTextInput(`Draft replies for the ${needsResponse} emails requiring response`), 100);
                            }
                          }}
                          _hover={{ color: textPrimary }}
                          transition="color 0.2s"
                        >
                          {needsResponse} {needsResponse === 1 ? 'conversation' : 'conversations'} awaiting reply
                        </Text>
                      );
                    }
                    
                    if (marketingCount >= 3) {
                      insights.push(
                        <Text
                          key="marketing"
                          fontSize="sm"
                          color={textSecondary}
                          cursor="pointer"
                          onClick={() => {
                            if (isConversationOpen) {
                              setTextInput('Archive marketing emails and unsubscribe from low-value senders');
                            } else {
                              handleVoiceToggle();
                              setTimeout(() => setTextInput('Archive marketing emails and unsubscribe from low-value senders'), 100);
                            }
                          }}
                          _hover={{ color: textPrimary }}
                          transition="color 0.2s"
                        >
                          {marketingCount} marketing emails — tap to clean up
                        </Text>
                      );
                    }
                    
                    if (transactionalCount >= 2) {
                      insights.push(
                        <Text key="transactional" fontSize="sm" color={textSecondary}>
                          {transactionalCount} order/shipping updates
                        </Text>
                      );
                    }
                    
                    // Show inbox summary if no actionable items
                    if (insights.length === 0) {
                      insights.push(
                        <Text key="summary" fontSize="sm" color={textSecondary}>
                          {emailData.recent.length} recent emails, all handled
                        </Text>
                      );
                    }
                    
                    return insights;
                  })()}
                </>
              ) : (
                <Text fontSize="sm" color={textSecondary}>No recent emails</Text>
              )}
            </VStack>
            <HStack justify="flex-end" w="100%">
              <Text fontSize="xs" color={textSecondary}>Powered by Hermes AI</Text>
            </HStack>
          </VStack>
        </TeslaCard>

        {/* Email Summary */}
        <TeslaCard onClick={onEmailOpen}>
          <VStack align="start" h="100%" justify="space-between">
            <HStack justify="space-between" w="100%">
              <HStack>
                <Icon as={Mail} color={accentColor} boxSize={6} />
                <Text fontWeight="bold" fontSize="lg">Email</Text>
              </HStack>
              {isLoadingEmail ? (
                <Spinner size="sm" color={accentColor} />
              ) : emailData && emailData.unread > 0 ? (
                <Badge colorScheme="red" borderRadius="full" px={2}>
                  {emailData.unread}
                </Badge>
              ) : null}
            </HStack>
            <VStack align="start" spacing={2} flex={1} mt={4} w="100%">
              {isLoadingEmail ? (
                <Text fontSize="sm" color={textSecondary}>Loading...</Text>
              ) : emailData && emailData.recent.length > 0 ? (
                emailData.recent.slice(0, 2).map((email, i) => (
                  <Box key={i} w="100%">
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {email.from}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                      {email.subject}
                    </Text>
                  </Box>
                ))
              ) : (
                <Text fontSize="sm" color={textSecondary}>No recent emails</Text>
              )}
            </VStack>
            <HStack justify="space-between" w="100%">
              {emailData && emailData.urgent > 0 ? (
                <Text fontSize="xs" color={warningColor} fontWeight="medium">
                  {emailData.urgent} urgent
                </Text>
              ) : (
                <Text fontSize="xs" color={textSecondary}>All caught up</Text>
              )}
              <Icon as={ChevronRight} color={textSecondary} />
            </HStack>
          </VStack>
        </TeslaCard>

        {/* Calendar */}
        <TeslaCard onClick={() => handleNavigate('/calendar')}>
          <VStack align="start" h="100%" justify="space-between">
            <HStack justify="space-between" w="100%">
              <HStack>
                <Icon as={Calendar} color={accentColor} boxSize={6} />
                <Text fontWeight="bold" fontSize="lg">Today</Text>
              </HStack>
              {isLoadingCalendar ? (
                <Spinner size="sm" color={accentColor} />
              ) : calendarEvents.length > 0 ? (
                <Badge colorScheme="blue" borderRadius="full" px={2}>
                  {calendarEvents.length}
                </Badge>
              ) : null}
            </HStack>
            <VStack align="start" spacing={2} flex={1} mt={4} w="100%">
              {isLoadingCalendar ? (
                <Text fontSize="sm" color={textSecondary}>Loading...</Text>
              ) : calendarEvents.length > 0 ? (
                calendarEvents.slice(0, 2).map((event, i) => {
                  const startTime = new Date(event.start);
                  const timeStr = startTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  return (
                    <Box key={i} w="100%">
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1}>
                          {event.title}
                        </Text>
                        <Text fontSize="xs" color={accentColor} flexShrink={0} ml={2}>
                          {timeStr}
                        </Text>
                      </HStack>
                      {event.location && (
                        <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                          {event.location}
                        </Text>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Text fontSize="sm" color={textSecondary}>No events today</Text>
              )}
            </VStack>
            <HStack justify="flex-end" w="100%">
              <Icon as={ChevronRight} color={textSecondary} />
            </HStack>
          </VStack>
        </TeslaCard>

        {/* Climate Controls */}
        <TeslaCard>
          <VStack align="start" h="100%" justify="space-between">
            <HStack justify="space-between" w="100%">
              <HStack>
                <Icon as={Thermometer} color={accentColor} boxSize={6} />
                <Text fontWeight="bold" fontSize="lg">Climate</Text>
              </HStack>
              {vehicleData?.is_climate_on && (
                <Badge colorScheme="blue" borderRadius="full">ON</Badge>
              )}
            </HStack>
            <HStack justify="space-between" w="100%" flex={1} mt={2}>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color={textSecondary}>Inside</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {vehicleData?.inside_temp ? Math.round(vehicleData.inside_temp) : '21'}°
                </Text>
              </VStack>
              <VStack align="end" spacing={0}>
                <Text fontSize="xs" color={textSecondary}>Outside</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {vehicleData?.outside_temp ? Math.round(vehicleData.outside_temp) : '18'}°
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </TeslaCard>

        {/* Trip / Navigation */}
        <TeslaCard onClick={() => handleNavigate('/travel')}>
          <VStack align="start" h="100%" justify="space-between">
            <HStack>
              <Icon as={Navigation} color={accentColor} boxSize={6} />
              <Text fontWeight="bold" fontSize="lg">Trip</Text>
            </HStack>
            <VStack align="start" spacing={1} flex={1} mt={2}>
              <HStack>
                <Icon as={MapPin} color={textSecondary} boxSize={4} />
                <Text fontSize="md" fontWeight="medium" noOfLines={1}>
                  {mockTripInfo.destination}
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
                {mockTripInfo.eta}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                {mockTripInfo.distance} • {mockTripInfo.traffic} traffic
              </Text>
            </VStack>
          </VStack>
        </TeslaCard>

        {/* Charging - uses real vehicle data when available */}
        <TeslaCard onClick={() => handleNavigate('/charging')}>
          <VStack align="start" h="100%" justify="space-between">
            <HStack justify="space-between" w="100%">
              <HStack>
                <Icon as={Zap} color={successColor} boxSize={6} />
                <Text fontWeight="bold" fontSize="lg">Charging</Text>
              </HStack>
              {(vehicleData?.charging_state === 'Charging' || mockChargingInfo.charging) && (
                <Badge colorScheme="green" borderRadius="full">Charging</Badge>
              )}
            </HStack>
            <VStack align="start" spacing={1} flex={1} mt={2} w="100%">
              <HStack justify="space-between" w="100%">
                <Text fontSize="2xl" fontWeight="bold">
                  {vehicleData?.battery_level ?? mockChargingInfo.batteryPercent}%
                </Text>
                <Text fontSize="sm" color={textSecondary}>
                  {vehicleData?.battery_range ? `${Math.round(vehicleData.battery_range)} mi` : mockChargingInfo.range}
                </Text>
              </HStack>
              <Progress 
                value={vehicleData?.battery_level ?? mockChargingInfo.batteryPercent} 
                size="sm" 
                colorScheme="green" 
                borderRadius="full"
                w="100%"
              />
            </VStack>
          </VStack>
        </TeslaCard>

        {/* Weather */}
        <TeslaCard>
          <VStack align="start" h="100%" justify="space-between">
            <HStack>
              <Icon as={CloudSun} color={accentColor} boxSize={6} />
              <Text fontWeight="bold" fontSize="lg">Weather</Text>
            </HStack>
            <VStack align="start" spacing={1} flex={1} mt={2}>
              <Text fontSize="2xl" fontWeight="bold">72°F</Text>
              <Text fontSize="sm" color={textSecondary}>Partly Cloudy</Text>
              <Text fontSize="xs" color={textSecondary}>H: 78° L: 65°</Text>
            </VStack>
          </VStack>
        </TeslaCard>
              </Grid>
              </Box>
            )}

            {currentPage === 1 && (
              <Box w="100%" h="100%" p={isBrowserExpanded ? 0 : 1}>
              <Flex direction="column" h="100%" gap={isBrowserExpanded ? 0 : 3}>
                {/* Agent Browser */}
                {isBrowserExpanded ? (
                  /* Maximized: full viewport area, no chrome — noVNC toolbar on left stays clear */
                  <Box flex={1} position="relative" borderRadius="8px" overflow="hidden" bg="black">
                    <VncBrowser ref={vncIframeRef} url={vncUrl} />
                    {/* Compact virtual keyboard — floats at bottom */}
                    <VncKeyboardRelay iframeRef={vncIframeRef} isExpanded />
                    {/* Floating restore button — bottom-right to avoid noVNC's left toolbar */}
                    <HStack
                      position="absolute"
                      top={2}
                      right={2}
                      bg="blackAlpha.600"
                      backdropFilter="blur(8px)"
                      borderRadius="full"
                      px={3}
                      py={1.5}
                      spacing={2}
                      zIndex={10}
                      opacity={0.7}
                      _hover={{ opacity: 1 }}
                      transition="opacity 0.2s"
                    >
                      <Badge colorScheme="blue" fontSize="2xs" variant="subtle">Live</Badge>
                      <IconButton
                        aria-label="Exit fullscreen browser"
                        icon={<Icon as={Minimize2} boxSize={3.5} />}
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.900"
                        onClick={() => setIsBrowserExpanded(false)}
                        _hover={{ bg: 'whiteAlpha.300' }}
                      />
                    </HStack>
                  </Box>
                ) : (
                  /* Default: card with header, configurable height */
                  <TeslaCard flex={`0 0 ${teslaSettings.display.browserHeightPercent}%`}>
                    <VStack align="start" h="100%" spacing={2}>
                      <HStack justify="space-between" w="100%">
                        <HStack spacing={2}>
                          <Icon as={Globe} color={accentColor} boxSize={5} />
                          <Text fontWeight="bold" fontSize="md">Agent Browser</Text>
                        </HStack>
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" fontSize="xs">Live</Badge>
                          <Tooltip label="Expand browser to full screen" placement="left">
                          <IconButton
                            aria-label="Maximize browser"
                            icon={<Icon as={Maximize2} boxSize={4} />}
                            size="sm"
                            variant="ghost"
                            color={textSecondary}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsBrowserExpanded(true);
                            }}
                            _hover={{ bg: bgHover }}
                          />
                          </Tooltip>
                        </HStack>
                      </HStack>
                      <Box 
                        w="100%" 
                        h="100%"
                        borderRadius="md" 
                        overflow="hidden"
                        bg="black"
                        position="relative"
                        flex={1}
                      >
                        <VncBrowser ref={vncIframeRef} url={vncUrl} />
                      </Box>
                      {/* Compact virtual keyboard for default view */}
                      <VncKeyboardRelay iframeRef={vncIframeRef} />
                    </VStack>
                  </TeslaCard>
                )}

                {/* Bottom cards row - 4 cards side by side */}
                {!isBrowserExpanded && (
                  <Grid templateColumns="repeat(4, 1fr)" gap={3} flex={1} minH={0}>
                    {/* Quick Launch */}
                    <TeslaCard>
                      <VStack align="start" h="100%" spacing={3}>
                        <HStack spacing={2}>
                          <Box bg="blue.500" p={1.5} borderRadius="lg">
                            <Icon as={Compass} color="white" boxSize={3.5} />
                          </Box>
                          <Text fontWeight="bold" fontSize="sm">Quick Launch</Text>
                        </HStack>
                        <Grid templateColumns="repeat(3, 1fr)" gap={2} flex={1} w="100%" alignContent="center">
                          {teslaSettings.bookmarks.slice(0, 6).map((site: { id: string; label: string; url: string; icon: string; color: string }) => (
                            <VStack
                              key={site.id}
                              spacing={1}
                              cursor="pointer"
                              p={1.5}
                              borderRadius="xl"
                              transition="all 0.2s"
                              _hover={{ bg: bgHover, transform: 'translateY(-2px)', boxShadow: cardGlow }}
                              onClick={() => {
                                toast({
                                  title: `Launching ${site.label}`,
                                  description: `Agent navigating to ${site.url}`,
                                  status: 'info',
                                  duration: 2000,
                                  position: 'top',
                                });
                              }}
                            >
                              <Box
                                bg={iconBg}
                                p={1.5}
                                borderRadius="lg"
                              >
                                <Icon as={ICON_MAP[site.icon] || Globe} boxSize={4} color={site.color} />
                              </Box>
                              <Text fontSize="2xs" fontWeight="semibold" color={textSecondary}>{site.label}</Text>
                            </VStack>
                          ))}
                        </Grid>
                      </VStack>
                    </TeslaCard>

                    {/* Agent Tasks */}
                    <TeslaCard>
                      <VStack align="start" h="100%" spacing={3}>
                        <HStack spacing={2}>
                          <Box bg="purple.500" p={1.5} borderRadius="lg">
                            <Icon as={Sparkles} color="white" boxSize={3.5} />
                          </Box>
                          <Text fontWeight="bold" fontSize="sm">Agent Tasks</Text>
                        </HStack>
                        <VStack spacing={1.5} flex={1} w="100%" justify="center">
                          {[
                            { icon: Search, label: 'Research topic', desc: 'Deep web search', color: 'blue.400' },
                            { icon: ShoppingCart, label: 'Price compare', desc: 'Find best deals', color: 'orange.400' },
                            { icon: FileText, label: 'Summarize page', desc: 'Read & digest', color: 'green.400' },
                            { icon: Video, label: 'Find tutorial', desc: 'Courses & guides', color: 'red.400' },
                          ].map((tool) => (
                            <HStack
                              key={tool.label}
                              w="100%"
                              spacing={2.5}
                              cursor="pointer"
                              px={2}
                              py={1.5}
                              borderRadius="lg"
                              border="1px solid"
                              borderColor="transparent"
                              transition="all 0.2s"
                              _hover={{ bg: bgHover, borderColor: subtleBorder, transform: 'translateX(2px)' }}
                              onClick={() => {
                                toast({
                                  title: tool.label,
                                  description: tool.desc,
                                  status: 'info',
                                  duration: 2000,
                                  position: 'top',
                                });
                              }}
                            >
                              <Box bg={iconBg} p={1} borderRadius="md" flexShrink={0}>
                                <Icon as={tool.icon} boxSize={3.5} color={tool.color} />
                              </Box>
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="xs" fontWeight="semibold">{tool.label}</Text>
                                <Text fontSize="2xs" color={textSecondary}>{tool.desc}</Text>
                              </VStack>
                              <Icon as={ChevronRight} boxSize={3} color={textSecondary} />
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </TeslaCard>

                    {/* Agent Commands */}
                    <TeslaCard>
                      <VStack align="start" h="100%" spacing={3}>
                        <HStack spacing={2}>
                          <Box bg="teal.500" p={1.5} borderRadius="lg">
                            <Icon as={Brain} color="white" boxSize={3.5} />
                          </Box>
                          <Text fontWeight="bold" fontSize="sm">Commands</Text>
                        </HStack>
                        <VStack spacing={1.5} flex={1} w="100%" justify="center">
                          {[
                            { label: 'Order coffee beans', icon: Coffee, color: 'orange.400' },
                            { label: 'Play learning playlist', icon: Radio, color: 'purple.400' },
                            { label: 'Check package tracking', icon: Bookmark, color: 'blue.400' },
                            { label: 'Browse bookmarks', icon: Globe, color: 'teal.400' },
                          ].map((cmd) => (
                            <HStack
                              key={cmd.label}
                              w="100%"
                              spacing={2.5}
                              cursor="pointer"
                              px={2}
                              py={1.5}
                              borderRadius="lg"
                              border="1px solid"
                              borderColor="transparent"
                              transition="all 0.2s"
                              _hover={{ bg: bgHover, borderColor: subtleBorder, transform: 'translateX(2px)' }}
                              onClick={() => {
                                toast({
                                  title: 'Sending to OpenClaw',
                                  description: cmd.label,
                                  status: 'info',
                                  duration: 2000,
                                  position: 'top',
                                });
                              }}
                            >
                              <Box bg={iconBg} p={1} borderRadius="md" flexShrink={0}>
                                <Icon as={cmd.icon} boxSize={3.5} color={cmd.color} />
                              </Box>
                              <Text fontSize="xs" fontWeight="medium" noOfLines={1} flex={1}>{cmd.label}</Text>
                              <Icon as={ChevronRight} boxSize={3} color={textSecondary} />
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </TeslaCard>

                    {/* Dashboard Nav */}
                    <TeslaCard>
                      <VStack align="start" h="100%" spacing={3}>
                        <HStack spacing={2}>
                          <Box bg="green.500" p={1.5} borderRadius="lg">
                            <Icon as={Monitor} color="white" boxSize={3.5} />
                          </Box>
                          <Text fontWeight="bold" fontSize="sm">Dashboard</Text>
                        </HStack>
                        <Grid templateColumns="repeat(2, 1fr)" gap={2} flex={1} w="100%" alignContent="center">
                          {[
                            { icon: Home, label: 'Home', color: 'blue.400', onClick: () => handleNavigate('/') },
                            { icon: Mail, label: 'Email', color: 'red.400', onClick: () => handleNavigate('/email') },
                            { icon: Calendar, label: 'Calendar', color: 'purple.400', onClick: () => handleNavigate('/calendar') },
                            { icon: Settings, label: 'Settings', color: 'gray.500', onClick: onSettingsOpen },
                          ].map((action) => (
                            <VStack
                              key={action.label}
                              spacing={1}
                              cursor="pointer"
                              onClick={action.onClick}
                              p={2}
                              borderRadius="xl"
                              transition="all 0.2s"
                              _hover={{ bg: bgHover, transform: 'translateY(-2px)', boxShadow: cardGlow }}
                            >
                              <Box bg={iconBg} p={1.5} borderRadius="lg">
                                <Icon as={action.icon} boxSize={4} color={action.color} />
                              </Box>
                              <Text fontSize="2xs" fontWeight="semibold" color={textSecondary}>{action.label}</Text>
                            </VStack>
                          ))}
                        </Grid>
                      </VStack>
                    </TeslaCard>
                  </Grid>
                )}
              </Flex>
              </Box>
            )}
          </Box>
        </Box>
      </Flex>

      {/* Tesla Settings Drawer */}
      <TeslaSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={onSettingsClose}
        settings={teslaSettings}
        isSaving={isSettingsSaving}
        onUpdateSettings={updateTeslaSettings}
        onUpdateVnc={updateVnc}
        onUpdateBookmarks={updateBookmarks}
        onAddBookmark={addBookmark}
        onRemoveBookmark={removeBookmark}
      />

      {/* Email Drawer */}
      <Drawer isOpen={isEmailOpen} onClose={onEmailClose} size="md" placement="right">
        <DrawerOverlay />
        <DrawerContent bg={bgBase}>
          <DrawerCloseButton color={textPrimary} />
            <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
              <VStack align="stretch" spacing={3}>
                <HStack>
                  <Icon as={Mail} color={accentColor} boxSize={6} />
                  <Text>Recent Emails</Text>
                </HStack>
                
                {/* Quick Actions */}
                <HStack spacing={2} flexWrap="wrap">
                  <Badge
                    colorScheme="purple"
                    px={3}
                    py={1}
                    borderRadius="full"
                    cursor="pointer"
                    fontSize="xs"
                    fontWeight="medium"
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)', opacity: 0.9 }}
                    onClick={() => {
                      // Trigger Nova voice command
                      if (isConversationOpen) {
                        setTextInput('Read my urgent emails');
                      } else {
                        handleVoiceToggle();
                        setTimeout(() => setTextInput('Read my urgent emails'), 100);
                      }
                      onEmailClose();
                    }}
                  >
                    🎤 Read Urgent
                  </Badge>
                  <Badge
                    colorScheme="blue"
                    px={3}
                    py={1}
                    borderRadius="full"
                    cursor="pointer"
                    fontSize="xs"
                    fontWeight="medium"
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)', opacity: 0.9 }}
                    onClick={() => {
                      if (isConversationOpen) {
                        setTextInput('Summarize today\'s emails');
                      } else {
                        handleVoiceToggle();
                        setTimeout(() => setTextInput('Summarize today\'s emails'), 100);
                      }
                      onEmailClose();
                    }}
                  >
                    📋 Summarize
                  </Badge>
                  <Badge
                    colorScheme="green"
                    px={3}
                    py={1}
                    borderRadius="full"
                    cursor="pointer"
                    fontSize="xs"
                    fontWeight="medium"
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)', opacity: 0.9 }}
                    onClick={() => {
                      if (isConversationOpen) {
                        setTextInput('Any emails requiring response?');
                      } else {
                        handleVoiceToggle();
                        setTimeout(() => setTextInput('Any emails requiring response?'), 100);
                      }
                      onEmailClose();
                    }}
                  >
                    ✉️ Need Reply?
                  </Badge>
                </HStack>
              </VStack>
            </DrawerHeader>
            <DrawerBody>
              <VStack align="stretch" spacing={3} py={4}>
                {isLoadingEmail ? (
                  <Spinner color={accentColor} />
                ) : emailData && emailData.recent.length > 0 ? (
                  emailData.recent.map((email, i) => {
                    const emailDate = new Date(email.date);
                    const now = new Date();
                    const diffMs = now.getTime() - emailDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    let timeAgo = '';
                    if (diffMins < 60) {
                      timeAgo = `${diffMins}m ago`;
                    } else if (diffHours < 24) {
                      timeAgo = `${diffHours}h ago`;
                    } else if (diffDays < 7) {
                      timeAgo = `${diffDays}d ago`;
                    } else {
                      timeAgo = emailDate.toLocaleDateString();
                    }
                    
                    const urgencyColor = 
                      email.ai_urgency === 'high' ? 'red.400' : 
                      email.ai_urgency === 'medium' ? 'orange.400' : 
                      'green.400';
                    
                    const sentimentIcon = 
                      email.ai_sentiment === 'positive' ? '😊' : 
                      email.ai_sentiment === 'negative' ? '😟' : 
                      '😐';
                    
                    return (
                      <Box
                        key={i}
                        p={4}
                        bg={bgCard}
                        borderRadius="12px"
                        border="1px solid"
                        borderColor={borderColor}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ bg: bgHover, borderColor: accentColor }}
                        onClick={() => {
                          onEmailClose();
                          handleNavigate('/email');
                        }}
                      >
                        <VStack align="start" spacing={2} w="100%">
                          <HStack justify="space-between" w="100%">
                            <Text fontSize="sm" fontWeight="bold" noOfLines={1} flex={1}>
                              {email.from}
                            </Text>
                            <HStack spacing={1}>
                              {email.ai_requires_response && (
                                <Badge colorScheme="purple" fontSize="9px" px={1.5} py={0.5}>
                                  Reply
                                </Badge>
                              )}
                              <Text fontSize="xs" color={textSecondary}>
                                {timeAgo}
                              </Text>
                            </HStack>
                          </HStack>
                          
                          <Text fontSize="sm" color={textPrimary} noOfLines={1} fontWeight="medium">
                            {email.subject}
                          </Text>
                          
                          {email.ai_summary && (
                            <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                              {email.ai_summary}
                            </Text>
                          )}
                          
                          <HStack spacing={2} flexWrap="wrap">
                            {email.ai_urgency && (
                              <Badge 
                                colorScheme={email.ai_urgency === 'high' ? 'red' : email.ai_urgency === 'medium' ? 'orange' : 'green'}
                                fontSize="9px"
                                px={1.5}
                                py={0.5}
                              >
                                {email.ai_urgency}
                              </Badge>
                            )}
                            {email.ai_intent && (
                              <Badge colorScheme="blue" fontSize="9px" px={1.5} py={0.5}>
                                {email.ai_intent}
                              </Badge>
                            )}
                            {email.ai_sentiment && (
                              <Text fontSize="xs">
                                {sentimentIcon}
                              </Text>
                            )}
                          </HStack>
                        </VStack>
                      </Box>
                    );
                  })
                ) : (
                  <Text color={textSecondary}>No recent emails</Text>
                )}
                
                {/* View All Button */}
                <Box
                  as="button"
                  w="100%"
                  p={3}
                  mt={2}
                  bg={accentColor}
                  color="white"
                  borderRadius="12px"
                  fontWeight="medium"
                  transition="all 0.2s"
                  _hover={{ opacity: 0.9 }}
                  onClick={() => {
                    onEmailClose();
                    handleNavigate('/email');
                  }}
                >
                  View All Emails
                </Box>
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>

      
      {/* Conversation History Drawer */}
      <Drawer isOpen={isHistoryOpen} placement="right" onClose={onHistoryClose} size="md">
        <DrawerOverlay />
        <DrawerContent bg={bgBase}>
          <DrawerCloseButton color={textSecondary} />
          <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
            <HStack spacing={3}>
              <Icon as={History} color={accentColor} />
              <Text>Conversation History</Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody p={0}>
            {isLoadingHistory ? (
              <VStack h="200px" justify="center" spacing={3}>
                <Spinner size="lg" color={accentColor} />
                <Text color={textSecondary}>Loading conversations...</Text>
              </VStack>
            ) : savedConversations.length === 0 ? (
              <VStack h="200px" justify="center" spacing={3} opacity={0.6}>
                <Icon as={MessageSquare} boxSize={8} color={textSecondary} />
                <Text color={textSecondary} textAlign="center">
                  No saved conversations yet
                </Text>
                <Text fontSize="sm" color={textSecondary} textAlign="center">
                  Your conversations will appear here
                </Text>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={0} divider={<Divider borderColor={borderColor} />}>
                {savedConversations.map((conv) => (
                  <Box
                    key={conv.id}
                    p={4}
                    cursor="pointer"
                    _hover={{ bg: bgHover }}
                    onClick={() => handleLoadConversation(conv)}
                    transition="background 0.2s"
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium" fontSize="sm" noOfLines={1} flex={1}>
                        {conv.title}
                      </Text>
                      <Text fontSize="xs" color={textSecondary}>
                        {new Date(conv.updated_at * 1000).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                      {conv.preview}
                    </Text>
                    <HStack mt={2} spacing={2}>
                      <Badge 
                        size="sm" 
                        colorScheme="purple" 
                        borderRadius="full"
                        fontSize="xs"
                      >
                        {conv.message_count} messages
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
