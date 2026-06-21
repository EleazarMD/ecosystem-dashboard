/**
 * Reminders Page
 *
 * Reads/writes exomind_jobs (job_type='reminder') via the Dashboard API.
 * No localStorage — server is the source of truth.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Checkbox,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { Clock, ArrowLeft, Plus, Trash2, Apple } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const USER_ID = 'eleazar';
const POLL_INTERVAL_MS = 30_000;

interface Reminder {
  id: string;
  title: string;
  status: string;
  reminder_at?: string | null;
  due_date?: string | null;
  created_at?: string;
}

function formatWhen(r: Reminder): string {
  const iso = r.reminder_at || r.due_date;
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < -1) {
      if (diffMin > -60) return `${Math.abs(diffMin)}m ago`;
      if (diffMin > -1440) return `${Math.round(Math.abs(diffMin) / 60)}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (diffMin < 60) return `in ${diffMin}m`;
    if (diffMin < 1440) return `in ${Math.round(diffMin / 60)}h`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function Reminders() {
  const router = useRouter();
  const [newReminder, setNewReminder] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bgPrimary = useSemanticToken('bg.primary');
  const bgCard = useSemanticToken('bg.card');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('accent.primary');

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/exomind/jobs?job_type=reminder&limit=100', {
        headers: { 'X-User-Id': USER_ID },
      });
      if (!res.ok) return;
      const data = await res.json();
      setReminders(
        (data.jobs || []).filter((j: Reminder) => j.status !== 'cancelled')
      );
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    pollRef.current = setInterval(fetchReminders, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchReminders]);

  const addReminder = async () => {
    const title = newReminder.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exomind/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
        body: JSON.stringify({
          title,
          job_type: 'reminder',
          notify_on_complete: true,
          notify_channel: 'push',
        }),
      });
      if (res.ok) {
        setNewReminder('');
        await fetchReminders();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'completed' ? 'pending' : 'completed';
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r))
    );
    await fetch(`/api/exomind/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
      body: JSON.stringify({ status: next }),
    });
  };

  const deleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/exomind/jobs/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': USER_ID },
    });
  };

  const pending = reminders.filter((r) => r.status !== 'completed');
  const completed = reminders.filter((r) => r.status === 'completed');

  return (
    <Box minH="100vh" bg={bgPrimary} p={6}>
      <VStack spacing={6} maxW="600px" mx="auto">
        <HStack w="100%" justify="space-between">
          <IconButton
            aria-label="Back"
            icon={<ArrowLeft />}
            variant="ghost"
            onClick={() => router.back()}
          />
          <VStack spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">Reminders</Text>
            <HStack spacing={1}>
              <Apple size={11} color="currentColor" />
              <Text fontSize="xs" color={textSecondary}>
                Syncs with Apple Reminders (Hyperspace list)
              </Text>
            </HStack>
          </VStack>
          <Box w="40px" />
        </HStack>

        <InputGroup size="lg">
          <Input
            placeholder="Add a reminder..."
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addReminder()}
            bg={bgCard}
            border="none"
            borderRadius="full"
            _focus={{ boxShadow: `0 0 0 2px ${accentColor}` }}
          />
          <InputRightElement>
            {saving ? (
              <Spinner size="sm" />
            ) : (
              <IconButton
                aria-label="Add"
                icon={<Plus />}
                variant="ghost"
                onClick={addReminder}
              />
            )}
          </InputRightElement>
        </InputGroup>

        {loading ? (
          <VStack spacing={4} pt={8}>
            <Spinner size="lg" />
            <Text color={textSecondary} fontSize="sm">Loading reminders…</Text>
          </VStack>
        ) : (
          <VStack w="100%" spacing={2}>
            {pending.length === 0 && completed.length === 0 ? (
              <VStack spacing={4} pt={8} color={textSecondary}>
                <Clock size={48} />
                <Text>No reminders yet</Text>
                <Text fontSize="sm">Add a reminder to get started</Text>
              </VStack>
            ) : (
              <>
                {pending.map((reminder) => (
                  <HStack
                    key={reminder.id}
                    w="100%"
                    p={4}
                    bg={bgCard}
                    borderRadius="xl"
                    justify="space-between"
                  >
                    <HStack flex={1} spacing={3}>
                      <Checkbox
                        isChecked={false}
                        onChange={() => toggleReminder(reminder.id, reminder.status)}
                        colorScheme="blue"
                      />
                      <VStack align="start" spacing={0}>
                        <Text color={textPrimary}>{reminder.title}</Text>
                        {(reminder.reminder_at || reminder.due_date) && (
                          <Text fontSize="xs" color={textSecondary}>
                            {formatWhen(reminder)}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                    <IconButton
                      aria-label="Delete"
                      icon={<Trash2 size={16} />}
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                    />
                  </HStack>
                ))}

                {completed.length > 0 && (
                  <>
                    <HStack w="100%" pt={2}>
                      <Text fontSize="xs" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="0.08em">
                        Completed
                      </Text>
                      <Badge colorScheme="gray" fontSize="xs">{completed.length}</Badge>
                    </HStack>
                    {completed.map((reminder) => (
                      <HStack
                        key={reminder.id}
                        w="100%"
                        p={4}
                        bg={bgCard}
                        borderRadius="xl"
                        justify="space-between"
                        opacity={0.6}
                      >
                        <HStack flex={1} spacing={3}>
                          <Checkbox
                            isChecked={true}
                            onChange={() => toggleReminder(reminder.id, reminder.status)}
                            colorScheme="blue"
                          />
                          <Text color={textSecondary} textDecoration="line-through">
                            {reminder.title}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="Delete"
                          icon={<Trash2 size={16} />}
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReminder(reminder.id)}
                        />
                      </HStack>
                    ))}
                  </>
                )}
              </>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
