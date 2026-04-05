/**
 * Reminders Page
 * 
 * Quick reminders and task management
 */

import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { Clock, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export default function Reminders() {
  const router = useRouter();
  const [newReminder, setNewReminder] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const bgPrimary = useSemanticToken('colors', 'bg.primary');
  const bgCard = useSemanticToken('colors', 'bg.card');
  const textPrimary = useSemanticToken('colors', 'text.primary');
  const textSecondary = useSemanticToken('colors', 'text.secondary');
  const accentColor = useSemanticToken('colors', 'accent.primary');

  useEffect(() => {
    const stored = localStorage.getItem('tesla_reminders');
    if (stored) {
      setReminders(JSON.parse(stored));
    }
  }, []);

  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem('tesla_reminders', JSON.stringify(updated));
  };

  const addReminder = () => {
    if (!newReminder.trim()) return;
    const reminder: Reminder = {
      id: Date.now().toString(),
      text: newReminder,
      completed: false,
      createdAt: new Date(),
    };
    saveReminders([reminder, ...reminders]);
    setNewReminder('');
  };

  const toggleReminder = (id: string) => {
    saveReminders(
      reminders.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r
      )
    );
  };

  const deleteReminder = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
  };

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
          <Text fontSize="2xl" fontWeight="bold">Reminders</Text>
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
            <IconButton
              aria-label="Add"
              icon={<Plus />}
              variant="ghost"
              onClick={addReminder}
            />
          </InputRightElement>
        </InputGroup>

        <VStack w="100%" spacing={2}>
          {reminders.length === 0 ? (
            <VStack spacing={4} pt={8} color={textSecondary}>
              <Clock size={48} />
              <Text>No reminders yet</Text>
              <Text fontSize="sm">Add a reminder to get started</Text>
            </VStack>
          ) : (
            reminders.map((reminder) => (
              <HStack
                key={reminder.id}
                w="100%"
                p={4}
                bg={bgCard}
                borderRadius="xl"
                justify="space-between"
              >
                <HStack flex={1}>
                  <Checkbox
                    isChecked={reminder.completed}
                    onChange={() => toggleReminder(reminder.id)}
                    colorScheme="blue"
                  />
                  <Text
                    color={reminder.completed ? textSecondary : textPrimary}
                    textDecoration={reminder.completed ? 'line-through' : 'none'}
                  >
                    {reminder.text}
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
            ))
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
