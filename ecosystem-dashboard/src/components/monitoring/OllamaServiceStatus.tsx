import React from 'react';
import { Box, Heading, Text, Spinner, Alert, AlertIcon, Tag } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Mock data - replace with actual API call
const ollamaServiceInfo = {
  status: 'Operational',
  modelsAvailable: ['Llama3', 'Mistral', 'Gemma'],
  endpoint: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
};

const OllamaServiceStatus: React.FC = () => {
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Alert status="error"><AlertIcon />Error fetching Ollama service status.</Alert>;
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Ollama Service Status</Heading>
      <Text mb={2}>Endpoint: <a href={ollamaServiceInfo.endpoint} target="_blank" rel="noopener noreferrer">{ollamaServiceInfo.endpoint}</a></Text>
      <Text mb={2}>Status: 
        <Text as="span" color={ollamaServiceInfo.status === 'Operational' ? 'green.500' : 'red.500'}>
          {ollamaServiceInfo.status}
        </Text>
      </Text>
      <Text mb={2}>Models Available:</Text>
      {ollamaServiceInfo.modelsAvailable.map(model => (
        <Tag key={model} size="md" variant="solid" colorScheme="blue" mr={2} mb={2}>
          {model}
        </Tag>
      ))}
      {/* Add more detailed status information here */}
    </Box>
  );
};

export default OllamaServiceStatus;
