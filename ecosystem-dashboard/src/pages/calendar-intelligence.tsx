/**
 * Calendar Intelligence Dashboard
 *
 * Full analytics dashboard — modeled after Email Intelligence Report:
 * - Executive summary + audio briefing
 * - Day-of-week appointment distribution (bar chart)
 * - Calendar breakdown by source
 * - Meeting duration buckets
 * - Location / venue intelligence
 * - Topic cloud extracted from event titles
 * - Intent distribution (clinical, virtual, family, admin, personal)
 * - Account breakdown (Exchange / iCloud / Local)
 * - Focus time vs meeting load
 * - Upcoming meeting prep queue
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  useToast,
  Badge,
  Progress,
  IconButton,
  Grid,
  GridItem,
  Divider,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  CalendarIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  SparklesIcon,
  UserGroupIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  SunIcon,
  VideoCameraIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  HeartIcon,
  BriefcaseIcon,
  TagIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { CalendarSidebar } from '@/components/calendar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

// ============================================================================
// TYPES
// ============================================================================
interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name: string;
  calendar_color: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_recurring: boolean;
  attendees: string[];
  account_type: string;
  account_name: string;
}

interface DailyBriefing {
  briefing_id?: string;
  headline: string;
  executive_summary: string;
  total_meetings: number;
  total_duration_minutes: number;
  focus_time_minutes: number;
  meeting_briefs: Array<{
    event_id: string;
    title: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees: string[];
    calendar_color?: string;
    duration_minutes?: number;
  }>;
  podcast_script?: string;
  generated_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================
const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDurationMinutes(event: CalendarEvent): number {
  try {
    const s = new Date(event.start_time);
    const e = new Date(event.end_time);
    return Math.round((e.getTime() - s.getTime()) / 60000);
  } catch { return 0; }
}

function getDayOfWeek(event: CalendarEvent): string {
  try {
    return new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long' });
  } catch { return 'Unknown'; }
}

function classifyIntent(event: CalendarEvent): string {
  const t = (event.title + ' ' + (event.description || '') + ' ' + (event.location || '')).toLowerCase();
  if (/schedule|clinic|patient|fam med|hospital|medical|appointment|belv|mt\.? belv/i.test(t)) return 'Clinical';
  if (/zoom|teams|meet|webinar|virtual|video|online/i.test(t)) return 'Virtual';
  if (/kid|son|daughter|sofia|school|groves|elementary|family|birthday|anniversary/i.test(t)) return 'Family';
  if (/1:1|one.on.one|standup|review|planning|sprint|retrospective|sync|debrief/i.test(t)) return 'Team Sync';
  if (/holiday|vacation|pto|off|birthday|celebration|party/i.test(t)) return 'Personal';
  if (/allergy|follow.?up|referral|lab|imaging|prescription/i.test(t)) return 'Healthcare';
  return 'General';
}

function extractTopicWords(events: CalendarEvent[]): Array<{ word: string; count: number; size: number }> {
  const STOP = new Set(['the','and','for','with','from','this','that','have','will','are','been','not','but','our','your','can','has','was','you','all','via','at','in','on','of','to','a','an','or','is','it','be','as','by','we','us','my','do','so','if','am','pm','am,','pm,']);
  const freq: Record<string, number> = {};
  events.forEach(e => {
    (e.title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const max = sorted[0]?.[1] || 1;
  return sorted.map(([word, count]) => ({
    word,
    count,
    size: Math.round(10 + (count / max) * 22),
  }));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return isoStr; }
}

const INTENT_COLORS: Record<string, string> = {
  Clinical: '#3B82F6',
  Virtual: '#8B5CF6',
  Family: '#10B981',
  'Team Sync': '#F59E0B',
  Personal: '#EC4899',
  Healthcare: '#EF4444',
  General: '#6B7280',
};

const CALENDAR_COLORS: Record<string, string> = {
  Calendar: '#CC73E1',
  Kids: '#10B981',
  'Found in Natural Language': '#F59E0B',
  'US Holidays': '#6B7280',
};

const ACCOUNT_COLORS: Record<string, string> = {
  exchange: '#0078D4',
  icloud: '#007AFF',
  local: '#6B7280',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionHeader({ icon, title, count, color = '#3B82F6' }: { icon: React.ReactNode; title: string; count?: number; color?: string }) {
  const textSecondary = useSemanticToken('text.secondary');
  return (
    <HStack spacing={2} mb={3}>
      <Box color={color}>{icon}</Box>
      <Text fontSize="13px" fontWeight="700" color="#e2e8f0" textTransform="uppercase" letterSpacing="0.5px">
        {title}
      </Text>
      {count !== undefined && (
        <Badge fontSize="9px" colorScheme="gray" borderRadius="full" ml={1}>{count}</Badge>
      )}
    </HStack>
  );
}

function StatCard({ label, value, color = 'blue.400', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  const border = useSemanticToken('border.default');
  return (
    <Box p={3} bg="rgba(255,255,255,0.04)" borderRadius="10px" border="1px solid" borderColor={border} textAlign="center" flex="1">
      <Text fontSize="22px" fontWeight="700" color={color} lineHeight="1">{value}</Text>
      <Text fontSize="9px" color="#94a3b8" textTransform="uppercase" letterSpacing="0.5px" mt={1}>{label}</Text>
      {sub && <Text fontSize="9px" color="#64748b" mt={0.5}>{sub}</Text>}
    </Box>
  );
}

function HBarChart({ data, colorMap, maxVal }: {
  data: Array<{ label: string; value: number; color?: string }>;
  colorMap?: Record<string, string>;
  maxVal?: number;
}) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  const border = useSemanticToken('border.default');
  return (
    <VStack spacing={2} align="stretch">
      {data.map(({ label, value, color }) => {
        const c = color || (colorMap?.[label]) || '#3B82F6';
        const pct = Math.round((value / max) * 100);
        return (
          <HStack key={label} spacing={2}>
            <Text fontSize="11px" color="#94a3b8" w="80px" flexShrink={0} noOfLines={1}>{label}</Text>
            <Box flex="1" h="16px" bg="rgba(255,255,255,0.05)" borderRadius="3px" overflow="hidden">
              <Box h="100%" w={`${pct}%`} bg={c} borderRadius="3px" transition="width 0.4s ease" />
            </Box>
            <Text fontSize="11px" color="#e2e8f0" w="24px" textAlign="right" flexShrink={0}>{value}</Text>
          </HStack>
        );
      })}
    </VStack>
  );
}

function VBarChart({ data, color = '#3B82F6' }: {
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <HStack spacing={1} align="end" h="80px" justify="space-between">
      {data.map(({ label, value }) => {
        const hPct = Math.max((value / max) * 72, value > 0 ? 6 : 0);
        return (
          <VStack key={label} spacing={1} align="center" flex="1">
            <Tooltip label={`${value} events`} fontSize="10px">
              <Box
                w="100%"
                maxW="32px"
                h={`${hPct}px`}
                bg={color}
                borderRadius="3px 3px 0 0"
                opacity={value > 0 ? 0.85 : 0.15}
                cursor="default"
                transition="height 0.3s ease"
                _hover={{ opacity: 1 }}
              />
            </Tooltip>
            <Text fontSize="9px" color="#64748b">{label}</Text>
          </VStack>
        );
      })}
    </HStack>
  );
}

function PieDonut({ slices, size = 80 }: { slices: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const r = 28; const cx = 40; const cy = 40; const stroke = 12;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      {slices.map((s, i) => {
        const pct = s.value / total;
        const dashArr = `${circumference * pct} ${circumference * (1 - pct)}`;
        const rotate = offset * 360 - 90;
        offset += pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={dashArr}
            transform={`rotate(${rotate} ${cx} ${cy})`}
            opacity={0.85}
          >
            <title>{s.label}: {s.value} ({Math.round(pct * 100)}%)</title>
          </circle>
        );
      })}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 1} fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function CalendarIntelligencePage() {
  const toast = useToast();
  const router = useRouter();
  const { setContext, setCustomData, setIsOpen, setActiveTab } = useRightPanel();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Theme
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const bgElevated = useSemanticToken('surface.raised');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const border = useSemanticToken('border.default');

  // Set right panel context
  useEffect(() => {
    setContext('calendar');
    setActiveTab('calendar-briefing');
    setIsOpen(true);
  }, [setContext, setIsOpen, setActiveTab]);

  // Fetch all calendar events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes-proxy?path=v1/calendar/events&limit=500');
      if (res.ok) {
        const data = await res.json();
        const evts = Array.isArray(data) ? data : (data.events || []);
        setEvents(evts);
      }
    } catch (e) { console.error('fetchEvents', e); }
  }, []);

  // Fetch calendar briefing
  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch(`/api/hermes-proxy?path=v1/calendar-intelligence/briefing&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        setCustomData({ type: 'calendar-briefing', briefing: data });
      }
    } catch (e) { console.error('fetchBriefing', e); }
  }, [selectedDate, setCustomData]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchBriefing()]);
      setLoading(false);
    })();
  }, [fetchEvents, fetchBriefing]);

  // ── Analytics computed from events ──────────────────────────────────────
  const analytics = useMemo(() => {
    if (!events.length) return null;

    // Day of week distribution
    const dowMap: Record<string, number> = {};
    DOW_ORDER.forEach(d => { dowMap[d] = 0; });
    events.forEach(e => { const d = getDayOfWeek(e); if (d in dowMap) dowMap[d]++; });
    const dowData = DOW_ORDER.map((d, i) => ({ label: DOW_SHORT[i], value: dowMap[d] }));

    // Calendar breakdown
    const calMap: Record<string, number> = {};
    events.forEach(e => { calMap[e.calendar_name || 'Unknown'] = (calMap[e.calendar_name || 'Unknown'] || 0) + 1; });
    const calData = Object.entries(calMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({
      label, value, color: CALENDAR_COLORS[label] || '#6B7280',
    }));

    // Account breakdown
    const acctMap: Record<string, number> = {};
    events.forEach(e => { const a = e.account_type || 'local'; acctMap[a] = (acctMap[a] || 0) + 1; });
    const acctData = Object.entries(acctMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1), value, color: ACCOUNT_COLORS[label] || '#6B7280',
    }));

    // Duration buckets
    const durBuckets: Record<string, number> = { '<30m': 0, '30-60m': 0, '1-2h': 0, '2-4h': 0, '>4h': 0 };
    let totalDurMins = 0;
    events.forEach(e => {
      const d = getDurationMinutes(e);
      totalDurMins += d;
      if (d < 30) durBuckets['<30m']++;
      else if (d < 60) durBuckets['30-60m']++;
      else if (d < 120) durBuckets['1-2h']++;
      else if (d < 240) durBuckets['2-4h']++;
      else durBuckets['>4h']++;
    });
    const avgDurMins = Math.round(totalDurMins / events.length);
    const durData = Object.entries(durBuckets).map(([label, value]) => ({ label, value }));

    // Location intelligence
    const locMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.location?.trim()) {
        const loc = e.location.trim().slice(0, 40);
        locMap[loc] = (locMap[loc] || 0) + 1;
      }
    });
    const locData = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
    const noLocationCount = events.filter(e => !e.location?.trim()).length;

    // Intent distribution
    const intentMap: Record<string, number> = {};
    events.forEach(e => {
      const intent = classifyIntent(e);
      intentMap[intent] = (intentMap[intent] || 0) + 1;
    });
    const intentData = Object.entries(intentMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({
      label, value, color: INTENT_COLORS[label] || '#6B7280',
    }));
    const intentSlices = intentData.map(d => ({ label: d.label, value: d.value, color: d.color }));

    // Topic cloud
    const topics = extractTopicWords(events);

    // Recurring vs single
    const recurringCount = events.filter(e => e.is_recurring).length;

    // busiest day
    const busiestDow = DOW_ORDER.reduce((best, d) => dowMap[d] > dowMap[best] ? d : best, DOW_ORDER[0]);

    return {
      total: events.length,
      avgDurMins,
      totalDurMins,
      dowData,
      calData,
      acctData,
      durData,
      locData,
      noLocationCount,
      intentData,
      intentSlices,
      topics,
      recurringCount,
      busiestDow,
    };
  }, [events]);

  // ── Audio playback ───────────────────────────────────────────────────────
  const handlePlayPause = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setAudioProgress(0);
      return;
    }
    const text = briefing?.podcast_script || briefing?.executive_summary;
    if (!text) { toast({ title: 'No briefing script available', status: 'info', duration: 2000 }); return; }
    setGeneratingAudio(true);
    try {
      const res = await fetch('/api/ai-gateway/qwen-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode: 'synthesize', language: 'English', temperature: 0.4, top_p: 0.85 }),
      });
      if (!res.ok) {
        let reason = 'TTS service unavailable';
        try { const e = await res.json(); reason = e?.error || reason; } catch {}
        throw new Error(reason);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.ontimeupdate = () => { if (audio.duration > 0) setAudioProgress((audio.currentTime / audio.duration) * 100); };
      audio.onended = () => { setIsPlaying(false); setAudioProgress(0); };
      await audio.play();
      setIsPlaying(true);
      toast({ title: 'Playing calendar briefing', status: 'success', duration: 2000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Audio Unavailable', description: msg, status: 'warning', duration: 4000 });
    } finally {
      setGeneratingAudio(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <Flex h="calc(100vh - 70px)" justify="center" align="center" bg={bgPrimary}>
          <VStack spacing={3}>
            <Spinner size="lg" color="blue.500" />
            <Text fontSize="13px" color={textSecondary}>Loading calendar intelligence...</Text>
          </VStack>
        </Flex>
      </DashboardLayout>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px)" bg={bgPrimary} overflow="hidden">
        <CalendarSidebar activeView="intelligence" />

        <Box flex="1" h="100%" overflowY="auto">
          {/* ── HEADER ── */}
          <Box px={6} py={3} borderBottom="1px solid" borderColor={border} bg={bgSecondary}>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <SparklesIcon style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                <Box>
                  <Text fontSize="16px" fontWeight="700" color={textPrimary}>Calendar Intelligence Report</Text>
                  <Text fontSize="11px" color={textSecondary}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {analytics ? ` · ${analytics.total} events analysed` : ''}
                  </Text>
                </Box>
              </HStack>
              <HStack spacing={2}>
                <Button size="xs" variant="outline" leftIcon={<ArrowPathIcon style={{ width: '12px', height: '12px' }} />}
                  onClick={() => { fetchEvents(); fetchBriefing(); }}>
                  Refresh
                </Button>
                <Button size="xs" colorScheme="blue" onClick={() => router.push('/calendar')}>
                  ← Calendar
                </Button>
              </HStack>
            </Flex>
          </Box>

          <Box p={5}>
            {/* ── ROW 1: EXECUTIVE SUMMARY + DAILY STATS ── */}
            <Grid templateColumns={{ base: '1fr', xl: '3fr 1fr' }} gap={4} mb={4}>
              {/* Executive Summary */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <HStack spacing={2} mb={2}>
                  <CalendarIcon style={{ width: '16px', height: '16px', color: '#3B82F6' }} />
                  <Text fontSize="12px" fontWeight="700" color="#64748b" textTransform="uppercase" letterSpacing="0.5px">Executive Summary</Text>
                  {briefing?.generated_at && (
                    <Text fontSize="10px" color="#475569" ml="auto">
                      {new Date(briefing.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  )}
                </HStack>
                <Text fontSize="15px" fontWeight="700" color={textPrimary} mb={2} lineHeight="1.3">
                  {briefing?.headline || (analytics ? `${analytics.busiestDow} is your busiest day — ${analytics.total} events in view` : 'Calendar Intelligence ready')}
                </Text>
                <Text fontSize="12px" color={textSecondary} lineHeight="1.7" mb={3}>
                  {briefing?.executive_summary || (analytics
                    ? `You have ${analytics.total} calendar events across ${Object.keys(analytics.calData.reduce((m: any, d) => { m[d.label] = 1; return m; }, {})).length} calendars. Average meeting duration is ${formatDuration(analytics.avgDurMins)}. ${analytics.intentData[0]?.label || 'Clinical'} events dominate your schedule (${analytics.intentData[0]?.value || 0} events). ${analytics.busiestDow} is your busiest day.`
                    : 'Loading...')}
                </Text>
                {/* Audio player */}
                <Box p={3} bg={bgElevated} borderRadius="8px" border="1px solid" borderColor={border}>
                  <HStack spacing={3}>
                    <IconButton
                      aria-label={isPlaying ? 'Pause' : 'Play briefing'}
                      icon={generatingAudio ? <Spinner size="sm" /> : isPlaying ? <PauseIcon style={{ width: '18px', height: '18px' }} /> : <PlayIcon style={{ width: '18px', height: '18px' }} />}
                      onClick={handlePlayPause}
                      isDisabled={generatingAudio}
                      colorScheme="blue"
                      borderRadius="full"
                      size="sm"
                    />
                    <Box flex="1">
                      <Text fontSize="11px" color={textSecondary} mb={1}>
                        {generatingAudio ? 'Generating audio briefing...' : isPlaying ? 'Playing…' : 'Play daily calendar briefing'}
                      </Text>
                      <Box h="4px" bg="rgba(255,255,255,0.08)" borderRadius="full">
                        <Box h="100%" w={`${audioProgress}%`} bg="blue.400" borderRadius="full" transition="width 0.2s" />
                      </Box>
                    </Box>
                  </HStack>
                </Box>
              </Box>

              {/* Today's quick stats */}
              <VStack spacing={2} align="stretch">
                <StatCard label="Meetings Today" value={briefing?.total_meetings ?? 0} color="blue.400" />
                <StatCard label="Meeting Time" value={briefing ? formatDuration(briefing.total_duration_minutes) : '—'} color="purple.400" />
                <StatCard label="Focus Time" value={briefing ? formatDuration(briefing.focus_time_minutes) : '—'} color="green.400" />
                <StatCard label="Avg Duration" value={analytics ? formatDuration(analytics.avgDurMins) : '—'} color="orange.300" sub="all events" />
              </VStack>
            </Grid>

            {/* ── ROW 2: DAY OF WEEK DISTRIBUTION + INTENT ── */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '2fr 1fr 1fr' }} gap={4} mb={4}>
              {/* Day-of-week bar chart */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<ChartBarIcon style={{ width: '15px', height: '15px' }} />}
                  title="Appointment Distribution"
                  count={analytics?.total}
                />
                {analytics ? (
                  <>
                    <VBarChart data={analytics.dowData} color="#3B82F6" />
                    <HStack mt={2} justify="space-between">
                      <Text fontSize="10px" color="#475569">Busiest: <Text as="span" fontWeight="600" color="#93c5fd">{analytics.busiestDow}</Text></Text>
                      <Text fontSize="10px" color="#475569">Weekdays only</Text>
                    </HStack>
                  </>
                ) : <Spinner size="sm" />}
              </Box>

              {/* Intent distribution donut */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<TagIcon style={{ width: '15px', height: '15px' }} />}
                  title="Intent Distribution"
                  color="#8B5CF6"
                />
                {analytics ? (
                  <HStack spacing={3} align="start">
                    <PieDonut slices={analytics.intentSlices} size={88} />
                    <VStack spacing={1} align="stretch" flex="1">
                      {analytics.intentData.slice(0, 6).map(d => (
                        <HStack key={d.label} spacing={1}>
                          <Box w="8px" h="8px" borderRadius="full" bg={d.color} flexShrink={0} />
                          <Text fontSize="10px" color={textSecondary} flex="1" noOfLines={1}>{d.label}</Text>
                          <Text fontSize="10px" color="#e2e8f0" fontWeight="600">{d.value}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </HStack>
                ) : <Spinner size="sm" />}
              </Box>

              {/* Calendar breakdown donut */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<CalendarIcon style={{ width: '15px', height: '15px' }} />}
                  title="By Calendar"
                  color="#CC73E1"
                />
                {analytics ? (
                  <HStack spacing={3} align="start">
                    <PieDonut slices={analytics.calData.map(d => ({ label: d.label, value: d.value, color: d.color }))} size={88} />
                    <VStack spacing={1} align="stretch" flex="1">
                      {analytics.calData.slice(0, 5).map(d => (
                        <HStack key={d.label} spacing={1}>
                          <Box w="8px" h="8px" borderRadius="full" bg={d.color} flexShrink={0} />
                          <Text fontSize="10px" color={textSecondary} flex="1" noOfLines={1}>{d.label}</Text>
                          <Text fontSize="10px" color="#e2e8f0" fontWeight="600">{d.value}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </HStack>
                ) : <Spinner size="sm" />}
              </Box>
            </Grid>

            {/* ── ROW 3: TOPIC CLOUD + DURATION + LOCATION ── */}
            <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr 1fr' }} gap={4} mb={4}>
              {/* Topic cloud */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border} minH="160px">
                <SectionHeader
                  icon={<SparklesIcon style={{ width: '15px', height: '15px' }} />}
                  title="Topic Cloud"
                  color="#F59E0B"
                />
                {analytics?.topics.length ? (
                  <Wrap spacing={2}>
                    {analytics.topics.map(({ word, count, size }) => {
                      const intensity = Math.min(count / (analytics.topics[0]?.count || 1), 1);
                      const hue = 210 + Math.round(intensity * 60);
                      return (
                        <WrapItem key={word}>
                          <Text
                            fontSize={`${size}px`}
                            fontWeight={size > 22 ? '700' : size > 16 ? '600' : '400'}
                            color={`hsl(${hue}, 70%, ${55 + Math.round(intensity * 20)}%)`}
                            cursor="default"
                            lineHeight="1.3"
                            _hover={{ opacity: 0.8 }}
                          >
                            {word}
                          </Text>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                ) : <Text fontSize="12px" color={textSecondary}>No topics extracted</Text>}
              </Box>

              {/* Duration buckets */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<ClockIcon style={{ width: '15px', height: '15px' }} />}
                  title="Duration Buckets"
                  color="#10B981"
                />
                {analytics ? (
                  <>
                    <HBarChart
                      data={analytics.durData.map(d => ({ ...d, color: '#10B981' }))}
                      maxVal={analytics.total}
                    />
                    <Divider my={2} borderColor="rgba(255,255,255,0.06)" />
                    <HStack justify="space-between">
                      <Text fontSize="10px" color="#475569">Average</Text>
                      <Text fontSize="10px" color="#34d399" fontWeight="600">{formatDuration(analytics.avgDurMins)}</Text>
                    </HStack>
                  </>
                ) : <Spinner size="sm" />}
              </Box>

              {/* Location intelligence */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<MapPinIcon style={{ width: '15px', height: '15px' }} />}
                  title="Venue Intelligence"
                  color="#EC4899"
                />
                {analytics ? (
                  <>
                    <HBarChart
                      data={analytics.locData.map(d => ({ ...d, color: '#EC4899' }))}
                      maxVal={analytics.total}
                    />
                    {analytics.noLocationCount > 0 && (
                      <HStack mt={2} justify="space-between">
                        <Text fontSize="10px" color="#475569">No location</Text>
                        <Text fontSize="10px" color="#94a3b8">{analytics.noLocationCount}</Text>
                      </HStack>
                    )}
                  </>
                ) : <Spinner size="sm" />}
              </Box>
            </Grid>

            {/* ── ROW 4: ACCOUNT BREAKDOWN + MEETING LOAD + TODAY'S MEETINGS ── */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 2fr' }} gap={4} mb={4}>
              {/* Account breakdown */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<GlobeAltIcon style={{ width: '15px', height: '15px' }} />}
                  title="Account Breakdown"
                  color="#0078D4"
                />
                {analytics ? (
                  <VStack spacing={3} align="stretch">
                    {analytics.acctData.map(d => (
                      <Box key={d.label}>
                        <HStack justify="space-between" mb={1}>
                          <HStack spacing={2}>
                            <Box w="10px" h="10px" borderRadius="full" bg={d.color} />
                            <Text fontSize="12px" color={textPrimary}>{d.label}</Text>
                          </HStack>
                          <Text fontSize="12px" color={textSecondary}>{d.value} ({Math.round(d.value / analytics.total * 100)}%)</Text>
                        </HStack>
                        <Progress value={Math.round(d.value / analytics.total * 100)} size="xs" colorScheme={d.label === 'Exchange' ? 'blue' : d.label === 'Icloud' ? 'cyan' : 'gray'} borderRadius="full" />
                      </Box>
                    ))}
                  </VStack>
                ) : <Spinner size="sm" />}
              </Box>

              {/* Meeting load gauge */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<BoltIcon style={{ width: '15px', height: '15px' }} />}
                  title="Meeting Load"
                  color="#F59E0B"
                />
                {analytics && briefing ? (
                  <VStack spacing={3}>
                    <HStack spacing={4} justify="center">
                      <CircularProgress
                        value={briefing.total_duration_minutes > 0
                          ? Math.round(briefing.total_duration_minutes / (briefing.total_duration_minutes + briefing.focus_time_minutes) * 100)
                          : 0}
                        color={briefing.total_duration_minutes > 300 ? 'red.400' : briefing.total_duration_minutes > 180 ? 'orange.400' : 'green.400'}
                        size="90px"
                        thickness="8px"
                        trackColor="rgba(255,255,255,0.06)"
                      >
                        <CircularProgressLabel fontSize="14px" fontWeight="700" color="#e2e8f0">
                          {briefing.total_duration_minutes > 0
                            ? Math.round(briefing.total_duration_minutes / (briefing.total_duration_minutes + briefing.focus_time_minutes) * 100)
                            : 0}%
                        </CircularProgressLabel>
                      </CircularProgress>
                      <VStack spacing={1} align="start">
                        <HStack spacing={1}>
                          <Box w="8px" h="8px" borderRadius="full" bg="blue.400" />
                          <Text fontSize="10px" color={textSecondary}>Meetings</Text>
                        </HStack>
                        <Text fontSize="13px" fontWeight="600" color="#93c5fd">{formatDuration(briefing.total_duration_minutes)}</Text>
                        <HStack spacing={1}>
                          <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
                          <Text fontSize="10px" color={textSecondary}>Focus</Text>
                        </HStack>
                        <Text fontSize="13px" fontWeight="600" color="#86efac">{formatDuration(briefing.focus_time_minutes)}</Text>
                      </VStack>
                    </HStack>
                    <HStack spacing={1} w="100%">
                      <Box flex={briefing.total_duration_minutes} h="6px" bg="blue.400" borderRadius="3px 0 0 3px" />
                      <Box flex={briefing.focus_time_minutes} h="6px" bg="green.400" borderRadius="0 3px 3px 0" />
                    </HStack>
                    <Text fontSize="10px" color="#475569" textAlign="center">
                      {briefing.total_duration_minutes > 300
                        ? '⚠️ Heavy meeting load today'
                        : briefing.total_duration_minutes > 0
                        ? '✅ Balanced schedule today'
                        : '🟢 Clear calendar today'}
                    </Text>
                  </VStack>
                ) : <Spinner size="sm" />}
              </Box>

              {/* Today's meetings */}
              <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
                <SectionHeader
                  icon={<ClockIcon style={{ width: '15px', height: '15px' }} />}
                  title="Today's Schedule"
                  count={briefing?.meeting_briefs?.length}
                  color="#8B5CF6"
                />
                {briefing?.meeting_briefs?.length ? (
                  <VStack spacing={2} align="stretch" maxH="220px" overflowY="auto">
                    {briefing.meeting_briefs.map((m, i) => (
                      <HStack
                        key={m.event_id || i}
                        p={2}
                        bg={bgElevated}
                        borderRadius="7px"
                        borderLeft="3px solid"
                        borderLeftColor={m.calendar_color || '#3B82F6'}
                        cursor="pointer"
                        _hover={{ bg: 'rgba(255,255,255,0.06)' }}
                        onClick={() => router.push(`/calendar?event=${m.event_id}`)}
                        spacing={2}
                      >
                        <VStack spacing={0} align="start" flex="1">
                          <Text fontSize="12px" fontWeight="600" color={textPrimary} noOfLines={1}>{m.title}</Text>
                          <HStack spacing={2}>
                            <Text fontSize="10px" color={textSecondary}>{formatTime(m.start_time)} – {formatTime(m.end_time)}</Text>
                            {m.location && (
                              <HStack spacing={1}>
                                <MapPinIcon style={{ width: '10px', height: '10px', color: '#64748b' }} />
                                <Text fontSize="10px" color="#475569" noOfLines={1} maxW="120px">{m.location}</Text>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                        {m.duration_minutes && (
                          <Badge fontSize="9px" colorScheme="gray" flexShrink={0}>{formatDuration(m.duration_minutes)}</Badge>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                ) : (
                  <Box textAlign="center" py={4}>
                    <SunIcon style={{ width: '28px', height: '28px', color: '#10B981', margin: '0 auto 6px' }} />
                    <Text fontSize="12px" color={textSecondary}>No meetings today</Text>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* ── ROW 5: ALL EVENTS TABLE (condensed) ── */}
            <Box p={4} bg={bgSecondary} borderRadius="12px" border="1px solid" borderColor={border}>
              <SectionHeader
                icon={<BriefcaseIcon style={{ width: '15px', height: '15px' }} />}
                title="All Calendar Events"
                count={events.length}
                color="#6B7280"
              />
              <Box overflowX="auto">
                <Box as="table" w="100%" fontSize="11px">
                  <Box as="thead">
                    <Box as="tr" borderBottom="1px solid" borderColor={border}>
                      {['Event', 'Calendar', 'Account', 'Date', 'Duration', 'Intent', 'Location'].map(col => (
                        <Box key={col} as="th" textAlign="left" p="4px 8px" color="#475569" fontWeight="600" textTransform="uppercase" fontSize="9px" letterSpacing="0.5px">
                          {col}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {events.slice(0, 50).map((ev, i) => {
                      const intent = classifyIntent(ev);
                      const dur = getDurationMinutes(ev);
                      return (
                        <Box
                          key={ev.id}
                          as="tr"
                          borderBottom="1px solid"
                          borderColor="rgba(255,255,255,0.03)"
                          _hover={{ bg: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                          onClick={() => router.push(`/calendar?event=${ev.id}`)}
                        >
                          <Box as="td" p="5px 8px">
                            <HStack spacing={2}>
                              <Box w="3px" h="16px" borderRadius="full" bg={ev.calendar_color || '#3B82F6'} flexShrink={0} />
                              <Text color="#e2e8f0" noOfLines={1} maxW="220px">{ev.title}</Text>
                            </HStack>
                          </Box>
                          <Box as="td" p="5px 8px" color="#94a3b8">{ev.calendar_name || '—'}</Box>
                          <Box as="td" p="5px 8px">
                            <Badge fontSize="8px" colorScheme={ev.account_type === 'exchange' ? 'blue' : ev.account_type === 'icloud' ? 'cyan' : 'gray'} variant="subtle">
                              {ev.account_type || 'local'}
                            </Badge>
                          </Box>
                          <Box as="td" p="5px 8px" color="#94a3b8" whiteSpace="nowrap">
                            {new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Box>
                          <Box as="td" p="5px 8px" color="#94a3b8">{dur > 0 ? formatDuration(dur) : '—'}</Box>
                          <Box as="td" p="5px 8px">
                            <Badge fontSize="8px" bg={INTENT_COLORS[intent]} color="white" borderRadius="full" px={1.5}>{intent}</Badge>
                          </Box>
                          <Box as="td" p="5px 8px" color="#64748b" maxW="160px">
                            <Text noOfLines={1}>{ev.location || '—'}</Text>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
                {events.length > 50 && (
                  <Text fontSize="10px" color="#475569" textAlign="center" mt={2}>
                    Showing 50 of {events.length} events
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Flex>
    </DashboardLayout>
  );
}
