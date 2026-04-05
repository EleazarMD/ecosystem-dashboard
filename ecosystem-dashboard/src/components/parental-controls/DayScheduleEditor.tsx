/**
 * Day Schedule Editor Component
 * 
 * Allows parents to set individualized schedules by day for usage hours
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Divider,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiClock } from 'react-icons/fi';

export interface DaySchedule {
  start: string;  // "HH:MM" format
  end: string;    // "HH:MM" format
  minutes: number; // Daily usage limit for this day
}

interface DayScheduleEditorProps {
  allowedHoursByDay: Record<string, DaySchedule>;
  defaultStart: string;
  defaultEnd: string;
  defaultMinutes: number;
  onChange: (schedule: Record<string, DaySchedule>) => void;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

export function DayScheduleEditor({
  allowedHoursByDay,
  defaultStart,
  defaultEnd,
  defaultMinutes,
  onChange,
}: DayScheduleEditorProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const addDaySchedule = (dayId: string) => {
    onChange({
      ...allowedHoursByDay,
      [dayId]: {
        start: defaultStart,
        end: defaultEnd,
        minutes: defaultMinutes,
      },
    });
  };

  const removeDaySchedule = (dayId: string) => {
    const newSchedule = { ...allowedHoursByDay };
    delete newSchedule[dayId];
    onChange(newSchedule);
  };

  const updateDaySchedule = (dayId: string, field: keyof DaySchedule, value: string | number) => {
    onChange({
      ...allowedHoursByDay,
      [dayId]: {
        ...allowedHoursByDay[dayId],
        [field]: value,
      },
    });
  };

  return (
    <VStack align="stretch" spacing={4}>
      <HStack>
        <FiClock />
        <Text fontWeight="bold">Custom Schedule by Day</Text>
        <Badge colorScheme="blue">{Object.keys(allowedHoursByDay).length} custom</Badge>
      </HStack>
      
      <Text fontSize="sm" color="gray.600">
        Set different hours and time limits for specific days. Days without custom schedules use the default settings above.
      </Text>

      <Divider />

      {/* Existing custom schedules */}
      {Object.keys(allowedHoursByDay).length > 0 && (
        <VStack align="stretch" spacing={3}>
          {DAYS_OF_WEEK.filter(day => allowedHoursByDay[day.id]).map((day) => {
            const schedule = allowedHoursByDay[day.id];
            return (
              <Box
                key={day.id}
                p={3}
                bg={bgColor}
                borderRadius="md"
                border="1px"
                borderColor={borderColor}
              >
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontWeight="medium">{day.label}</Text>
                    <IconButton
                      icon={<FiTrash2 />}
                      aria-label="Remove custom schedule"
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeDaySchedule(day.id)}
                    />
                  </HStack>
                  
                  <HStack spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs">Start Time</FormLabel>
                      <Input
                        type="time"
                        size="sm"
                        value={schedule.start}
                        onChange={(e) => updateDaySchedule(day.id, 'start', e.target.value)}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel fontSize="xs">End Time</FormLabel>
                      <Input
                        type="time"
                        size="sm"
                        value={schedule.end}
                        onChange={(e) => updateDaySchedule(day.id, 'end', e.target.value)}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel fontSize="xs">Time Limit (min)</FormLabel>
                      <Input
                        type="number"
                        size="sm"
                        value={schedule.minutes}
                        onChange={(e) => updateDaySchedule(day.id, 'minutes', parseInt(e.target.value) || 0)}
                        min={0}
                        max={1440}
                      />
                    </FormControl>
                  </HStack>
                </VStack>
              </Box>
            );
          })}
        </VStack>
      )}

      {/* Add new day schedule */}
      {Object.keys(allowedHoursByDay).length < 7 && (
        <>
          <Divider />
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Add Custom Schedule for:</Text>
            <HStack spacing={2} wrap="wrap">
              {DAYS_OF_WEEK.filter(day => !allowedHoursByDay[day.id]).map((day) => (
                <Button
                  key={day.id}
                  size="sm"
                  leftIcon={<FiPlus />}
                  variant="outline"
                  onClick={() => addDaySchedule(day.id)}
                >
                  {day.short}
                </Button>
              ))}
            </HStack>
          </Box>
        </>
      )}
    </VStack>
  );
}
