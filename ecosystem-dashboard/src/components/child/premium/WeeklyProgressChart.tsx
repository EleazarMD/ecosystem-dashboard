import React from 'react';
import { Box, Text, HStack, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const grow = keyframes`
  0% { height: 0; }
  100% { height: var(--bar-height); }
`;

interface DayData {
  day: string;
  value: number;
  label?: string;
  isToday?: boolean;
}

interface WeeklyProgressChartProps {
  data: DayData[];
  color: string;
  unit?: string;
  maxValue?: number;
}

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  data,
  color,
  unit = 'min',
  maxValue,
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="bold" fontSize="sm" color="gray.700">
          📊 This Week
        </Text>
        <Text fontSize="xs" color="gray.500">
          {data.reduce((sum, d) => sum + d.value, 0)} {unit} total
        </Text>
      </HStack>
      <HStack spacing={2} align="end" h="100px" justify="space-between">
        {data.map((d, i) => {
          const heightPct = Math.max((d.value / max) * 100, 4);
          return (
            <VStack key={i} spacing={1} flex={1} cursor="pointer">
              <Text
                fontSize="2xs"
                fontWeight="bold"
                color={d.isToday ? color : 'gray.400'}
                opacity={d.value > 0 ? 1 : 0.3}
              >
                {d.value > 0 ? d.value : ''}
              </Text>
              <Box
                w="full"
                borderRadius="md"
                bg={d.isToday ? color : d.value > 0 ? `${color}60` : `${color}15`}
                position="relative"
                style={{
                  height: `${heightPct}%`,
                  ['--bar-height' as any]: `${heightPct}%`,
                }}
                animation={`${grow} 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms both`}
                transition="all 0.2s"
                _hover={{
                  bg: color,
                  transform: 'scaleY(1.05)',
                }}
                title={`${d.day}: ${d.value} ${unit}`}
              />
              <Text
                fontSize="2xs"
                color={d.isToday ? color : 'gray.400'}
                fontWeight={d.isToday ? 'bold' : 'normal'}
              >
                {d.day}
              </Text>
            </VStack>
          );
        })}
      </HStack>
    </Box>
  );
};

interface StreakCalendarProps {
  streakDays: number;
  color?: string;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  streakDays,
  color = '#f6ad55',
}) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString('en', { weekday: 'short' }).charAt(0),
      date: date.getDate(),
      isToday: i === 6,
      inStreak: i < streakDays && streakDays > 0,
    };
  });

  return (
    <HStack spacing={1.5} justify="center">
      {days.map((d, i) => (
        <VStack key={i} spacing={0.5}>
          <Box
            w="28px"
            h="28px"
            borderRadius="lg"
            bg={d.inStreak ? `${color}30` : 'gray.50'}
            border="2px solid"
            borderColor={d.isToday ? color : d.inStreak ? `${color}60` : 'gray.100'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            transition="all 0.2s"
          >
            <Text fontSize="xs" fontWeight="bold" color={d.inStreak ? color : 'gray.300'}>
              {d.inStreak ? '🔥' : d.day}
            </Text>
          </Box>
        </VStack>
      ))}
    </HStack>
  );
};
