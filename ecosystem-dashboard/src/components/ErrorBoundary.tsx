import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Box, Button } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's the forEach Grid error we're trying to fix
    if (error.message.includes('forEach') || error.message.includes('Cannot read properties of undefined')) {
      console.warn('🚨 Grid forEach error caught by ErrorBoundary:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Box p={4}>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Component Error!</AlertTitle>
              <AlertDescription>
                {this.state.error?.message.includes('forEach') 
                  ? 'Grid component data loading issue. This is a known issue with MUI Grid components during initialization.'
                  : 'Something went wrong with this component.'
                }
              </AlertDescription>
              <Button size="sm" mt={2} onClick={this.handleReset}>
                Retry
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
