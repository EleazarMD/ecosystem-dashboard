/**
 * CalendarAssistantPanel - Enhanced AI chat interface for calendar commands
 * Features:
 * - Event actions with confirmation (reschedule, delete)
 * - Visible events context for pattern analysis
 * - Smart suggestions based on calendar patterns
 * - Voice input for hands-free commands
 * - Email integration hooks
 * - Draggable time slot suggestions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Icon,
  Input,
  Badge,
  Spinner,
  Tooltip,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  Collapse,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSend, 
  FiZap, 
  FiCalendar, 
  FiClock, 
  FiTrash2, 
  FiCopy, 
  FiMic, 
  FiMicOff,
  FiMail,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiMove,
  FiTrendingUp,
} from 'react-icons/fi';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MotionBox = motion(Box);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ name: string; result: string }>;
  actionRequired?: PendingAction;
  suggestedSlots?: TimeSlot[];
}

interface TimeSlot {
  start: string;
  end: string;
  formatted: string;
  confidence: number;
}

interface PendingAction {
  type: 'delete' | 'reschedule' | 'create';
  eventId?: string;
  eventTitle?: string;
  newTime?: string;
  confirmed?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  calendar_name?: string;
  calendar_id?: string;
  location?: string;
  description?: string;
}

interface CalendarContext {
  selectedEvent?: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    calendar_name?: string;
  };
  currentDate?: Date;
  viewMode?: 'month' | 'week' | 'day' | 'agenda';
  todayEventCount?: number;
  visibleEvents?: CalendarEvent[];
}

interface SmartSuggestion {
  id: string;
  type: 'warning' | 'tip' | 'insight';
  message: string;
  action?: string;
}

interface CalendarAssistantPanelProps {
  customData?: {
    calendarContext?: CalendarContext;
    emailContext?: {
      subject?: string;
      sender?: string;
      suggestedTime?: string;
    };
    onEventCreated?: (event: CalendarEvent) => void;
    onEventUpdated?: (event: CalendarEvent) => void;
    onEventDeleted?: (eventId: string) => void;
    onSlotSelected?: (slot: TimeSlot) => void;
  };
}

const QUICK_ACTIONS = [
  { label: "Today's Agenda", prompt: "What's on my calendar today?", icon: FiCalendar },
  { label: 'Free Time', prompt: 'Find free time slots tomorrow', icon: FiClock },
  { label: 'Busy Analysis', prompt: 'Analyze my busiest days this week', icon: FiTrendingUp },
  { label: 'Conflicts', prompt: 'Check for scheduling conflicts', icon: FiAlertTriangle },
];

export default function CalendarAssistantPanel({ customData }: CalendarAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const toast = useToast();

  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  const userMsgBg = useColorModeValue('linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%)', 'linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%)');
  const assistantMsgBg = useColorModeValue('white', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  const warningBg = useColorModeValue('orange.50', 'orange.900');
  const tipBg = useColorModeValue('green.50', 'green.900');

  const calendarContext = customData?.calendarContext;
  const emailContext = customData?.emailContext;

  // Copy message to clipboard
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!', status: 'success', duration: 1500 });
  };

  // Generate smart suggestions based on visible events
  const generateSmartSuggestions = useCallback(() => {
    const suggestions: SmartSuggestion[] = [];
    const events = calendarContext?.visibleEvents || [];
    const today = new Date();
    
    if (events.length === 0) return suggestions;

    // Check for back-to-back meetings
    const todayEvents = events.filter(e => 
      new Date(e.start_time).toDateString() === today.toDateString()
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let backToBackCount = 0;
    for (let i = 1; i < todayEvents.length; i++) {
      const prevEnd = new Date(todayEvents[i - 1].end_time).getTime();
      const currStart = new Date(todayEvents[i].start_time).getTime();
      if (currStart - prevEnd < 15 * 60 * 1000) { // Less than 15 min gap
        backToBackCount++;
      }
    }

    if (backToBackCount >= 2) {
      suggestions.push({
        id: 'back-to-back',
        type: 'warning',
        message: `You have ${backToBackCount + 1} back-to-back meetings today. Consider adding buffer time.`,
        action: 'Find buffer time',
      });
    }

    // Check for busy day
    if (todayEvents.length >= 5) {
      suggestions.push({
        id: 'busy-day',
        type: 'insight',
        message: `Busy day ahead! You have ${todayEvents.length} events scheduled.`,
        action: 'Show agenda',
      });
    }

    // Check for early morning meetings
    const earlyMeetings = todayEvents.filter(e => {
      const hour = new Date(e.start_time).getHours();
      return hour < 9;
    });
    if (earlyMeetings.length > 0) {
      suggestions.push({
        id: 'early-meeting',
        type: 'tip',
        message: `Early start: "${earlyMeetings[0].title}" at ${new Date(earlyMeetings[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    }

    // Check for long meetings (> 2 hours)
    const longMeetings = events.filter(e => {
      const duration = new Date(e.end_time).getTime() - new Date(e.start_time).getTime();
      return duration > 2 * 60 * 60 * 1000;
    });
    if (longMeetings.length > 0) {
      suggestions.push({
        id: 'long-meeting',
        type: 'insight',
        message: `You have ${longMeetings.length} meeting(s) over 2 hours this week.`,
      });
    }

    return suggestions;
  }, [calendarContext?.visibleEvents]);

  // Update smart suggestions when events change
  useEffect(() => {
    const suggestions = generateSmartSuggestions();
    setSmartSuggestions(suggestions);
  }, [generateSmartSuggestions]);

  // Initialize with welcome message (context-aware)
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeContent = '';
      
      if (emailContext?.subject) {
        welcomeContent = `📧 I see you're working with an email: "${emailContext.subject}"\n\n`;
        if (emailContext.suggestedTime) {
          welcomeContent += `I detected a potential meeting time: **${emailContext.suggestedTime}**\n\n`;
        }
        welcomeContent += 'Would you like me to schedule a meeting based on this email?';
      } else if (calendarContext?.selectedEvent) {
        welcomeContent = `I see you've selected "${calendarContext.selectedEvent.title}". I can:\n\n• **Reschedule** - "Move to tomorrow at 3pm"\n• **Delete** - "Cancel this event"\n• **Check conflicts** - "Any overlapping events?"\n• **Find alternatives** - "Find a better time"\n\nWhat would you like to do?`;
      } else {
        welcomeContent = `Hello! I'm your Calendar AI assistant. I can help you:\n\n• **View agenda** - "What's on my calendar today?"\n• **Find free time** - "When am I available tomorrow?"\n• **Schedule events** - "Schedule a meeting at 2pm"\n• **Analyze patterns** - "What's my busiest day?"\n\nWhat would you like to do?`;
      }

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date(),
      }]);
    }
  }, []);

  // Update when selected event changes
  useEffect(() => {
    if (calendarContext?.selectedEvent && messages.length > 0) {
      const contextMessage: ChatMessage = {
        id: `context-${Date.now()}`,
        role: 'assistant',
        content: `📅 **Selected Event:** ${calendarContext.selectedEvent.title}\n⏰ ${new Date(calendarContext.selectedEvent.start_time).toLocaleString()}\n${calendarContext.selectedEvent.calendar_name ? `📁 ${calendarContext.selectedEvent.calendar_name}` : ''}\n\nHow can I help with this event?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, contextMessage]);
    }
  }, [calendarContext?.selectedEvent?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice input setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({ title: 'Voice input error', status: 'error', duration: 2000 });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Voice input not supported', status: 'warning', duration: 2000 });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Route action through approval system
  const executeAction = async (action: PendingAction) => {
    setIsProcessing(true);
    try {
      const selectedEvent = calendarContext?.selectedEvent;
      
      if (action.type === 'delete' && action.eventId && selectedEvent) {
        // Route through approval API
        const response = await fetch('/api/approvals/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            event: {
              event_id: action.eventId,
              title: action.eventTitle || selectedEvent.title,
              start_time: selectedEvent.start_time,
              end_time: selectedEvent.end_time,
              calendar_name: selectedEvent.calendar_name,
            },
            agent: {
              id: 'calendar-assistant',
              name: 'Calendar AI Assistant',
              type: 'calendar-agent',
            },
            reasoning: `User requested deletion of "${action.eventTitle}"`,
            confidence: 0.95,
            context: 'Calendar Assistant Panel',
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'approved') {
            customData?.onEventDeleted?.(action.eventId);
            toast({ title: 'Event deleted', status: 'success', duration: 2000 });
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ "${action.eventTitle}" has been deleted from your calendar.`,
              timestamp: new Date(),
              toolCalls: [{ name: 'calendar_delete_event', result: 'success' }],
            }]);
          } else {
            toast({ title: 'Sent for approval', description: 'Check your approvals queue', status: 'info', duration: 3000 });
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `📱 **Approval Required**\n\nThe delete request for "${action.eventTitle}" has been sent to your approvals queue.\n\nYou can approve it from your mobile dashboard.`,
              timestamp: new Date(),
              toolCalls: [{ name: 'approval_requested', result: data.approval_id }],
            }]);
          }
        } else {
          throw new Error('Failed to submit for approval');
        }
      } else if (action.type === 'reschedule' && action.eventId && action.newTime && selectedEvent) {
        // Route through approval API
        const response = await fetch('/api/approvals/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            event: {
              event_id: action.eventId,
              title: action.eventTitle || selectedEvent.title,
              start_time: action.newTime,
              end_time: selectedEvent.end_time, // Would need to calculate new end time
              calendar_name: selectedEvent.calendar_name,
            },
            agent: {
              id: 'calendar-assistant',
              name: 'Calendar AI Assistant',
              type: 'calendar-agent',
            },
            reasoning: `User requested reschedule of "${action.eventTitle}" to ${new Date(action.newTime).toLocaleString()}`,
            confidence: 0.9,
            context: 'Calendar Assistant Panel',
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'approved') {
            customData?.onEventUpdated?.({ ...selectedEvent, start_time: action.newTime } as CalendarEvent);
            toast({ title: 'Event rescheduled', status: 'success', duration: 2000 });
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ "${action.eventTitle}" has been rescheduled to ${new Date(action.newTime).toLocaleString()}.`,
              timestamp: new Date(),
              toolCalls: [{ name: 'calendar_update_event', result: 'success' }],
            }]);
          } else {
            toast({ title: 'Sent for approval', description: 'Check your approvals queue', status: 'info', duration: 3000 });
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `📱 **Approval Required**\n\nThe reschedule request for "${action.eventTitle}" has been sent to your approvals queue.\n\nYou can approve it from your mobile dashboard.`,
              timestamp: new Date(),
              toolCalls: [{ name: 'approval_requested', result: data.approval_id }],
            }]);
          }
        } else {
          throw new Error('Failed to submit for approval');
        }
      }
    } catch (error) {
      toast({ title: 'Action failed', description: (error as Error).message, status: 'error', duration: 3000 });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Sorry, I couldn't complete that action. Please try again or do it manually.`,
        timestamp: new Date(),
      }]);
    } finally {
      setPendingAction(null);
      setIsProcessing(false);
    }
  };

  // Handle slot selection (for drag-and-drop)
  const handleSlotSelect = (slot: TimeSlot) => {
    customData?.onSlotSelected?.(slot);
    toast({ 
      title: 'Time slot selected', 
      description: slot.formatted,
      status: 'info', 
      duration: 2000 
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isProcessing) return;

    // Stop voice input if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    const lower = text.toLowerCase();

    // Check for confirmation of pending action
    if (pendingAction && (lower.includes('yes') || lower.includes('confirm') || lower.includes('do it'))) {
      await executeAction(pendingAction);
      return;
    }

    // Check for cancellation of pending action
    if (pendingAction && (lower.includes('no') || lower.includes('cancel') || lower.includes('nevermind'))) {
      setPendingAction(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '👍 No problem, action cancelled. What else can I help with?',
        timestamp: new Date(),
      }]);
      setIsProcessing(false);
      return;
    }

    // Check for delete intent
    if ((lower.includes('delete') || lower.includes('cancel') || lower.includes('remove')) && calendarContext?.selectedEvent) {
      const action: PendingAction = {
        type: 'delete',
        eventId: calendarContext.selectedEvent.id,
        eventTitle: calendarContext.selectedEvent.title,
      };
      setPendingAction(action);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🗑️ **Delete Event?**\n\nAre you sure you want to delete "${calendarContext.selectedEvent.title}"?\n\nThis action cannot be undone.`,
        timestamp: new Date(),
        actionRequired: action,
      }]);
      setIsProcessing(false);
      return;
    }

    try {
      // Build context for the AI including visible events
      const contextInfo = {
        selectedEvent: calendarContext?.selectedEvent,
        currentDate: calendarContext?.currentDate,
        viewMode: calendarContext?.viewMode,
        todayEventCount: calendarContext?.todayEventCount,
        visibleEventsCount: calendarContext?.visibleEvents?.length || 0,
        visibleEventsSummary: calendarContext?.visibleEvents?.slice(0, 10).map(e => ({
          title: e.title,
          start: e.start_time,
          calendar: e.calendar_name,
        })),
      };

      const response = await fetch('/api/calendar/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          calendar_context: contextInfo,
          email_context: emailContext,
          conversation_history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      let assistantContent = '';
      let toolCalls: Array<{ name: string; result: string }> = [];
      let suggestedSlots: TimeSlot[] | undefined;

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response;
        toolCalls = data.toolCalls || [];
        
        // Check if response includes suggested time slots
        if (data.suggestedSlots) {
          suggestedSlots = data.suggestedSlots;
        }
      } else {
        assistantContent = getLocalResponse(text, calendarContext);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        toolCalls,
        suggestedSlots,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getLocalResponse(text, calendarContext),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getLocalResponse = (inputText: string, context?: CalendarContext): string => {
    const lower = inputText.toLowerCase();
    const events = context?.visibleEvents || [];

    // Pattern analysis queries
    if (lower.includes('busy') || lower.includes('busiest')) {
      if (events.length > 0) {
        const dayCount: Record<string, number> = {};
        events.forEach(e => {
          const day = new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'long' });
          dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const busiest = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
        return `📊 **Schedule Analysis**\n\nYour busiest day is **${busiest[0]}** with ${busiest[1]} events.\n\n${Object.entries(dayCount).map(([day, count]) => `• ${day}: ${count} events`).join('\n')}`;
      }
      return '📊 I need more events to analyze. Try viewing a week or month first.';
    }

    if (lower.includes('today') || lower.includes('agenda')) {
      const todayEvents = events.filter(e => 
        new Date(e.start_time).toDateString() === new Date().toDateString()
      );
      if (todayEvents.length > 0) {
        return `📅 **Today's Agenda** (${todayEvents.length} events)\n\n${todayEvents.slice(0, 5).map(e => 
          `• **${new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}** - ${e.title}`
        ).join('\n')}${todayEvents.length > 5 ? `\n\n...and ${todayEvents.length - 5} more` : ''}`;
      }
      return '📅 **Today\'s Agenda**\n\nNo events scheduled for today!';
    }

    if (lower.includes('free') || lower.includes('available')) {
      return '🕐 **Finding Available Time**\n\nI\'ll search for free slots. Specify a date like "tomorrow" or "Friday" for better results.';
    }

    if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('create') || lower.includes('book')) {
      return '✅ I can help you schedule that! Please provide:\n\n1. **Title** - What\'s the event about?\n2. **Date & Time** - When should it be?\n3. **Duration** - How long?\n\nExample: "Schedule a 30-minute meeting tomorrow at 2pm"';
    }

    if (lower.includes('reschedule') && context?.selectedEvent) {
      return `📅 **Reschedule "${context.selectedEvent.title}"**\n\nWhen would you like to move this event to?\n\nExamples:\n• "Move it to tomorrow at 3pm"\n• "Reschedule to next Monday"\n• "Find a free slot this week"`;
    }

    if (lower.includes('conflict')) {
      // Check for conflicts in visible events
      const conflicts: string[] = [];
      const sorted = [...events].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = new Date(sorted[i - 1].end_time).getTime();
        const currStart = new Date(sorted[i].start_time).getTime();
        if (currStart < prevEnd) {
          conflicts.push(`• "${sorted[i - 1].title}" overlaps with "${sorted[i].title}"`);
        }
      }
      if (conflicts.length > 0) {
        return `⚠️ **Conflicts Found**\n\n${conflicts.join('\n')}`;
      }
      return '✅ **No Conflicts**\n\nYour schedule looks clear!';
    }

    // Default response
    if (context?.selectedEvent) {
      return `I can help you with "${context.selectedEvent.title}". You can:\n\n• **Reschedule** - "Move this to tomorrow"\n• **Delete** - "Delete this event"\n• **Find conflicts** - "Does this conflict with anything?"\n\nWhat would you like to do?`;
    }

    return 'I\'m your Calendar AI assistant. I can:\n\n• **View agenda** - "What\'s on my calendar today?"\n• **Find time** - "When am I free tomorrow?"\n• **Schedule** - "Book a meeting at 2pm"\n• **Analyze patterns** - "What\'s my busiest day?"\n\nWhat would you like to do?';
  };

  const handleClearChat = () => {
    setPendingAction(null);
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help with your calendar?',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionAction = (action: string) => {
    if (action === 'Find buffer time') {
      handleSendMessage('Find free time between my meetings today');
    } else if (action === 'Show agenda') {
      handleSendMessage("What's on my calendar today?");
    }
  };

  return (
    <Box h="full" display="flex" flexDirection="column">
      {/* Compact Header */}
      <Box px={3} py={2} borderBottom="1px solid" borderColor={borderColor}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <SparklesIcon className="w-4 h-4" style={{ color: 'var(--chakra-colors-blue-500)' }} />
            <Text fontWeight="600" color={textColor} fontSize="xs">Calendar AI</Text>
            {calendarContext?.selectedEvent && (
              <Badge colorScheme="blue" fontSize="2xs" variant="subtle">
                {calendarContext.selectedEvent.title.slice(0, 20)}...
              </Badge>
            )}
            {emailContext?.subject && (
              <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                <Icon as={FiMail} mr={1} boxSize={2} />
                Email
              </Badge>
            )}
          </HStack>
          <HStack spacing={1}>
            {isListening && (
              <Badge colorScheme="red" fontSize="2xs" variant="solid">
                🎤 Listening...
              </Badge>
            )}
            <Tooltip label="Clear chat">
              <IconButton
                aria-label="Clear chat"
                icon={<Icon as={FiTrash2} boxSize={3} />}
                size="xs"
                variant="ghost"
                onClick={handleClearChat}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </Box>

      {/* Smart Suggestions */}
      <Collapse in={showSuggestions && smartSuggestions.length > 0}>
        <Box px={3} py={2} bg={bgSubtle} borderBottom="1px solid" borderColor={borderColor}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="2xs" fontWeight="600" color={textSecondary}>Smart Insights</Text>
            <IconButton
              aria-label="Hide suggestions"
              icon={<Icon as={FiX} boxSize={2} />}
              size="xs"
              variant="ghost"
              onClick={() => setShowSuggestions(false)}
            />
          </HStack>
          <VStack align="stretch" spacing={1}>
            {smartSuggestions.slice(0, 2).map((suggestion) => (
              <Alert
                key={suggestion.id}
                status={suggestion.type === 'warning' ? 'warning' : suggestion.type === 'tip' ? 'success' : 'info'}
                size="sm"
                borderRadius="md"
                py={1}
                px={2}
              >
                <AlertIcon boxSize={3} />
                <Box flex={1}>
                  <Text fontSize="2xs">{suggestion.message}</Text>
                </Box>
                {suggestion.action && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme={suggestion.type === 'warning' ? 'orange' : 'blue'}
                    onClick={() => handleSuggestionAction(suggestion.action!)}
                  >
                    {suggestion.action}
                  </Button>
                )}
              </Alert>
            ))}
          </VStack>
        </Box>
      </Collapse>

      {/* Messages - Larger chat area */}
      <Box flex={1} overflowY="auto" p={4} minH="300px">
        <VStack align="stretch" spacing={5}>
          <AnimatePresence>
            {messages.map((msg) => (
              <MotionBox
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="95%"
                w="full"
              >
                {/* Main Message Bubble */}
                <Box
                  position="relative"
                  p={4}
                  bg={msg.role === 'user' ? userMsgBg : assistantMsgBg}
                  color={msg.role === 'user' ? 'white' : textColor}
                  borderRadius="xl"
                  borderTopRightRadius={msg.role === 'user' ? 'sm' : 'xl'}
                  borderTopLeftRadius={msg.role === 'assistant' ? 'sm' : 'xl'}
                  boxShadow="sm"
                  _hover={{ '& .message-actions': { opacity: 1 } }}
                  sx={{
                    '& p': { mb: 2, _last: { mb: 0 } },
                    '& ul, & ol': { pl: 4, mb: 2 },
                    '& li': { mb: 1 },
                    '& strong': { fontWeight: 'bold' },
                  }}
                >
                  <Box fontSize="sm" lineHeight="1.7">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <Text mb={2}>{children}</Text>,
                        strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
                        ul: ({ children }) => <Box as="ul" pl={4} mb={2}>{children}</Box>,
                        ol: ({ children }) => <Box as="ol" pl={4} mb={2}>{children}</Box>,
                        li: ({ children }) => <Box as="li" mb={1}>{children}</Box>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </Box>

                  {/* Tool calls indicator */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <HStack mt={2} spacing={1} flexWrap="wrap">
                      {msg.toolCalls.map((tool, i) => (
                        <Badge key={i} colorScheme="purple" fontSize="2xs" variant="subtle">
                          <Icon as={FiZap} mr={1} boxSize={2} />
                          {tool.name.replace('calendar_', '')}
                        </Badge>
                      ))}
                    </HStack>
                  )}

                  {/* Action confirmation buttons */}
                  {msg.actionRequired && !msg.actionRequired.confirmed && (
                    <HStack mt={3} spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="red"
                        leftIcon={<Icon as={FiCheck} />}
                        onClick={() => {
                          if (pendingAction) executeAction(pendingAction);
                        }}
                        isLoading={isProcessing}
                      >
                        Yes, {msg.actionRequired.type === 'delete' ? 'Delete' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Icon as={FiX} />}
                        onClick={() => {
                          setPendingAction(null);
                          setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'assistant',
                            content: '👍 Action cancelled.',
                            timestamp: new Date(),
                          }]);
                        }}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  )}

                  {/* Suggested time slots (draggable) */}
                  {msg.suggestedSlots && msg.suggestedSlots.length > 0 && (
                    <Box mt={3}>
                      <Text fontSize="xs" fontWeight="600" mb={2}>📅 Available Slots:</Text>
                      <Wrap spacing={2}>
                        {msg.suggestedSlots.map((slot, i) => (
                          <WrapItem key={i}>
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="green"
                              leftIcon={<Icon as={FiMove} boxSize={3} />}
                              onClick={() => handleSlotSelect(slot)}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify(slot));
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              cursor="grab"
                              _active={{ cursor: 'grabbing' }}
                            >
                              {slot.formatted}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                      <Text fontSize="2xs" color={textSecondary} mt={1}>
                        💡 Click to select or drag to calendar
                      </Text>
                    </Box>
                  )}

                  {/* Copy button */}
                  {msg.role === 'assistant' && (
                    <HStack
                      className="message-actions"
                      position="absolute"
                      top={1}
                      right={1}
                      opacity={0}
                      transition="opacity 0.2s"
                    >
                      <Tooltip label="Copy">
                        <IconButton
                          aria-label="Copy"
                          icon={<Icon as={FiCopy} boxSize={3} />}
                          size="xs"
                          variant="ghost"
                          onClick={() => copyMessage(msg.content)}
                        />
                      </Tooltip>
                    </HStack>
                  )}
                </Box>

                {/* Timestamp */}
                <Text fontSize="2xs" color={textSecondary} mt={1} textAlign={msg.role === 'user' ? 'right' : 'left'}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </MotionBox>
            ))}
          </AnimatePresence>

          {isProcessing && (
            <HStack alignSelf="flex-start" p={3}>
              <Spinner size="sm" color={accentColor} />
              <Text fontSize="sm" color={textSecondary}>Thinking...</Text>
            </HStack>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Pending Action Banner */}
      {pendingAction && (
        <Box px={3} py={2} bg={warningBg} borderTop="1px solid" borderColor="orange.300">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FiAlertTriangle} color="orange.500" />
              <Text fontSize="xs" fontWeight="500">
                Waiting for confirmation: {pendingAction.type} "{pendingAction.eventTitle}"
              </Text>
            </HStack>
            <Button size="xs" variant="ghost" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
          </HStack>
        </Box>
      )}

      {/* Quick Actions */}
      <Box px={3} py={2} borderTop="1px solid" borderColor={borderColor}>
        <Wrap spacing={1} mb={2}>
          {QUICK_ACTIONS.map((action) => (
            <WrapItem key={action.label}>
              <Button
                size="xs"
                variant="outline"
                colorScheme="blue"
                leftIcon={<Icon as={action.icon} boxSize={3} />}
                onClick={() => handleSendMessage(action.prompt)}
                isDisabled={isProcessing}
              >
                {action.label}
              </Button>
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      {/* Chat Input */}
      <Box p={3} borderTop="1px solid" borderColor={borderColor}>
        <HStack>
          {/* Voice Input Button */}
          <Tooltip label={isListening ? 'Stop listening' : 'Voice input'}>
            <IconButton
              aria-label="Voice input"
              icon={<Icon as={isListening ? FiMicOff : FiMic} />}
              size="sm"
              variant={isListening ? 'solid' : 'ghost'}
              colorScheme={isListening ? 'red' : 'gray'}
              borderRadius="full"
              onClick={toggleVoiceInput}
              isDisabled={isProcessing}
            />
          </Tooltip>
          
          <Input
            size="sm"
            placeholder={isListening ? 'Listening...' : 'Ask about your calendar...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            isDisabled={isProcessing}
            borderRadius="full"
            bg={bgSubtle}
            borderColor={isListening ? 'red.300' : undefined}
          />
          
          <IconButton
            aria-label="Send"
            icon={<FiSend />}
            size="sm"
            colorScheme="blue"
            borderRadius="full"
            onClick={() => handleSendMessage()}
            isLoading={isProcessing}
            isDisabled={!input.trim() && !isListening}
          />
        </HStack>
        <Text fontSize="2xs" color={textSecondary} mt={2} textAlign="center">
          🎤 Voice or type: "Schedule lunch tomorrow" • "What's my busiest day?"
        </Text>
      </Box>
    </Box>
  );
}
