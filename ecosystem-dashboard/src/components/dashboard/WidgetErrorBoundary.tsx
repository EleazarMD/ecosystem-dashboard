/**
 * Widget Error Boundary
 * Production-grade error boundary for dashboard widgets
 */

import React, { Component, ReactNode } from 'react';
import { Box, VStack, Text, Button, Icon } from '@chakra-ui/react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Props {
  children: ReactNode;
  widgetName: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.widgetName}:`, error, errorInfo);
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }

    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GlassPanel variant="light" p={6}>
          <VStack spacing={4} align="center">
            <Icon as={FiAlertTriangle} boxSize={12} color="red.500" />
            <Text fontWeight="medium" fontSize="lg">
              {this.props.widgetName} Error
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Something went wrong loading this widget.
            </Text>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <Box
                p={3}
                bg="red.50"
                borderRadius="md"
                fontSize="xs"
                fontFamily="mono"
                maxW="100%"
                overflow="auto"
              >
                <Text color="red.700">{this.state.error.toString()}</Text>
              </Box>
            )}
            <Button
              leftIcon={<FiRefreshCw />}
              size="sm"
              colorScheme="blue"
              onClick={this.handleReset}
            >
              Retry
            </Button>
          </VStack>
        </GlassPanel>
      );
    }

    return this.props.children;
  }
}
