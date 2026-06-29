/**
 * StudioReturnBanner — shows a "Path Step" banner when a studio was launched
 * from the Learning Path. Displays the step prompt and a "Done!" button that
 * completes the step and navigates back.
 *
 * Used by: Journal, Book Explorer, Pokémon Lab, Art Studio
 */

import React from 'react';
import { Box, HStack, Text, Button, Badge } from '@chakra-ui/react';
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useStudioReturn } from '@/hooks/useStudioReturn';

export function StudioReturnBanner() {
  const ctx = useStudioReturn();

  if (!ctx.isFromPath) return null;

  return (
    <Box
      px={4}
      py={3}
      bg="purple.50"
      borderBottom="2px solid"
      borderColor="purple.200"
      borderRadius="lg"
      mb={4}
    >
      <HStack justify="space-between" align="center" spacing={4}>
        <HStack spacing={3} align="start" flex={1} minW={0}>
          <Box flexShrink={0} mt={0.5}>
            <Badge colorScheme="purple" fontSize="2xs" borderRadius="full" px={2}>
              🗺️ Path Step {ctx.stepNumber}
            </Badge>
          </Box>
          <Box flex={1} minW={0}>
            {ctx.prompt && (
              <Text fontSize="sm" fontWeight="600" color="purple.900" noOfLines={2}>
                {ctx.prompt}
              </Text>
            )}
            {ctx.skillCode && (
              <Text fontSize="2xs" color="purple.600" mt={0.5}>
                Skill: {ctx.skillCode}
              </Text>
            )}
          </Box>
        </HStack>
        <HStack spacing={2} flexShrink={0}>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<FiArrowLeft />}
            onClick={ctx.goBack}
            color="gray.600"
          >
            Back
          </Button>
          <Button
            size="sm"
            colorScheme="green"
            leftIcon={<FiCheckCircle />}
            onClick={() => ctx.completeStep(1.0)}
          >
            Done!
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
