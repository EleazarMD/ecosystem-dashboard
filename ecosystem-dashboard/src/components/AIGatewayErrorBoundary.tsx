/**
 * AI Gateway Error Boundary
 * 
 * Specialized error boundary for handling AI Gateway SDK validation errors
 * and forEach runtime errors during initialization and operation.
 */

import React, { Component, ReactNode } from 'react';
import { Box, Typography, Alert, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isSDKValidationError: boolean;
}

export class AIGatewayErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isSDKValidationError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is the known AI Gateway SDK forEach validation error
    const isSDKValidationError = error.message.includes('forEach') || 
                                error.message.includes('Cannot read properties of undefined') ||
                                error.stack?.includes('validation.ts') ||
                                error.stack?.includes('ai-gateway-client-sdk');

    return {
      hasError: true,
      error,
      isSDKValidationError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error for debugging
    console.error('AI Gateway Error Boundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report SDK validation errors specifically
    if (this.state.isSDKValidationError) {
      console.warn('🚨 AI Gateway SDK Validation Error Detected:', {
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isSDKValidationError: false
    });
  };

  renderFallbackUI = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Gateway Infrastructure (Fallback Mode)
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Monitor and manage AI Gateway connections, health status, and available models.
        </Typography>
        
        {/* SDK Error Alert */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>SDK Validation Error:</strong> The AI Gateway SDK has forEach validation issues. 
            Operating in fallback mode with mock data while the SDK team addresses these issues.
          </Typography>
        </Alert>

        {/* Mock Status Cards */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Connection Status
          </Typography>
          <Box display="flex" gap={2} mb={3}>
            <Paper sx={{ p: 2, minWidth: 150, bgcolor: 'warning.light' }}>
              <Typography variant="subtitle2">Connection</Typography>
              <Typography variant="h6" color="warning.main">Fallback Mode</Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 150, bgcolor: 'info.light' }}>
              <Typography variant="subtitle2">Health Status</Typography>
              <Typography variant="h6" color="info.main">Mock Data</Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 150, bgcolor: 'success.light' }}>
              <Typography variant="subtitle2">Models</Typography>
              <Typography variant="h6" color="success.main">2 Available</Typography>
            </Paper>
          </Box>
        </Box>

        {/* Mock Models Table */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Models (Mock Data)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1">llama3.1:8b</Typography>
                <Typography variant="body2" color="text.secondary">Provider: Ollama • Owner: Meta</Typography>
                <Typography variant="caption">Large language model optimized for general tasks</Typography>
              </Box>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1">gpt-4</Typography>
                <Typography variant="body2" color="text.secondary">Provider: OpenAI • Owner: OpenAI</Typography>
                <Typography variant="caption">Advanced language model with reasoning capabilities</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Action Buttons */}
        <Box display="flex" gap={2} mb={3}>
          <Button 
            variant="contained" 
            startIcon={<Refresh />}
            onClick={this.handleRetry}
            color="primary"
          >
            Retry Connection
          </Button>
          <Button 
            variant="outlined"
            onClick={() => window.location.reload()}
            startIcon={<Refresh />}
          >
            Reload Page
          </Button>
        </Box>

        {/* Technical Details */}
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Technical Details
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Issue:</strong> AI Gateway SDK validation functions call .forEach() on undefined arrays
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Location:</strong> @ai-homelab/ai-gateway-client-sdk/validation.ts
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Solution:</strong> SDK team needs to add null-safe array checks: (array || []).forEach(...)
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> Temporary fallback UI active until SDK fixes are deployed
          </Typography>
        </Paper>

        {process.env.NODE_ENV === 'development' && (
          <Box mt={2}>
            <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
              <Typography variant="subtitle2" gutterBottom>
                Development Error Details
              </Typography>
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <strong>Error:</strong> {this.state.error?.message}
              </Typography>
              {this.state.error?.stack && (
                <Typography variant="caption" component="pre" sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.7rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  bgcolor: 'rgba(0,0,0,0.1)',
                  p: 1,
                  mt: 1
                }}>
                  {this.state.error.stack}
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Different UI for SDK validation errors vs general errors
      if (this.state.isSDKValidationError) {
        // Render a functional fallback UI with mock data
        return this.renderFallbackUI();
      }

      // General error fallback
      return (
        <Paper sx={{ p: 3, m: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Box display="flex" alignItems="center" mb={2}>
            <ErrorOutline sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6">
              AI Gateway Component Error
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            An unexpected error occurred in the AI Gateway component.
          </Typography>

          <Button 
            variant="contained" 
            startIcon={<Refresh />}
            onClick={this.handleRetry}
            size="small"
          >
            Retry
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <Box mt={2}>
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <strong>Error:</strong> {this.state.error?.message}
              </Typography>
            </Box>
          )}
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default AIGatewayErrorBoundary;
