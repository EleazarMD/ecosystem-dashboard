import React from 'react';
import { Box, VStack, HStack, Text, Heading, Badge } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export const WelcomeScreen = () => {
  const iconColor = useSemanticToken('text.tertiary');
  const textColor = useSemanticToken('text.secondary');
  const headingColor = useSemanticToken('text.primary');
  const highlightColor = 'purple.500';
  const iconBg = useSemanticToken('surface.base');

  return (
    <Box
      flex="1"
      display="flex"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      p={8}
    >
      <VStack spacing={4} maxW="400px">
        <Box
          p={4}
          bg={iconBg}
          borderRadius="full"
        >
          <Text fontSize="2xl">✨</Text>
        </Box>
        <Heading size="lg" color={headingColor}>
          AI Homelab Assistant
        </Heading>
        <Text color={textColor}>
          How can I help you manage your ecosystem today?
        </Text>
        
        <Box w="100%" mt={4}>
          <HStack justify="center" mb={2}>
            <Badge colorScheme="purple" variant="solid" fontSize="xs">NEW</Badge>
            <Text fontSize="sm" fontWeight="semibold" color={highlightColor}>
              Context-Aware Intelligence
            </Text>
          </HStack>
          <VStack spacing={1} align="start" fontSize="xs" color={textColor}>
            <Text>• I can see what you're looking at</Text>
            <Text>• Real-time page awareness</Text>
            <Text>• Smart context suggestions</Text>
          </VStack>
          <Text fontSize="xs" color={highlightColor} fontWeight="medium" mt={3}>
            Try: "What am I looking at?" or "What's on this page?"
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
