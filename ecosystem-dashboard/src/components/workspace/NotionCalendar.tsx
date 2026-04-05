/**
 * Notion-Style Calendar Component
 * Monthly calendar view with event support
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  GridItem,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color?: string;
}

interface NotionCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  title?: string;
}

export function NotionCalendar({
  events = [],
  onDateClick,
  onEventClick,
  title,
}: NotionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const borderColor = useSemanticToken('border.default');
  const todayBg = useSemanticToken('surface.highlight');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;

    // Empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <GridItem key={`empty-${i}`} minH="100px" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isCurrentDay = isToday(day);

      days.push(
        <GridItem
          key={day}
          minH="100px"
          p={2}
          border="1px solid"
          borderColor={borderColor}
          cursor="pointer"
          bg={isCurrentDay ? todayBg : 'white'}
          _hover={{ bg: hoverBg }}
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            onDateClick?.(dateStr);
          }}
        >
          <VStack align="stretch" spacing={1} h="100%">
            <Text
              fontSize="sm"
              fontWeight={isCurrentDay ? "700" : "400"}
              color={isCurrentDay ? "blue.600" : "gray.700"}
            >
              {day}
            </Text>
            {dayEvents.map((event) => (
              <Badge
                key={event.id}
                fontSize="xs"
                colorScheme={event.color || 'blue'}
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                noOfLines={1}
              >
                {event.title}
              </Badge>
            ))}
          </VStack>
        </GridItem>
      );
    }

    // Fill remaining cells
    const remainingCells = totalCells - (firstDayOfMonth + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
      days.push(
        <GridItem key={`empty-end-${i}`} minH="100px" bg={useSemanticToken('surface.base')} />
      );
    }

    return days;
  };

  return (
    <Box>
      {/* Calendar Header */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={4}>
          {title && (
            <Text fontSize="lg" fontWeight="600">
              {title}
            </Text>
          )}
          <Text fontSize="lg" fontWeight="600" color={useSemanticToken('text.primary')}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Text
            fontSize="sm"
            color="blue.500"
            cursor="pointer"
            fontWeight="500"
            onClick={goToToday}
            _hover={{ textDecoration: 'underline' }}
          >
            Today
          </Text>
          <IconButton
            icon={<FiChevronLeft />}
            size="sm"
            variant="ghost"
            aria-label="Previous month"
            onClick={goToPreviousMonth}
          />
          <IconButton
            icon={<FiChevronRight />}
            size="sm"
            variant="ghost"
            aria-label="Next month"
            onClick={goToNextMonth}
          />
        </HStack>
      </HStack>

      {/* Calendar Grid */}
      <Box>
        {/* Day Names */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {dayNames.map((dayName) => (
            <GridItem
              key={dayName}
              p={2}
              textAlign="center"
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={useSemanticToken('surface.base')}
            >
              <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.secondary')}>
                {dayName}
              </Text>
            </GridItem>
          ))}
        </Grid>

        {/* Calendar Days */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {renderCalendarDays()}
        </Grid>
      </Box>
    </Box>
  );
}
