import React from 'react';
import { Box, Container, Heading, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import DashboardLayout from '@/components/layout/DashboardLayout';

const AIResearchSimple: React.FC = () => {
  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <Heading>AI-Research</Heading>
        <Text mt={4}>
          OpenAI Deep Research API integration coming soon. This requires:
        </Text>
        <Box as="ul" mt={4} ml={8}>
          <li>OpenAI API Key configuration (OPENAI_API_KEY)</li>
          <li>Background job queue setup</li>
          <li>Database integration for session storage</li>
          <li>Deep Research API implementation</li>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default AIResearchSimple;
