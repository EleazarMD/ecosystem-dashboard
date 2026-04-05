/**
 * PerplexityEnhancedInput - Usage Examples
 * 
 * This file shows how to integrate the PerplexityEnhancedInput component
 * into different agents (Workspace AI, Page Agent, Dashboard AI).
 */

import React, { useState } from 'react';
import { VStack, Button } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { PerplexityEnhancedInput, PerplexityModeSelector, PerplexityMode } from './PerplexityEnhancedInput';

/**
 * Example 1: Basic Usage (Auto-detection only)
 * The component detects mode automatically as user types
 */
export const BasicExample = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);

  const handleSubmit = () => {
    console.log('Submitting:', message, 'Mode:', detectedMode);
    // Your submit logic here
  };

  return (
    <VStack spacing={4} align="stretch">
      <PerplexityEnhancedInput
        value={message}
        onChange={setMessage}
        onSubmit={handleSubmit}
        placeholder="Ask anything..."
        isPerplexityEnabled={true}
        onModeChange={setDetectedMode}
      />
      <Button onClick={handleSubmit}>Send</Button>
    </VStack>
  );
};

/**
 * Example 2: With Manual Mode Selection
 * Users can override auto-detection by clicking mode icons
 */
export const WithManualSelectionExample = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);
  const [manualMode, setManualMode] = useState<PerplexityMode>(null);

  const handleSubmit = () => {
    const activeMode = manualMode || detectedMode;
    console.log('Submitting:', message, 'Mode:', activeMode);
  };

  return (
    <VStack spacing={4} align="stretch">
      <PerplexityEnhancedInput
        value={message}
        onChange={setMessage}
        onSubmit={handleSubmit}
        placeholder="Ask anything..."
        isPerplexityEnabled={true}
        onModeChange={setDetectedMode}
        manualMode={manualMode} // Manual override
      />
      
      {/* Mode selector icons */}
      <PerplexityModeSelector
        selectedMode={manualMode}
        onModeSelect={setManualMode}
        detectedMode={detectedMode}
      />
      
      <Button onClick={handleSubmit}>Send</Button>
    </VStack>
  );
};

/**
 * Example 3: Conditional Perplexity (Based on MCP Settings)
 * Enable Perplexity only when user has it enabled in settings
 */
export const ConditionalExample = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);
  const [isPerplexityEnabled, setIsPerplexityEnabled] = useState(false); // From user settings

  const handleSubmit = () => {
    console.log('Submitting:', message);
    // Include detectedMode in MCP sources if enabled
    if (isPerplexityEnabled && detectedMode) {
      console.log('Using Perplexity mode:', detectedMode);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <PerplexityEnhancedInput
        value={message}
        onChange={setMessage}
        onSubmit={handleSubmit}
        placeholder="Ask anything..."
        isPerplexityEnabled={isPerplexityEnabled}
        onModeChange={setDetectedMode}
      />
      <Button onClick={handleSubmit}>Send</Button>
    </VStack>
  );
};

/**
 * Example 4: Integration with WorkspaceAI
 * Replace the existing textarea in WorkspaceAI.tsx with this component
 */
export const WorkspaceAIIntegration = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);
  const [activeMcpServers, setActiveMcpServers] = useState({ perplexity: true });

  const sendMessage = async () => {
    // Your existing sendChatMessage logic
    const mcpSources = Object.entries(activeMcpServers)
      .filter(([_, enabled]) => enabled)
      .map(([source]) => source);

    // Send to Goose with detected mode
    await fetch('/api/goose/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent_id: 'workspace-ai',
        mcp_sources: mcpSources,
        // Goose will automatically pick the right tool based on query
        // The detected mode is just for UI feedback
      })
    });
  };

  return (
    <VStack spacing={4} align="stretch" maxW="800px" mx="auto" p={4}>
      <PerplexityEnhancedInput
        value={message}
        onChange={setMessage}
        onSubmit={sendMessage}
        placeholder="Ask anything..."
        isPerplexityEnabled={activeMcpServers.perplexity}
        onModeChange={setDetectedMode}
        minHeight="100px"
        maxHeight="400px"
      />
      <Button onClick={sendMessage} colorScheme="blue">
        Send to Goose
      </Button>
    </VStack>
  );
};

/**
 * Example 5: Page Agent Integration
 * Same component, different agent context
 */
export const PageAgentIntegration = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);

  const sendToPageAgent = async () => {
    await fetch('/api/goose/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent_id: 'page-agent', // Different agent
        mcp_sources: ['perplexity'],
      })
    });
  };

  return (
    <PerplexityEnhancedInput
      value={message}
      onChange={setMessage}
      onSubmit={sendToPageAgent}
      placeholder="Ask about this page..."
      isPerplexityEnabled={true}
      onModeChange={setDetectedMode}
    />
  );
};

/**
 * Example 6: Dashboard AI Integration
 * Same component, dashboard context
 */
export const DashboardAIIntegration = () => {
  const [message, setMessage] = useState('');
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);

  const sendToDashboardAgent = async () => {
    await fetch('/api/goose/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent_id: 'dashboard-ai', // Dashboard agent
        mcp_sources: ['perplexity'],
      })
    });
  };

  return (
    <PerplexityEnhancedInput
      value={message}
      onChange={setMessage}
      onSubmit={sendToDashboardAgent}
      placeholder="Ask about dashboard metrics..."
      isPerplexityEnabled={true}
      onModeChange={setDetectedMode}
    />
  );
};
