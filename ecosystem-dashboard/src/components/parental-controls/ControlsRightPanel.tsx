/**
 * Parental Controls Right Panel Component
 * 
 * Displays day-specific scheduling in the right panel
 */

import React from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Divider,
} from '@chakra-ui/react';
import { DayScheduleEditor, DaySchedule } from './DayScheduleEditor';

interface ControlsRightPanelProps {
  controls: {
    allowedHoursStart: string;
    allowedHoursEnd: string;
    dailyUsageLimitMinutes: number;
    allowedHoursByDay?: Record<string, DaySchedule>;
  };
  onScheduleChange: (schedule: Record<string, DaySchedule>) => void;
}

export function ControlsRightPanel({ controls, onScheduleChange }: ControlsRightPanelProps) {
  return (
    <VStack align="stretch" spacing={4} p={4}>
      <Box>
        <Heading size="sm" mb={2}>Day-Specific Scheduling</Heading>
        <Text fontSize="sm" color="gray.600">
          Customize usage hours and time limits for individual days of the week.
        </Text>
      </Box>

      <Divider />

      <DayScheduleEditor
        allowedHoursByDay={controls.allowedHoursByDay || {}}
        defaultStart={controls.allowedHoursStart}
        defaultEnd={controls.allowedHoursEnd}
        defaultMinutes={controls.dailyUsageLimitMinutes}
        onChange={onScheduleChange}
      />
    </VStack>
  );
}
