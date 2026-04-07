/**
 * Tesla Futuristic Theme
 * 
 * Futuristic Tesla-style dashboard with dark theme, teal accents,
 * and sleek card-based layout optimized for in-vehicle use.
 * 
 * Features:
 * - Vehicle status panel (battery, climate, controls, tires)
 * - Nova voice agent with conversation display
 * - Media controls with album art
 * - Navigation with saved destinations and superchargers
 * - OpenClaw agent monitoring with noVNC embed
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  IconButton,
  Badge,
  Progress,
  Spinner,
  Input,
  InputGroup,
  InputRightElement,
  Tooltip,
  Grid,
  GridItem,
  Collapse,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  useToast,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  Mic,
  MicOff,
  Send,
  Settings,
  Home,
  Car,
  Battery,
  Thermometer,
  CloudSun,
  Zap,
  MapPin,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  Snowflake,
  Package,
  Globe,
  Brain,
  Bot,
  Plus,
  Square,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Clock,
  Mail,
  Calendar,
  Sparkles,
  Server,
  Wifi,
  Radio,
  Search,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import { useTeslaSettings } from '@/hooks/useTeslaSettings';
import VncKeyboardRelay from '@/components/tesla/VncKeyboardRelay';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VehicleData {
  vin?: string;
  display_name?: string;
  model?: string;
  state?: string;
  battery_level?: number;
  battery_range?: number;
  charging_state?: string;
  charge_rate?: number;
  charge_limit?: number;
  is_climate_on?: boolean;
  inside_temp?: number;
  outside_temp?: number;
  battery_temp?: number;
  locked?: boolean;
  sentry_mode?: boolean;
  trunk_open?: boolean;
  odometer?: number;
  tire_pressure?: {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
  };
}

interface EmailData {
  unread: number;
  urgent: number;
  recent: Array<{
    from: string;
    subject: string;
    date: string;
    ai_summary?: string;
    ai_urgency?: string;
  }>;
}

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
}

interface Agent {
  id: string;
  name: string;
  task: string;
  site: string;
  status: 'idle' | 'browsing' | 'checkout' | 'complete' | 'halted';
  progress: number;
  total?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TeslaFuturisticThemeProps {
  vehicleData: VehicleData | null;
  vehicles: Array<{ vin: string; display_name: string; model: string; state: string }>;
  selectedVin: string | null;
  onVehicleSelect: (vin: string) => void;
  emailData: EmailData | null;
  calendarEvents: CalendarEvent[];
  isLoadingEmail: boolean;
  isLoadingCalendar: boolean;
  isLoadingVehicle: boolean;
  onSettingsOpen: () => void;
  // Nova props
  isVoiceActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isConversationOpen: boolean;
  isMuted: boolean;
  conversationHistory: ConversationMessage[];
  currentTranscript: string;
  assistantResponse: string;
  thinkingText: string;
  currentToolCall: { name: string; args?: Record<string, unknown> } | null;
  textInput: string;
  isSendingText: boolean;
  onVoiceToggle: () => void;
  onMuteToggle: () => void;
  onNewConversation: () => void;
  onClearConversation: () => void;
  onSendText: () => void;
  onTextInputChange: (value: string) => void;
  // VNC props
  vncUrl: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { name: 'Home', address: '742 Evergreen Terrace, Springfield', icon: Home, eta: 12, dist: 4.3 },
  { name: 'Office', address: '1 Infinite Loop, Cupertino', icon: Mail, eta: 42, dist: 28.1 },
  { name: 'Costco', address: '4000 Sierra Point Pkwy, Brisbane', icon: Package, eta: 8, dist: 2.7 },
  { name: 'Gym', address: 'Equinox, 301 Mission St', icon: Zap, eta: 6, dist: 1.8 },
];

const SUPERCHARGERS = [
  { name: 'SF Premium Outlet', address: '0.8 mi - 12 stalls open' },
  { name: 'Foster City', address: '4.2 mi - 8 stalls open' },
  { name: 'San Mateo', address: '6.1 mi - 16 stalls open' },
];

const MOCK_AGENTS: Agent[] = [
  { id: 'a1', name: 'Starbucks Agent', task: 'Grande Oat Milk Latte', site: 'starbucks.com', status: 'checkout', progress: 85, total: '$6.45' },
  { id: 'a2', name: 'Amazon Agent', task: 'Anker USB-C Hub 7-in-1', site: 'amazon.com', status: 'browsing', progress: 45, total: undefined },
  { id: 'a3', name: 'Instacart Agent', task: 'Weekly grocery list', site: 'instacart.com', status: 'idle', progress: 0, total: undefined },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

// Animated charge ring SVG
const ChargeGauge = memo(({ level, range, charging, rate }: { level: number; range: number; charging: boolean; rate?: number }) => {
  const circumference = 326.73;
  const offset = circumference - (circumference * level / 100);
  
  return (
    <Box position="relative" display="flex" justifyContent="center">
      <svg viewBox="0 0 120 120" width="130" height="130">
        <defs>
          <linearGradient id="chargeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4aa" />
            <stop offset="100%" stopColor="#00a88a" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#1e1e1e" strokeWidth="7" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="url(#chargeGrad)"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
        <text x="60" y="54" textAnchor="middle" fill="#e0e0e0" fontFamily="Space Grotesk, sans-serif" fontSize="28" fontWeight="700">
          {level}%
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#5a5a5a" fontFamily="DM Sans, sans-serif" fontSize="11">
          {range} mi
        </text>
        <text x="60" y="88" textAnchor="middle" fill="#5a5a5a" fontFamily="DM Sans, sans-serif" fontSize="9">
          {charging ? `${rate || 0} kW` : '-- kW'}
        </text>
      </svg>
    </Box>
  );
});

// Voice wave animation
const VoiceWaves = memo(({ active, color }: { active: boolean; color: string }) => (
  <HStack spacing="3px" h="24px" align="center">
    {[...Array(4)].map((_, i) => (
      <Box
        key={i}
        w="3px"
        bg={color}
        borderRadius="2px"
        sx={{
          '@keyframes typewave': {
            '0%, 100%': { height: '8px' },
            '50%': { height: '24px' },
          },
          animation: active ? `typewave 0.8s ease-in-out infinite` : 'none',
          animationDelay: `${i * 0.15}s`,
          height: '8px',
        }}
      />
    ))}
  </HStack>
));

// Agent status card
const AgentCard = memo(({ agent }: { agent: Agent }) => {
  const statusColors: Record<string, string> = {
    checkout: '#f59e0b',
    browsing: '#00d4aa',
    idle: '#5a5a5a',
    complete: '#22c55e',
    halted: '#ef4444',
  };
  const color = statusColors[agent.status] || statusColors.idle;
  
  return (
    <Box
      bg="#1a1a1a"
      borderRadius="12px"
      p="12px"
      border="1px solid #252525"
      _hover={{ borderColor: '#333' }}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="center" mb="8px">
        <HStack spacing="8px">
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={color}
            sx={agent.status === 'checkout' || agent.status === 'browsing' ? {
              '@keyframes progress-pulse': {
                '0%, 100%': { opacity: 0.7 },
                '50%': { opacity: 1 },
              },
              animation: 'progress-pulse 1.5s infinite',
            } : {}}
          />
          <Text fontSize="xs" fontWeight="medium" color="#e0e0e0" noOfLines={1}>
            {agent.name}
          </Text>
        </HStack>
        <Badge
          fontSize="9px"
          px="6px"
          py="2px"
          borderRadius="full"
          bg={`${color}15`}
          color={color}
        >
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </Badge>
      </Flex>
      <Text fontSize="10px" color="#5a5a5a" noOfLines={1} mb="4px">
        {agent.task}
      </Text>
      <HStack spacing="4px" mb="8px">
        <Icon as={Globe} boxSize="10px" color="#5a5a5a" />
        <Text fontSize="9px" color="#5a5a5a">{agent.site}</Text>
      </HStack>
      <Box w="100%" h="4px" bg="#111" borderRadius="full" overflow="hidden" mb="6px">
        <Box h="100%" bg={color} borderRadius="full" w={`${agent.progress}%`} transition="width 1s" />
      </Box>
      <Flex justify="space-between" fontSize="9px" color="#5a5a5a">
        <Text>{agent.progress}%</Text>
        {agent.total ? <Text color="#e0e0e0" fontWeight="medium">{agent.total}</Text> : <Text>--</Text>}
      </Flex>
    </Box>
  );
});

// VNC Browser component
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
        // @ts-ignore
        allowFullScreen
      />
    );
  }
), (prev, next) => prev.url === next.url);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TeslaFuturisticTheme({
  vehicleData,
  vehicles,
  selectedVin,
  onVehicleSelect,
  emailData,
  calendarEvents,
  isLoadingEmail,
  isLoadingCalendar,
  isLoadingVehicle,
  onSettingsOpen,
  isVoiceActive,
  isListening,
  isSpeaking,
  isThinking,
  isConversationOpen,
  isMuted,
  conversationHistory,
  currentTranscript,
  assistantResponse,
  thinkingText,
  currentToolCall,
  textInput,
  isSendingText,
  onVoiceToggle,
  onMuteToggle,
  onNewConversation,
  onClearConversation,
  onSendText,
  onTextInputChange,
  vncUrl,
}: TeslaFuturisticThemeProps) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  
  // Local state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState<'dashboard' | 'openclaw'>('dashboard');
  const [activeNav, setActiveNav] = useState<typeof DESTINATIONS[0] | null>(null);
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [vncConnected, setVncConnected] = useState(false);
  const [isBrowserExpanded, setIsBrowserExpanded] = useState(false);
  
  const vncIframeRef = useRef<HTMLIFrameElement>(null);
  
  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Simulate agent progress
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.status === 'browsing') {
          const newProgress = Math.min(80, a.progress + Math.random() * 5);
          if (newProgress > 75 && Math.random() > 0.5) {
            return { ...a, status: 'checkout' as const, progress: 80, total: `$${(Math.random() * 40 + 5).toFixed(2)}` };
          }
          return { ...a, progress: newProgress };
        }
        if (a.status === 'checkout') {
          const newProgress = Math.min(100, a.progress + Math.random() * 8);
          if (newProgress >= 100) {
            return { ...a, status: 'complete' as const, progress: 100 };
          }
          return { ...a, progress: newProgress };
        }
        return a;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  // Vehicle controls
  const handleToggleLock = useCallback(() => {
    toast({ title: vehicleData?.locked ? 'Vehicle unlocked' : 'Vehicle locked', status: 'success', duration: 2000 });
  }, [vehicleData?.locked, toast]);
  
  const handleToggleSentry = useCallback(() => {
    toast({ title: `Sentry mode ${vehicleData?.sentry_mode ? 'deactivated' : 'activated'}`, status: 'info', duration: 2000 });
  }, [vehicleData?.sentry_mode, toast]);
  
  const handleToggleClimate = useCallback(() => {
    toast({ title: `Climate ${vehicleData?.is_climate_on ? 'off' : 'on'}`, status: 'info', duration: 2000 });
  }, [vehicleData?.is_climate_on, toast]);
  
  const handleToggleTrunk = useCallback(() => {
    toast({ title: `Trunk ${vehicleData?.trunk_open ? 'closed' : 'opened'}`, status: 'warning', duration: 2000 });
  }, [vehicleData?.trunk_open, toast]);
  
  // Navigation
  const handleSetNav = useCallback((dest: typeof DESTINATIONS[0]) => {
    setActiveNav(dest);
    toast({ title: `Navigating to ${dest.name}`, status: 'success', duration: 2000 });
  }, [toast]);
  
  const handleClearNav = useCallback(() => {
    setActiveNav(null);
    toast({ title: 'Navigation cleared', status: 'info', duration: 2000 });
  }, [toast]);
  
  // VNC controls
  const handleConnectVNC = useCallback(() => {
    setVncConnected(true);
    toast({ title: 'Connecting to noVNC...', status: 'info', duration: 2000 });
  }, [toast]);
  
  const handleDisconnectVNC = useCallback(() => {
    setVncConnected(false);
    toast({ title: 'VNC disconnected', status: 'warning', duration: 2000 });
  }, [toast]);
  
  // Agent controls
  const handleAddAgent = useCallback(() => {
    const names = ['DoorDash Agent', 'Target Agent', 'Uber Eats Agent'];
    const tasks = ['Finding lunch specials', 'Price matching headphones', 'Ordering Thai food'];
    const sites = ['doordash.com', 'target.com', 'ubereats.com'];
    const i = agents.length % names.length;
    setAgents(prev => [...prev, {
      id: `a${Date.now()}`,
      name: names[i],
      task: tasks[i],
      site: sites[i],
      status: 'browsing',
      progress: 5,
      total: undefined,
    }]);
    toast({ title: `${names[i]} spawned`, status: 'success', duration: 2000 });
  }, [agents.length, toast]);
  
  const handleHaltAllAgents = useCallback(() => {
    setAgents(prev => prev.map(a => ({ ...a, status: 'halted' as const })));
    toast({ title: 'All agents halted', status: 'warning', duration: 2000 });
  }, [toast]);
  
  // Get tool display config
  const getToolDisplay = (toolName: string) => {
    const toolConfig: Record<string, { icon: typeof Search; color: string; label: string }> = {
      get_weather: { icon: CloudSun, color: '#00d4aa', label: 'Weather' },
      web_search: { icon: Globe, color: '#00d4aa', label: 'Web Search' },
      openclaw_delegate: { icon: Brain, color: '#a855f7', label: 'Deep Research' },
      check_studio: { icon: Mail, color: '#f59e0b', label: 'Studio' },
    };
    return toolConfig[toolName] || { icon: Brain, color: '#a855f7', label: 'Processing' };
  };
  
  // Derived values
  const batteryLevel = vehicleData?.battery_level ?? 72;
  const batteryRange = vehicleData?.battery_range ? Math.round(vehicleData.battery_range) : 234;
  const isCharging = vehicleData?.charging_state === 'Charging';
  const chargeRate = vehicleData?.charge_rate ?? 0;
  const insideTemp = vehicleData?.inside_temp ? Math.round(vehicleData.inside_temp) : 22;
  const outsideTemp = vehicleData?.outside_temp ? Math.round(vehicleData.outside_temp) : 18;
  const batteryTemp = 28; // Mock
  const odometer = vehicleData?.odometer ? Math.round(vehicleData.odometer / 1000) : 12;
  const isLocked = vehicleData?.locked ?? true;
  const isSentryOn = vehicleData?.sentry_mode ?? true;
  const isClimateOn = vehicleData?.is_climate_on ?? true;
  const isTrunkOpen = vehicleData?.trunk_open ?? false;
  const tirePressure = vehicleData?.tire_pressure ?? { fl: 42, fr: 41, rl: 43, rr: 42 };
  
  return (
    <Box
      minH="100vh"
      h="100vh"
      bg="#080808"
      color="#e0e0e0"
      overflow="hidden"
      position="relative"
      fontFamily="'DM Sans', sans-serif"
    >
      {/* Background grid */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.3}
        pointerEvents="none"
        backgroundImage="radial-gradient(circle, #1a1a1a 1px, transparent 1px)"
        backgroundSize="24px 24px"
      />
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        background="radial-gradient(ellipse at 50% 0%, rgba(0,212,170,0.04) 0%, transparent 60%)"
      />
      
      {/* App shell */}
      <Flex direction="column" h="100%" position="relative" zIndex={10}>
        
        {/* Top Bar */}
        <Flex
          align="center"
          justify="space-between"
          px="20px"
          py="10px"
          borderBottom="1px solid #252525"
          bg="rgba(8,8,8,0.9)"
          backdropFilter="blur(12px)"
          flexShrink={0}
        >
          <HStack spacing="12px">
            <HStack spacing="8px">
              <Box w="28px" h="28px" borderRadius="8px" bg="rgba(0,212,170,0.12)" display="flex" alignItems="center" justifyContent="center">
                <Icon as={Brain} color="#00d4aa" boxSize="14px" />
              </Box>
              <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px" letterSpacing="wide">
                NOVA
              </Text>
            </HStack>
            <HStack
              spacing="6px"
              ml="8px"
              px="8px"
              py="2px"
              borderRadius="full"
              fontSize="10px"
              fontWeight="500"
              bg="rgba(0,212,170,0.1)"
              color="#00d4aa"
            >
              <Box w="6px" h="6px" borderRadius="full" bg="#00d4aa" sx={{ '@keyframes breathe': { '0%, 100%': { opacity: 0.4 }, '50%': { opacity: 1 } }, animation: 'breathe 2s infinite' }} />
              iPhone Synced
            </HStack>
          </HStack>
          
          <HStack spacing="20px" fontSize="12px" color="#5a5a5a">
            {/* Vehicle Selector */}
            <Menu>
              <MenuButton
                as={Button}
                variant="unstyled"
                size="sm"
                rightIcon={<Icon as={ChevronRight} boxSize={3} color="#5a5a5a" />}
                px={0}
                fontWeight="medium"
                display="flex"
                alignItems="center"
                _hover={{ opacity: 0.8 }}
              >
                <HStack spacing="8px">
                  <Icon as={Car} boxSize="10px" color="#00d4aa" />
                  <Text color="#e0e0e0">{vehicleData?.display_name || vehicles[0]?.display_name || 'Model S'}</Text>
                </HStack>
              </MenuButton>
              <MenuList bg="#1a1a1a" border="1px solid #252525" minW="auto">
                {vehicles.map((v) => (
                  <MenuItem
                    key={v.vin}
                    bg="transparent"
                    _hover={{ bg: '#222' }}
                    onClick={() => onVehicleSelect(v.vin)}
                    px={3}
                    py={2}
                  >
                    <HStack spacing={2}>
                      <Text
                        fontWeight={selectedVin === v.vin ? 'bold' : 'normal'}
                        color={selectedVin === v.vin ? '#00d4aa' : '#e0e0e0'}
                      >
                        {v.display_name}
                      </Text>
                      <Text fontSize="xs" color={v.state === 'online' ? '#22c55e' : '#5a5a5a'}>
                        •
                      </Text>
                    </HStack>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
            
            <HStack spacing="6px">
              <Icon as={Wifi} boxSize="10px" color="#00d4aa" />
              <Text>Homelab</Text>
            </HStack>
            <HStack spacing="6px">
              <Icon as={Radio} boxSize="10px" color="#00d4aa" />
              <Text>Tesla API</Text>
            </HStack>
            
            <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="500" fontSize="14px" letterSpacing="wider" color="#e0e0e0">
              {formatTime(currentTime)}
            </Text>
          </HStack>
          
          <HStack spacing="12px">
            <IconButton
              aria-label="Settings"
              icon={<Icon as={Settings} boxSize="14px" color="#5a5a5a" />}
              variant="ghost"
              size="sm"
              borderRadius="8px"
              onClick={onSettingsOpen}
              _hover={{ bg: '#1a1a1a' }}
            />
          </HStack>
        </Flex>
        
        {/* Main Content */}
        <Box flex={1} overflow="hidden" position="relative">
          
          {/* Dashboard View */}
          <Box
            display={currentView === 'dashboard' ? 'flex' : 'none'}
            h="100%"
            sx={{
              opacity: currentView === 'dashboard' ? 1 : 0,
              transform: currentView === 'dashboard' ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {/* Left: Vehicle Status */}
            <Box
              w="270px"
              flexShrink={0}
              borderRight="1px solid #252525"
              overflowY="auto"
              p="16px"
              bg="rgba(14,14,14,0.6)"
            >
              <VStack spacing="16px" align="stretch">
                
                {/* Charge Gauge */}
                <Box bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Flex justify="space-between" align="center" mb="12px">
                    <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider">
                      Battery
                    </Text>
                    <Badge
                      fontSize="10px"
                      px="8px"
                      py="2px"
                      borderRadius="full"
                      fontWeight="500"
                      bg={isCharging ? 'rgba(245,158,11,0.12)' : 'rgba(0,212,170,0.1)'}
                      color={isCharging ? '#f59e0b' : '#00d4aa'}
                    >
                      {isCharging ? 'Charging' : 'Ready'}
                    </Badge>
                  </Flex>
                  <ChargeGauge level={batteryLevel} range={batteryRange} charging={isCharging} rate={chargeRate} />
                  <Flex justify="space-between" mt="12px" fontSize="10px" color="#5a5a5a">
                    <Text>Limit: <Text as="span" color="#e0e0e0">90%</Text></Text>
                    <Text>{isCharging ? '~45 min' : '--'}</Text>
                  </Flex>
                </Box>
                
                {/* Quick Stats */}
                <Grid templateColumns="repeat(2, 1fr)" gap="8px">
                  <Box bg="#1a1a1a" borderRadius="12px" p="12px" border="1px solid #252525">
                    <Icon as={Thermometer} color="#00d4aa" boxSize="10px" mb="6px" />
                    <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="18px" lineHeight="1">
                      {insideTemp}°
                    </Text>
                    <Text fontSize="10px" color="#5a5a5a" mt="4px">Interior</Text>
                  </Box>
                  <Box bg="#1a1a1a" borderRadius="12px" p="12px" border="1px solid #252525">
                    <Icon as={CloudSun} color="#5a5a5a" boxSize="10px" mb="6px" />
                    <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="18px" lineHeight="1">
                      {outsideTemp}°
                    </Text>
                    <Text fontSize="10px" color="#5a5a5a" mt="4px">Exterior</Text>
                  </Box>
                  <Box bg="#1a1a1a" borderRadius="12px" p="12px" border="1px solid #252525">
                    <Icon as={Zap} color="#f59e0b" boxSize="10px" mb="6px" />
                    <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="18px" lineHeight="1">
                      {batteryTemp}°
                    </Text>
                    <Text fontSize="10px" color="#5a5a5a" mt="4px">Battery</Text>
                  </Box>
                  <Box bg="#1a1a1a" borderRadius="12px" p="12px" border="1px solid #252525">
                    <Icon as={Navigation} color="#5a5a5a" boxSize="10px" mb="6px" />
                    <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="18px" lineHeight="1">
                      {odometer}k
                    </Text>
                    <Text fontSize="10px" color="#5a5a5a" mt="4px">Miles</Text>
                  </Box>
                </Grid>
                
                {/* Vehicle Controls */}
                <Box bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider" display="block" mb="12px">
                    Controls
                  </Text>
                  <VStack spacing="8px" align="stretch">
                    <Flex
                      align="center"
                      justify="space-between"
                      px="12px"
                      py="10px"
                      borderRadius="12px"
                      cursor="pointer"
                      _hover={{ bg: '#222' }}
                      transition="background 0.2s"
                      onClick={handleToggleLock}
                    >
                      <HStack spacing="10px">
                        <Icon as={isLocked ? Lock : Unlock} boxSize="12px" color={isLocked ? '#00d4aa' : '#f59e0b'} />
                        <Text fontSize="14px">Lock</Text>
                      </HStack>
                      <Text fontSize="12px" fontWeight="500" color={isLocked ? '#00d4aa' : '#f59e0b'}>
                        {isLocked ? 'Locked' : 'Unlocked'}
                      </Text>
                    </Flex>
                    <Flex
                      align="center"
                      justify="space-between"
                      px="12px"
                      py="10px"
                      borderRadius="12px"
                      cursor="pointer"
                      _hover={{ bg: '#222' }}
                      transition="background 0.2s"
                      onClick={handleToggleSentry}
                    >
                      <HStack spacing="10px">
                        <Icon as={Shield} boxSize="12px" color={isSentryOn ? '#00d4aa' : '#5a5a5a'} />
                        <Text fontSize="14px">Sentry</Text>
                      </HStack>
                      <Text fontSize="12px" fontWeight="500" color={isSentryOn ? '#00d4aa' : '#5a5a5a'}>
                        {isSentryOn ? 'On' : 'Off'}
                      </Text>
                    </Flex>
                    <Flex
                      align="center"
                      justify="space-between"
                      px="12px"
                      py="10px"
                      borderRadius="12px"
                      cursor="pointer"
                      _hover={{ bg: '#222' }}
                      transition="background 0.2s"
                      onClick={handleToggleClimate}
                    >
                      <HStack spacing="10px">
                        <Icon as={Snowflake} boxSize="12px" color={isClimateOn ? '#00d4aa' : '#5a5a5a'} />
                        <Text fontSize="14px">Climate</Text>
                      </HStack>
                      <Text fontSize="12px" fontWeight="500" color={isClimateOn ? '#00d4aa' : '#5a5a5a'}>
                        {isClimateOn ? 'On' : 'Off'}
                      </Text>
                    </Flex>
                    <Flex
                      align="center"
                      justify="space-between"
                      px="12px"
                      py="10px"
                      borderRadius="12px"
                      cursor="pointer"
                      _hover={{ bg: '#222' }}
                      transition="background 0.2s"
                      onClick={handleToggleTrunk}
                    >
                      <HStack spacing="10px">
                        <Icon as={Package} boxSize="12px" color={isTrunkOpen ? '#f59e0b' : '#5a5a5a'} />
                        <Text fontSize="14px">Trunk</Text>
                      </HStack>
                      <Text fontSize="12px" fontWeight="500" color={isTrunkOpen ? '#f59e0b' : '#5a5a5a'}>
                        {isTrunkOpen ? 'Open' : 'Closed'}
                      </Text>
                    </Flex>
                  </VStack>
                </Box>
                
                {/* Tire Pressure */}
                <Box bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider" display="block" mb="12px">
                    Tire Pressure (PSI)
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap="8px" textAlign="center">
                    <Box bg="#111" borderRadius="8px" py="8px">
                      <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">{tirePressure.fl}</Text>
                      <Text fontSize="9px" color="#5a5a5a">FL</Text>
                    </Box>
                    <Box bg="#111" borderRadius="8px" py="8px">
                      <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">{tirePressure.fr}</Text>
                      <Text fontSize="9px" color="#5a5a5a">FR</Text>
                    </Box>
                    <Box bg="#111" borderRadius="8px" py="8px">
                      <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">{tirePressure.rl}</Text>
                      <Text fontSize="9px" color="#5a5a5a">RL</Text>
                    </Box>
                    <Box bg="#111" borderRadius="8px" py="8px">
                      <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">{tirePressure.rr}</Text>
                      <Text fontSize="9px" color="#5a5a5a">RR</Text>
                    </Box>
                  </Grid>
                </Box>
              </VStack>
            </Box>
            
            {/* Center: Nova Conversation */}
            <Box flex={1} display="flex" flexDirection="column" minW={0} bg="rgba(10,10,10,0.5)">
              <Flex
                px="20px"
                py="12px"
                borderBottom="1px solid #252525"
                align="center"
                justify="space-between"
                flexShrink={0}
              >
                <HStack spacing="10px">
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="#00d4aa"
                    sx={{ '@keyframes breathe': { '0%, 100%': { opacity: 0.4 }, '50%': { opacity: 1 } }, animation: isListening ? 'breathe 0.8s infinite' : 'breathe 2s infinite' }}
                  />
                  <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">
                    Nova Voice Agent
                  </Text>
                  <Badge fontSize="10px" color="#5a5a5a" bg="#111" px="8px" py="2px" borderRadius="full">
                    Hands-Free Mode
                  </Badge>
                </HStack>
                <Text fontSize="10px" color="#5a5a5a">
                  Latency: {Math.floor(18 + Math.random() * 15)}ms
                </Text>
              </Flex>
              
              {/* Messages */}
              <Box
                flex={1}
                overflowY="auto"
                px="20px"
                py="16px"
                css={{
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-thumb': { background: '#252525', borderRadius: '4px' },
                }}
              >
                <VStack align="stretch" spacing="12px">
                  {conversationHistory.map((msg, i) => (
                    <Box
                      key={i}
                      alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                      maxW="85%"
                      sx={msg.role === 'user' ? {
                        '@keyframes slide-in-right': {
                          from: { opacity: 0, transform: 'translateX(20px)' },
                          to: { opacity: 1, transform: 'translateX(0)' },
                        },
                        animation: 'slide-in-right 0.3s ease-out',
                      } : {
                        '@keyframes slide-in-left': {
                          from: { opacity: 0, transform: 'translateX(-20px)' },
                          to: { opacity: 1, transform: 'translateX(0)' },
                        },
                        animation: 'slide-in-left 0.3s ease-out',
                      }}
                    >
                      <HStack spacing="10px" flexDirection={msg.role === 'user' ? 'row-reverse' : 'row'}>
                        <Box
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg={msg.role === 'user' ? '#111' : 'rgba(0,212,170,0.12)'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon as={msg.role === 'user' ? Brain : Brain} boxSize="9px" color={msg.role === 'user' ? '#5a5a5a' : '#00d4aa'} />
                        </Box>
                        <Box>
                          <Box
                            bg={msg.role === 'user' ? 'rgba(0,212,170,0.12)' : '#1a1a1a'}
                            border={msg.role === 'user' ? '1px solid rgba(0,212,170,0.15)' : '1px solid #252525'}
                            borderRadius={msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}
                            px="14px"
                            py="10px"
                          >
                            {msg.role === 'assistant' ? (
                              <Box fontSize="14px" lineHeight="relaxed" sx={{ '& p': { margin: 0 } }}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </Box>
                            ) : (
                              <Text fontSize="14px" lineHeight="relaxed">{msg.content}</Text>
                            )}
                          </Box>
                          <Text fontSize="10px" color="#5a5a5a" mt="4px" textAlign={msg.role === 'user' ? 'right' : 'left'}>
                            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                  
                  {/* Current transcript */}
                  {currentTranscript && (
                    <Box alignSelf="flex-end" maxW="85%" opacity={0.8}>
                      <Box bg="rgba(0,212,170,0.12)" borderRadius="18px 18px 4px 18px" px="14px" py="10px">
                        <Text fontSize="14px">{currentTranscript}</Text>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Thinking indicator */}
                  {isThinking && (
                    <Box alignSelf="flex-start" maxW="90%">
                      <HStack spacing="10px">
                        <Box w="24px" h="24px" borderRadius="full" bg="rgba(0,212,170,0.12)" display="flex" alignItems="center" justifyContent="center">
                          <Icon as={Brain} boxSize="9px" color="#00d4aa" />
                        </Box>
                        <Box bg="#1a1a1a" border="1px solid #252525" borderRadius="18px 18px 18px 4px" px="16px" py="12px">
                          <HStack spacing="4px">
                            <VoiceWaves active color="#00d4aa" />
                          </HStack>
                          {thinkingText && (
                            <Text fontSize="12px" color="#5a5a5a" mt="8px">{thinkingText}</Text>
                          )}
                        </Box>
                      </HStack>
                    </Box>
                  )}
                  
                  {/* Streaming response */}
                  {assistantResponse && (
                    <Box alignSelf="flex-start" maxW="85%">
                      <HStack spacing="10px">
                        <Box w="24px" h="24px" borderRadius="full" bg="rgba(0,212,170,0.12)" display="flex" alignItems="center" justifyContent="center">
                          <Icon as={Brain} boxSize="9px" color="#00d4aa" />
                        </Box>
                        <Box bg="#1a1a1a" border="1px solid #252525" borderRadius="18px 18px 18px 4px" px="14px" py="10px">
                          <Box fontSize="14px" lineHeight="relaxed" sx={{ '& p': { margin: 0 } }}>
                            <ReactMarkdown>{assistantResponse}</ReactMarkdown>
                          </Box>
                        </Box>
                      </HStack>
                    </Box>
                  )}
                </VStack>
              </Box>
              
              {/* Voice Input Area */}
              <Box px="20px" py="16px" borderTop="1px solid #252525" flexShrink={0}>
                <HStack spacing="12px">
                  <Box position="relative" flexShrink={0}>
                    <Box
                      as="button"
                      w="56px"
                      h="56px"
                      borderRadius="full"
                      bg={isListening ? 'rgba(0,212,170,0.25)' : 'rgba(0,212,170,0.12)'}
                      border="2px solid #00d4aa"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={onVoiceToggle}
                      transition="all 0.2s"
                      _hover={{ transform: 'scale(1.05)' }}
                      _active={{ transform: 'scale(0.95)' }}
                      sx={isListening ? {
                        '@keyframes pulse-ring': {
                          '0%': { transform: 'scale(1)', opacity: 0.6 },
                          '100%': { transform: 'scale(1.5)', opacity: 0 },
                        },
                        '&::before, &::after': {
                          content: '""',
                          position: 'absolute',
                          inset: '-8px',
                          borderRadius: 'full',
                          border: '2px solid #00d4aa',
                          animation: 'pulse-ring 2s ease-out infinite',
                        },
                        '&::after': { animationDelay: '0.6s' },
                      } : {}}
                    >
                      <Icon as={isMuted ? MicOff : Mic} color="#00d4aa" boxSize="20px" />
                    </Box>
                    {isListening && (
                      <Box position="absolute" bottom="-4px" left="50%" transform="translateX(-50%)">
                        <VoiceWaves active color="#00d4aa" />
                      </Box>
                    )}
                  </Box>
                  <Box flex={1} position="relative">
                    <Input
                      placeholder="Or type a command..."
                      value={textInput}
                      onChange={(e) => onTextInputChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSendText()}
                      bg="#1a1a1a"
                      border="1px solid #252525"
                      borderRadius="12px"
                      px="16px"
                      py="12px"
                      fontSize="14px"
                      color="#e0e0e0"
                      _placeholder={{ color: '#5a5a5a' }}
                      _focus={{ borderColor: '#00d4aa', boxShadow: '0 0 0 2px rgba(0,212,170,0.15)' }}
                      isDisabled={isSendingText}
                    />
                    <IconButton
                      aria-label="Send message"
                      icon={isSendingText ? <Spinner size="sm" color="#5a5a5a" /> : <Icon as={Send} boxSize="14px" color="#5a5a5a" />}
                      position="absolute"
                      right="8px"
                      top="50%"
                      transform="translateY(-50%)"
                      variant="ghost"
                      size="sm"
                      borderRadius="8px"
                      onClick={onSendText}
                      isDisabled={!textInput.trim() || isSendingText}
                      _hover={{ bg: '#222' }}
                    />
                  </Box>
                </HStack>
                <Text fontSize="10px" color="#5a5a5a" textAlign="center" mt="8px" h="16px">
                  {isListening ? 'Listening...' : isSpeaking ? 'Nova is speaking...' : isThinking ? 'Processing...' : 'Tap microphone or press and hold scroll-wheel to activate'}
                </Text>
              </Box>
            </Box>
            
            {/* Right: Media + Navigation */}
            <Box
              w="280px"
              flexShrink={0}
              borderLeft="1px solid #252525"
              overflowY="auto"
              p="16px"
              bg="rgba(14,14,14,0.6)"
            >
              <VStack spacing="16px" align="stretch">
                
                {/* Media Controls */}
                <Box bg="#1a1a1a" borderRadius="16px" border="1px solid #252525" overflow="hidden">
                  <Box p="16px">
                    <Flex justify="space-between" align="center" mb="12px">
                      <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider">
                        Now Playing
                      </Text>
                      <Badge fontSize="10px" bg="rgba(0,212,170,0.12)" color="#00d4aa" px="8px" py="2px" borderRadius="full" fontWeight="500">
                        Spotify
                      </Badge>
                    </Flex>
                    <HStack spacing="12px">
                      <Box
                        w="64px"
                        h="64px"
                        borderRadius="12px"
                        bg="#222"
                        backgroundImage="url('https://picsum.photos/seed/afterhours/100/100')"
                        backgroundSize="cover"
                        flexShrink={0}
                      />
                      <Box minW={0} flex={1}>
                        <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px" noOfLines={1}>
                          Blinding Lights
                        </Text>
                        <Text fontSize="12px" color="#5a5a5a" noOfLines={1} mt="2px">
                          The Weeknd
                        </Text>
                        <Text fontSize="10px" color="#5a5a5a" noOfLines={1} mt="2px">
                          After Hours
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                  <Box px="16px" pb="4px">
                    <Box w="100%" h="4px" bg="#111" borderRadius="full" overflow="hidden">
                      <Box h="100%" bg="#00d4aa" borderRadius="full" w="45%" />
                    </Box>
                    <Flex justify="space-between" fontSize="10px" color="#5a5a5a" mt="4px">
                      <Text>1:29</Text>
                      <Text>3:20</Text>
                    </Flex>
                  </Box>
                  <Flex align="center" justify="center" gap="24px" py="12px" borderTop="1px solid #252525">
                    <Icon as={SkipBack} color="#5a5a5a" boxSize="16px" cursor="pointer" _hover={{ color: '#e0e0e0' }} />
                    <Box
                      as="button"
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      bg="#e0e0e0"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      _hover={{ transform: 'scale(1.05)' }}
                      _active={{ transform: 'scale(0.95)' }}
                    >
                      <Icon as={Pause} color="#080808" boxSize="14px" />
                    </Box>
                    <Icon as={SkipForward} color="#5a5a5a" boxSize="16px" cursor="pointer" _hover={{ color: '#e0e0e0' }} />
                  </Flex>
                  <Flex align="center" justify="space-between" px="16px" py="10px" borderTop="1px solid #252525" fontSize="10px" color="#5a5a5a">
                    <Icon as={Shuffle} boxSize="12px" cursor="pointer" _hover={{ color: '#e0e0e0' }} />
                    <Icon as={Repeat} boxSize="12px" cursor="pointer" _hover={{ color: '#e0e0e0' }} />
                    <HStack spacing="6px">
                      <Icon as={Volume2} boxSize="12px" />
                      <Box w="64px" h="4px" bg="#111" borderRadius="full" overflow="hidden">
                        <Box h="100%" bg="#5a5a5a" borderRadius="full" w="70%" />
                      </Box>
                    </HStack>
                  </Flex>
                </Box>
                
                {/* Navigation */}
                <Box bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Flex justify="space-between" align="center" mb="12px">
                    <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider">
                      Navigation
                    </Text>
                    {activeNav && (
                      <Text
                        fontSize="10px"
                        color="#5a5a5a"
                        cursor="pointer"
                        _hover={{ color: '#e0e0e0' }}
                        onClick={handleClearNav}
                      >
                        Clear
                      </Text>
                    )}
                  </Flex>
                  
                  {activeNav && (
                    <Box mb="12px" p="12px" borderRadius="12px" bg="rgba(0,212,170,0.12)" border="1px solid rgba(0,212,170,0.2)">
                      <HStack spacing="8px" mb="4px">
                        <Icon as={Navigation} color="#00d4aa" boxSize="10px" />
                        <Text fontSize="12px" fontWeight="500" color="#00d4aa">{activeNav.name}</Text>
                      </HStack>
                      <Text fontSize="10px" color="#5a5a5a">{activeNav.address}</Text>
                      <HStack spacing="12px" mt="8px" fontSize="10px">
                        <Text color="#e0e0e0" fontWeight="500">{activeNav.eta} min</Text>
                        <Text color="#5a5a5a">{activeNav.dist} mi</Text>
                      </HStack>
                    </Box>
                  )}
                  
                  <VStack spacing="6px" align="stretch">
                    {DESTINATIONS.map((dest) => (
                      <Flex
                        key={dest.name}
                        align="center"
                        gap="12px"
                        px="12px"
                        py="10px"
                        borderRadius="12px"
                        cursor="pointer"
                        _hover={{ bg: '#222' }}
                        transition="background 0.2s"
                        onClick={() => handleSetNav(dest)}
                      >
                        <Box w="32px" h="32px" borderRadius="8px" bg="#111" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                          <Icon as={dest.icon} color="#5a5a5a" boxSize="12px" />
                        </Box>
                        <Box minW={0}>
                          <Text fontSize="12px" fontWeight="500" noOfLines={1}>{dest.name}</Text>
                          <Text fontSize="10px" color="#5a5a5a" noOfLines={1}>{dest.address}</Text>
                        </Box>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
                
                {/* Nearby Superchargers */}
                <Box bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider" display="block" mb="12px">
                    Nearby Superchargers
                  </Text>
                  <VStack spacing="8px" align="stretch">
                    {SUPERCHARGERS.map((sc) => (
                      <Flex
                        key={sc.name}
                        align="center"
                        justify="space-between"
                        p="8px"
                        borderRadius="8px"
                        cursor="pointer"
                        _hover={{ bg: '#222' }}
                        transition="background 0.2s"
                      >
                        <Box>
                          <Text fontSize="12px" fontWeight="500">{sc.name}</Text>
                          <Text fontSize="10px" color="#5a5a5a">{sc.address}</Text>
                        </Box>
                        <Icon as={Zap} color="#f59e0b" boxSize="12px" />
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </Box>
          
          {/* OpenClaw View */}
          <Box
            display={currentView === 'openclaw' ? 'flex' : 'none'}
            h="100%"
            sx={{
              opacity: currentView === 'openclaw' ? 1 : 0,
              transform: currentView === 'openclaw' ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {/* Agent Monitor Sidebar */}
            <Box
              w="250px"
              flexShrink={0}
              borderRight="1px solid #252525"
              overflowY="auto"
              p="16px"
              bg="rgba(14,14,14,0.6)"
            >
              <VStack spacing="16px" align="stretch">
                <Flex justify="space-between" align="center">
                  <HStack spacing="8px">
                    <Box w="28px" h="28px" borderRadius="8px" bg="#f59e0b" display="flex" alignItems="center" justifyContent="center">
                      <Icon as={Bot} color="#080808" boxSize="14px" />
                    </Box>
                    <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="14px">
                      OpenClaw
                    </Text>
                  </HStack>
                  <Text fontSize="10px" color="#5a5a5a">{agents.length} agents</Text>
                </Flex>
                
                <VStack spacing="8px" align="stretch">
                  {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </VStack>
                
                {/* Agent Actions */}
                <Box mt="auto" bg="#1a1a1a" borderRadius="16px" p="16px" border="1px solid #252525">
                  <Text fontSize="12px" fontWeight="500" color="#5a5a5a" textTransform="uppercase" letterSpacing="wider" display="block" mb="12px">
                    Quick Actions
                  </Text>
                  <Button
                    w="100%"
                    size="sm"
                    bg="rgba(0,212,170,0.12)"
                    color="#00d4aa"
                    fontSize="12px"
                    fontWeight="500"
                    borderRadius="12px"
                    leftIcon={<Icon as={Plus} boxSize="12px" />}
                    _hover={{ bg: 'rgba(0,212,170,0.2)' }}
                    onClick={handleAddAgent}
                    mb="8px"
                  >
                    Spawn New Agent
                  </Button>
                  <Button
                    w="100%"
                    size="sm"
                    bg="rgba(239,68,68,0.12)"
                    color="#ef4444"
                    fontSize="12px"
                    fontWeight="500"
                    borderRadius="12px"
                    leftIcon={<Icon as={Square} boxSize="12px" />}
                    _hover={{ bg: 'rgba(239,68,68,0.2)' }}
                    onClick={handleHaltAllAgents}
                  >
                    Halt All Agents
                  </Button>
                </Box>
              </VStack>
            </Box>
            
            {/* noVNC Embed */}
            <Box flex={1} position="relative" overflow="hidden" bg="#0a0a0a">
              {/* Scan line effect - only visible when not connected, subtle when connected */}
              {(!vncConnected || true) && (
                <Box
                  position="absolute"
                  left={0}
                  right={0}
                  h="1px"
                  bg="linear-gradient(90deg, transparent, rgba(0,212,170,0.15), transparent)"
                  sx={{
                    '@keyframes scanline': {
                      '0%': { top: '-1px' },
                      '100%': { top: '100%' },
                    },
                    animation: vncConnected ? 'scanline 18s linear infinite' : 'scanline 4s linear infinite',
                    opacity: vncConnected ? 0.4 : 1,
                  }}
                  pointerEvents="none"
                  zIndex={10}
                />
              )}
              
              {!vncConnected ? (
                <Flex direction="column" align="center" justify="center" h="100%" position="relative" zIndex={20}>
                  <Box w="80px" h="80px" borderRadius="16px" bg="#1a1a1a" border="1px solid #252525" display="flex" alignItems="center" justifyContent="center" mb="16px">
                    <Icon as={Globe} boxSize="32px" color="#5a5a5a" />
                  </Box>
                  <Text fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="18px" mb="4px">
                    noVNC Remote Browser
                  </Text>
                  <Text fontSize="14px" color="#5a5a5a" mb="16px" textAlign="center" maxW="400px">
                    Connect to your OpenClaw instance to oversee agent browser sessions
                  </Text>
                  <Button
                    size="md"
                    bg="#00d4aa"
                    color="#080808"
                    fontFamily="'Space Grotesk', sans-serif"
                    fontWeight="600"
                    fontSize="14px"
                    borderRadius="12px"
                    leftIcon={<Icon as={Wifi} boxSize="16px" />}
                    _hover={{ filter: 'brightness(1.1)' }}
                    _active={{ transform: 'scale(0.95)' }}
                    onClick={handleConnectVNC}
                  >
                    Connect
                  </Button>
                  <Text fontSize="10px" color="#5a5a5a" mt="12px">Configure URL in Settings</Text>
                </Flex>
              ) : (
                <>
                  <VncBrowser ref={vncIframeRef} url={vncUrl} />
                  <VncKeyboardRelay iframeRef={vncIframeRef} />
                  
                  {/* VNC Controls */}
                  <HStack position="absolute" top="12px" right="12px" spacing="8px" zIndex={30}>
                    <IconButton
                      aria-label="Refresh VNC"
                      icon={<Icon as={RefreshCw} boxSize="12px" />}
                      size="sm"
                      borderRadius="8px"
                      bg="rgba(26,26,26,0.8)"
                      border="1px solid #252525"
                      color="#5a5a5a"
                      _hover={{ color: '#e0e0e0' }}
                      backdropFilter="blur(8px)"
                    />
                    <IconButton
                      aria-label="Fullscreen VNC"
                      icon={<Icon as={Maximize2} boxSize="12px" />}
                      size="sm"
                      borderRadius="8px"
                      bg="rgba(26,26,26,0.8)"
                      border="1px solid #252525"
                      color="#5a5a5a"
                      _hover={{ color: '#e0e0e0' }}
                      backdropFilter="blur(8px)"
                    />
                    <IconButton
                      aria-label="Disconnect VNC"
                      icon={<Icon as={X} boxSize="12px" />}
                      size="sm"
                      borderRadius="8px"
                      bg="rgba(239,68,68,0.2)"
                      border="1px solid rgba(239,68,68,0.2)"
                      color="#ef4444"
                      _hover={{ color: '#f87171' }}
                      backdropFilter="blur(8px)"
                      onClick={handleDisconnectVNC}
                    />
                  </HStack>
                </>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Bottom Tab Bar - Modern Pill Buttons */}
        <Flex
          flexShrink={0}
          align="center"
          justify="center"
          gap="12px"
          px="20px"
          py="14px"
          bg="rgba(8,8,8,0.98)"
          backdropFilter="blur(16px)"
          borderTop="1px solid #1a1a1a"
        >
          {/* Dashboard Button */}
          <Box
            as="button"
            display="flex"
            alignItems="center"
            gap="10px"
            px="20px"
            py="10px"
            borderRadius="full"
            bg={currentView === 'dashboard' ? 'rgba(0,212,170,0.15)' : 'transparent'}
            border="1px solid"
            borderColor={currentView === 'dashboard' ? 'rgba(0,212,170,0.4)' : '#252525'}
            color={currentView === 'dashboard' ? '#00d4aa' : '#5a5a5a'}
            fontFamily="'Space Grotesk', sans-serif"
            fontWeight="500"
            fontSize="13px"
            letterSpacing="0.5px"
            cursor="pointer"
            transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
            boxShadow={currentView === 'dashboard' ? '0 0 20px rgba(0,212,170,0.2), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none'}
            _hover={{
              bg: currentView === 'dashboard' ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.03)',
              borderColor: currentView === 'dashboard' ? 'rgba(0,212,170,0.5)' : '#333',
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'scale(0.97)' }}
            onClick={() => setCurrentView('dashboard')}
          >
            <Box
              w="18px"
              h="18px"
              borderRadius="6px"
              bg={currentView === 'dashboard' ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.05)'}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={Zap} boxSize="12px" color={currentView === 'dashboard' ? '#00d4aa' : '#5a5a5a'} />
            </Box>
            Dashboard
          </Box>

          {/* OpenClaw Button */}
          <Box
            as="button"
            display="flex"
            alignItems="center"
            gap="10px"
            px="20px"
            py="10px"
            borderRadius="full"
            bg={currentView === 'openclaw' ? 'rgba(245,158,11,0.15)' : 'transparent'}
            border="1px solid"
            borderColor={currentView === 'openclaw' ? 'rgba(245,158,11,0.4)' : '#252525'}
            color={currentView === 'openclaw' ? '#f59e0b' : '#5a5a5a'}
            fontFamily="'Space Grotesk', sans-serif"
            fontWeight="500"
            fontSize="13px"
            letterSpacing="0.5px"
            cursor="pointer"
            transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
            boxShadow={currentView === 'openclaw' ? '0 0 20px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none'}
            _hover={{
              bg: currentView === 'openclaw' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
              borderColor: currentView === 'openclaw' ? 'rgba(245,158,11,0.5)' : '#333',
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'scale(0.97)' }}
            onClick={() => setCurrentView('openclaw')}
          >
            <Box
              w="18px"
              h="18px"
              borderRadius="6px"
              bg={currentView === 'openclaw' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={Bot} boxSize="12px" color={currentView === 'openclaw' ? '#f59e0b' : '#5a5a5a'} />
            </Box>
            OpenClaw
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}
