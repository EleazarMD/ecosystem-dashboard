/**
 * Research Parameters Summary Card
 * Displays user's clarification answers as a beautiful summary card
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
} from '@chakra-ui/react';
import {
  AcademicCapIcon,
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface ResearchParameter {
  icon: React.ElementType;
  label: string;
  value: string;
}

interface ResearchParametersSummaryCardProps {
  answersText: string;
}

export const ResearchParametersSummaryCard: React.FC<ResearchParametersSummaryCardProps> = ({
  answersText,
}) => {
  // Glassmorphic black on white design
  const cardBg = useSemanticToken('glass.background');
  const cardBorder = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const iconColor = useSemanticToken('text.secondary');
  const paramBg = useSemanticToken('surface.elevated');
  const paramBorder = useSemanticToken('border.subtle');
  const badgeBg = useSemanticToken('interactive.surface');
  const badgeColor = useSemanticToken('surface.elevated');

  // Parse answers into structured parameters
  const parseAnswers = (text: string): ResearchParameter[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const params: ResearchParameter[] = [];

    lines.forEach((line, idx) => {
      // Remove number prefix (e.g., "1. " or "2. ")
      const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
      
      if (!cleanLine) return;

      // Determine icon and label based on content or position
      let icon = AcademicCapIcon;
      let label = '';

      if (idx === 0 || cleanLine.toLowerCase().includes('research') || cleanLine.toLowerCase().includes('academic') || cleanLine.toLowerCase().includes('professional')) {
        icon = AcademicCapIcon;
        label = 'Research Focus';
      } else if (cleanLine.toLowerCase().includes('year') || cleanLine.toLowerCase().includes('month') || cleanLine.toLowerCase().includes('recent') || cleanLine.toLowerCase().includes('past')) {
        icon = CalendarIcon;
        label = 'Timeframe';
      } else if (cleanLine.toLowerCase().includes('economic') || cleanLine.toLowerCase().includes('impact') || cleanLine.toLowerCase().includes('comorbid') || cleanLine.toLowerCase().includes('scope')) {
        icon = ChartBarIcon;
        label = 'Research Scope';
      } else if (cleanLine.toLowerCase().includes('audience') || cleanLine.toLowerCase().includes('physician') || cleanLine.toLowerCase().includes('policymaker') || cleanLine.toLowerCase().includes('investor')) {
        icon = UserGroupIcon;
        label = 'Target Audience';
      } else {
        // Fallback based on position
        if (idx === 1) {
          icon = CalendarIcon;
          label = 'Timeframe';
        } else if (idx === 2) {
          icon = ChartBarIcon;
          label = 'Research Scope';
        } else {
          icon = UserGroupIcon;
          label = 'Target Audience';
        }
      }

      params.push({ icon, label, value: cleanLine });
    });

    return params;
  };

  const parameters = parseAnswers(answersText);

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      p={5}
      borderWidth="1px"
      borderColor={cardBorder}
      shadow="lg"
      backdropFilter="blur(10px)"
      position="relative"
      maxW="700px"
    >
      {/* Timeline connector dot */}
      <Box
        position="absolute"
        right="-9px"
        top="50%"
        transform="translateY(-50%)"
        w="18px"
        h="18px"
        borderRadius="full"
        bg={badgeBg}
        borderColor={badgeColor}
        zIndex={2}
      />

      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack spacing={2}>
          <Badge 
            bg={badgeBg}
            color={badgeColor}
            fontSize="xs" 
            px={2} 
            py={1} 
            borderRadius="md"
          >
            Phase 1 Complete
          </Badge>
          <Text fontSize="sm" fontWeight="600" color={textColor}>
            Research Parameters Defined
          </Text>
        </HStack>

        {/* Parameters Grid */}
        <VStack align="stretch" spacing={3}>
          {parameters.map((param, idx) => (
            <Box
              key={idx}
              bg={paramBg}
              borderRadius="lg"
              p={3}
              borderWidth="1px"
              borderColor={paramBorder}
            >
              <HStack spacing={3} align="flex-start">
                <Icon
                  as={param.icon}
                  w={5}
                  h={5}
                  color={iconColor}
                  mt={0.5}
                  flexShrink={0}
                />
                <VStack align="stretch" spacing={1} flex={1}>
                  <Text fontSize="xs" fontWeight="600" color={mutedColor} textTransform="uppercase" letterSpacing="wide">
                    {param.label}
                  </Text>
                  <Text fontSize="sm" color={textColor} lineHeight="1.5">
                    {param.value}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
};
