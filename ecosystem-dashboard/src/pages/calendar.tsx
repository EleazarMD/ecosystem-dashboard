/**
 * Calendar Page
 * AI Homelab Calendar System - Main dashboard page with shared sidebar
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Heading,
  Icon,
} from '@chakra-ui/react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { UnifiedCalendarView, CalendarSidebar } from '@/components/calendar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function CalendarPage() {
  const { setContext, setIsOpen, setCustomData, setActiveTab } = useRightPanel();

  // Theme tokens
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const border = useSemanticToken('border.default');

  // State for calendar filtering
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());

  // Fetch calendar briefing from Hermes Core and push into right panel
  const fetchCalendarBriefing = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api/hermes-proxy?path=v1/calendar-intelligence/briefing&date=${today}`
      );
      if (response.ok) {
        const briefing = await response.json();
        setCustomData({ type: 'calendar-briefing', briefing });
      }
    } catch (error) {
      console.error('Failed to fetch calendar briefing:', error);
    }
  }, [setCustomData]);

  // Set context, open panel, and load briefing when page loads
  useEffect(() => {
    setContext('calendar');
    setActiveTab('calendar-briefing');
    setIsOpen(true);
    fetchCalendarBriefing();
  }, [setContext, setIsOpen, setActiveTab, fetchCalendarBriefing]);

  // Handle calendar toggle from sidebar
  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendarIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px)" bg={bgPrimary} overflow="hidden">
        {/* Shared Calendar Sidebar */}
        <CalendarSidebar
          activeView="calendar"
          selectedCalendarIds={selectedCalendarIds}
          onCalendarToggle={handleCalendarToggle}
          onSelectAll={() => {}}
        />

        {/* Main Content Area */}
        <Box flex="1" h="100%" overflowY="auto" p={4}>
          {/* Header */}
          <HStack mb={4}>
            <Icon as={() => <CalendarIcon style={{ width: '24px', height: '24px', color: '#3B82F6' }} />} />
            <Box>
              <Heading size="md" color={textPrimary}>Calendar</Heading>
              <Text color={textSecondary} fontSize="sm">
                Unified calendar with Apple sync, email intelligence, and AI scheduling
              </Text>
            </Box>
          </HStack>

          {/* Calendar View */}
          <Box
            bg={bgSecondary}
            borderRadius="lg"
            border="1px solid"
            borderColor={border}
            p={4}
            h="calc(100% - 80px)"
          >
            <UnifiedCalendarView selectedCalendarIds={selectedCalendarIds} />
          </Box>
        </Box>
      </Flex>
    </DashboardLayout>
  );
}
