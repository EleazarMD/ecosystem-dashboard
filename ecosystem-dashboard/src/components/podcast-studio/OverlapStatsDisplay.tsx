import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Tooltip,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface OverlapStats {
  totalTurns: number;
  overlappingTurns: number;
  backchannelResponses: number;
  hardInterruptions: number;
  blendedOverlaps: number;
  overlapPercentage: string;
}

interface OverlapStatsDisplayProps {
  stats: OverlapStats | null;
  compact?: boolean;
}

export default function OverlapStatsDisplay({ stats, compact = false }: OverlapStatsDisplayProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const accentBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');

  if (!stats) return null;

  const overlapPercent = parseFloat(stats.overlapPercentage);

  // Determine quality level based on overlap percentage
  const getQualityInfo = () => {
    if (overlapPercent >= 40) {
      return { label: 'Excellent', color: 'green', desc: 'Very natural conversation flow' };
    } else if (overlapPercent >= 25) {
      return { label: 'Good', color: 'blue', desc: 'Natural sounding dialogue' };
    } else if (overlapPercent >= 10) {
      return { label: 'Fair', color: 'yellow', desc: 'Some overlaps present' };
    } else {
      return { label: 'Minimal', color: 'gray', desc: 'Mostly sequential turns' };
    }
  };

  const quality = getQualityInfo();

  if (compact) {
    return (
      <HStack spacing={3} p={2} bg={accentBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
        <Badge colorScheme={quality.color} fontSize="9px">{quality.label.toUpperCase()}</Badge>
        <Text fontSize="11px" fontWeight="600" color={textColor}>
          {stats.overlappingTurns}/{stats.totalTurns} overlaps
        </Text>
        <Text fontSize="10px" color={mutedColor}>
          ({stats.overlapPercentage})
        </Text>
      </HStack>
    );
  }

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="xl"
      border="2px solid"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <VStack spacing={3} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Text fontSize="13px" fontWeight="700" color={textColor}>
              🔀 Overlap Analysis
            </Text>
            <Tooltip label="Shows how many dialogue turns will overlap in the final audio">
              <span>
                <Icon as={FiInfo} boxSize={3} color={mutedColor} />
              </span>
            </Tooltip>
          </HStack>
          <Badge colorScheme={quality.color} fontSize="10px">
            {quality.label}
          </Badge>
        </HStack>

        <Text fontSize="10px" color={mutedColor} fontStyle="italic">
          {quality.desc}
        </Text>

        {/* Progress Bar */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="11px" fontWeight="600" color={textColor}>
              Overlap Coverage
            </Text>
            <Text fontSize="12px" fontWeight="700" color={quality.color + '.500'}>
              {stats.overlapPercentage}
            </Text>
          </HStack>
          <Progress
            value={overlapPercent}
            size="sm"
            colorScheme={quality.color}
            borderRadius="full"
            hasStripe
            isAnimated
          />
        </Box>

        <Divider />

        {/* Detailed Stats */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Text fontSize="11px" color={mutedColor}>Total Turns:</Text>
              <Badge colorScheme="gray" fontSize="9px">{stats.totalTurns}</Badge>
            </HStack>
            <Text fontSize="11px" fontWeight="600">{stats.overlappingTurns} overlap</Text>
          </HStack>

          <HStack justify="space-between" bg={cardBg} p={2} borderRadius="md" border="1px solid" borderColor="blue.500">
            <HStack spacing={2}>
              <Text fontSize="10px" color={mutedColor}>💬 Backchannel:</Text>
              <Tooltip label='Affirmations like "Mmhmm", "Right" that overlap with other speaker'>
                <span>
                  <Icon as={FiInfo} boxSize={2.5} color={mutedColor} />
                </span>
              </Tooltip>
            </HStack>
            <Badge colorScheme="blue" fontSize="9px">{stats.backchannelResponses}</Badge>
          </HStack>

          <HStack justify="space-between" bg={cardBg} p={2} borderRadius="md" border="1px solid" borderColor="orange.500">
            <HStack spacing={2}>
              <Text fontSize="10px" color={mutedColor}>⚡ Hard Cuts:</Text>
              <Tooltip label='Assertive interruptions that cut in with full volume'>
                <span>
                  <Icon as={FiInfo} boxSize={2.5} color={mutedColor} />
                </span>
              </Tooltip>
            </HStack>
            <Badge colorScheme="orange" fontSize="9px">{stats.hardInterruptions}</Badge>
          </HStack>

          <HStack justify="space-between" bg={cardBg} p={2} borderRadius="md" border="1px solid" borderColor="purple.500">
            <HStack spacing={2}>
              <Text fontSize="10px" color={mutedColor}>🎭 Blended:</Text>
              <Tooltip label='Smooth overlaps with fade-in for natural blending'>
                <span>
                  <Icon as={FiInfo} boxSize={2.5} color={mutedColor} />
                </span>
              </Tooltip>
            </HStack>
            <Badge colorScheme="purple" fontSize="9px">{stats.blendedOverlaps}</Badge>
          </HStack>
        </VStack>

        {/* NotebookLM-style indicator */}
        {overlapPercent >= 40 && (
          <Box
            p={2}
            bg={cardBg}
            border="1px solid"
            borderColor="green.500"
            borderRadius="md"
            textAlign="center"
          >
            <Text fontSize="10px" fontWeight="600" color="green.500">
              ✨ NotebookLM-Quality Natural Flow
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
