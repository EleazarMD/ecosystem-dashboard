import React from 'react';
import { Box, Text, Alert, AlertIcon, AlertTitle, AlertDescription, Button, VStack } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import DocumentsContent from './DocumentsContent';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Documents tab error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={8}>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={3} flex="1">
              <AlertTitle>Document Pipeline Offline</AlertTitle>
              <AlertDescription>
                The document ingestion system is currently unavailable. This typically means:
              </AlertDescription>
              <VStack align="start" pl={4} spacing={1}>
                <Text fontSize="sm">• File server (port 8405) is not running</Text>
                <Text fontSize="sm">• Knowledge Graph API (port 8765) is offline</Text>
                <Text fontSize="sm">• Document processing agents are not started</Text>
              </VStack>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Retry
              </Button>
            </VStack>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

const SafeDocumentsTab: React.FC = () => {
  return (
    <ErrorBoundary>
      <DocumentsContent />
    </ErrorBoundary>
  );
};

export default SafeDocumentsTab;
