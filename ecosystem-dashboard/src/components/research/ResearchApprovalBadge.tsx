/**
 * Research Approval Badge
 * Compact badge showing user approved the research plan
 */

import React from 'react';
import {
  Box,
  HStack,
  Text,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export const ResearchApprovalBadge: React.FC = () => {
  // Glassmorphic design using semantic tokens
  const bgColor = useSemanticToken('surface.glass');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const iconColor = useSemanticToken('success.500');
  const dotColor = useSemanticToken('text.primary');
  const dotBorder = useSemanticToken('surface.elevated');

  return (
    <Box
      bg={bgColor}
      borderRadius="full"
      px={5}
      py={2}
      borderWidth="1px"
      borderColor={borderColor}
      shadow="lg"
      backdropFilter="blur(10px)"
      position="relative"
      display="inline-block"
      maxW="400px"
    >
      {/* Timeline connector dot */}
      <Box
        position="absolute"
        right="-10px"
        top="50%"
        transform="translateY(-50%)"
        w="18px"
        h="18px"
        borderRadius="full"
        bg={dotColor}
        borderWidth="3px"
        borderColor={dotBorder}
        zIndex={2}
      />

      <HStack spacing={2}>
        <Icon as={CheckCircleIcon} w={5} h={5} color={iconColor} />
        <Text fontSize="sm" fontWeight="600" color={textColor}>
          Plan Approved → Research Initiated
        </Text>
      </HStack>
    </Box>
  );
};
