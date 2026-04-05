import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
  Text,
  Code,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import { isFeatureEnabled } from '@/config/feature-flags';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error in development
    if (isFeatureEnabled('enableDebugMode')) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service
      console.error('Production error caught:', {
        component: this.props.componentName,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback {...this.state} componentName={this.props.componentName} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{
  error?: Error;
  errorInfo?: ErrorInfo;
  componentName?: string;
}> = ({ error, errorInfo, componentName }) => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box p={4}>
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box flex="1">
          <AlertTitle>
            {componentName ? `${componentName} Error` : 'Component Error'}
          </AlertTitle>
          <AlertDescription>
            Something went wrong with this component. The error has been logged.
          </AlertDescription>
        </Box>
      </Alert>

      {isFeatureEnabled('enableDebugMode') && (
        <VStack mt={4} align="stretch" spacing={2}>
          <Button size="sm" onClick={onToggle} variant="outline">
            {isOpen ? 'Hide' : 'Show'} Error Details
          </Button>
          
          <Collapse in={isOpen}>
            <Box p={4} bg={useSemanticToken('surface.base')} borderRadius="md" fontSize="sm">
              {error && (
                <Box mb={3}>
                  <Text fontWeight="bold" mb={1}>Error Message:</Text>
                  <Code p={2} display="block" whiteSpace="pre-wrap">
                    {error.message}
                  </Code>
                </Box>
              )}
              
              {error?.stack && (
                <Box mb={3}>
                  <Text fontWeight="bold" mb={1}>Stack Trace:</Text>
                  <Code p={2} display="block" whiteSpace="pre-wrap" fontSize="xs">
                    {error.stack}
                  </Code>
                </Box>
              )}
              
              {errorInfo?.componentStack && (
                <Box>
                  <Text fontWeight="bold" mb={1}>Component Stack:</Text>
                  <Code p={2} display="block" whiteSpace="pre-wrap" fontSize="xs">
                    {errorInfo.componentStack}
                  </Code>
                </Box>
              )}
            </Box>
          </Collapse>
        </VStack>
      )}
    </Box>
  );
};

export default ErrorBoundary;
