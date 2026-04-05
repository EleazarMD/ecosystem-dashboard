/**
 * Enhanced Agentic Command Bar with Google ADK Integration
 * 
 * Unified interface for AI-powered dashboard management and analytics
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  Collapse,
  IconButton,
  Tooltip,
  useToast,
  Flex,
  Divider
} from '@chakra-ui/react';
import { 
  ChatBubbleLeftRightIcon, 
  CommandLineIcon,
  LightBulbIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowPathIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { useGoogleADKAgent, AgentMessage } from '../../hooks/useGoogleADKAgent';
import { GlassPanel } from '../ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedAgenticCommandBarProps {
  onInsightGenerated?: (insights: any[]) => void;
  onRecommendationReceived?: (recommendations: string[]) => void;
  placeholder?: string;
  showHistory?: boolean;
  maxHeight?: string;
}

export const EnhancedAgenticCommandBar: React.FC<EnhancedAgenticCommandBarProps> = ({
  onInsightGenerated,
  onRecommendationReceived,
  placeholder = "Ask me anything about your AI Homelab ecosystem...",
  showHistory = true,
  maxHeight = "400px"
}) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<'query' | 'command' | 'insight' | 'analysis'>('query');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const {
    isLoading,
    error,
    currentSession,
    sendMessage,
    generateInsights,
    getSystemOverview,
    startNewSession,
    clearError
  } = useGoogleADKAgent();

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    try {
      const response = await sendMessage(message, selectedType);
      
      // Handle insights and recommendations
      if (response.insights && response.insights.length > 0 && onInsightGenerated) {
        onInsightGenerated(response.insights);
      }
      
      if (response.recommendations && response.recommendations.length > 0 && onRecommendationReceived) {
        onRecommendationReceived(response.recommendations);
      }

      // Show success toast with tools used
      if (response.toolsUsed && response.toolsUsed.length > 0) {
        toast({
          title: 'AI Analysis Complete',
          description: `Used ${response.toolsUsed.length} tools: ${response.toolsUsed.join(', ')}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

    } catch (error) {
      toast({
        title: 'Agent Error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsExpanded(true);
    
    try {
      switch (action) {
        case 'overview':
          await getSystemOverview();
          toast({
            title: 'System Overview',
            description: 'Retrieved comprehensive system status',
            status: 'info',
            duration: 3000,
          });
          break;
          
        case 'insights':
          await generateInsights();
          break;
          
        case 'health':
          await sendMessage('Check the health status of all services', 'analysis');
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'query': return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      case 'command': return <CommandLineIcon className="w-4 h-4" />;
      case 'insight': return <LightBulbIcon className="w-4 h-4" />;
      case 'analysis': return <ChartBarIcon className="w-4 h-4" />;
      default: return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'query': return 'blue';
      case 'command': return 'green';
      case 'insight': return 'purple';
      case 'analysis': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <GlassPanel variant="heavy" p={4}>
      {/* Compact Mode */}
      {!isExpanded && (
        <HStack spacing={3}>
          <Box flex={1}>
            <Input
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              bg={bgColor}
              border="1px solid"
              borderColor={borderColor}
              _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
            />
          </Box>
          
          {/* Quick Action Buttons */}
          <HStack spacing={2}>
            <Tooltip label="System Overview">
              <IconButton
                aria-label="System Overview"
                icon={<ChartBarIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={() => handleQuickAction('overview')}
                isLoading={isLoading}
              />
            </Tooltip>
            
            <Tooltip label="Generate Insights">
              <IconButton
                aria-label="Generate Insights"
                icon={<LightBulbIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={() => handleQuickAction('insights')}
                isLoading={isLoading}
              />
            </Tooltip>
            
            <Tooltip label="Health Check">
              <IconButton
                aria-label="Health Check"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={() => handleQuickAction('health')}
                isLoading={isLoading}
              />
            </Tooltip>
          </HStack>
        </HStack>
      )}

      {/* Expanded Mode */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                AI Homelab Assistant
              </Text>
              {currentSession && (
                <Badge colorScheme="green" variant="subtle">
                  Session Active
                </Badge>
              )}
            </HStack>
            
            <HStack spacing={2}>
              <Tooltip label="New Session">
                <IconButton
                  aria-label="New Session"
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                  size="sm"
                  variant="ghost"
                  onClick={startNewSession}
                />
              </Tooltip>
              
              <Tooltip label="Minimize">
                <IconButton
                  aria-label="Minimize"
                  icon={<XMarkIcon className="w-4 h-4" />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(false)}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Error Display */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription flex={1}>{error}</AlertDescription>
              <IconButton
                aria-label="Clear Error"
                icon={<XMarkIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={clearError}
              />
            </Alert>
          )}

          {/* Message History */}
          {showHistory && currentSession && currentSession.messages.length > 0 && (
            <Box
              maxH={maxHeight}
              overflowY="auto"
              border="1px solid"
              borderColor={borderColor}
              borderRadius="md"
              p={3}
              bg={useSemanticToken('surface.base')}
            >
              <VStack spacing={3} align="stretch">
                {currentSession.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </VStack>
            </Box>
          )}

          {/* Input Section */}
          <VStack spacing={3} align="stretch">
            {/* Type Selector */}
            <HStack spacing={2}>
              <Text fontSize="sm" color={mutedColor}>Type:</Text>
              {(['query', 'command', 'insight', 'analysis'] as const).map((type) => (
                <Button
                  key={type}
                  size="xs"
                  variant={selectedType === type ? 'solid' : 'ghost'}
                  colorScheme={getTypeColor(type)}
                  leftIcon={getTypeIcon(type)}
                  onClick={() => setSelectedType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </HStack>

            {/* Input Form */}
            <form onSubmit={handleSubmit}>
              <HStack spacing={2}>
                <Input
                  ref={inputRef}
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  bg={bgColor}
                  border="1px solid"
                  borderColor={borderColor}
                  _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
                  isDisabled={isLoading}
                />
                
                <Button
                  type="submit"
                  colorScheme={getTypeColor(selectedType)}
                  isLoading={isLoading}
                  loadingText="Processing..."
                  isDisabled={!input.trim()}
                  leftIcon={getTypeIcon(selectedType)}
                >
                  Send
                </Button>
              </HStack>
            </form>
          </VStack>
        </VStack>
      </Collapse>
    </GlassPanel>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{ message: AgentMessage }> = ({ message }) => {
  const isUser = message.type === 'user';
  const bgColor = isUser ? 'blue.50' : useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');

  return (
    <Box
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="80%"
      bg={bgColor}
      p={3}
      borderRadius="lg"
      borderBottomRightRadius={isUser ? 'sm' : 'lg'}
      borderBottomLeftRadius={isUser ? 'lg' : 'sm'}
    >
      <VStack spacing={2} align="stretch">
        <Text color={textColor} fontSize="sm">
          {message.content}
        </Text>
        
        {/* Agent-specific data */}
        {!isUser && (
          <>
            {message.insights && message.insights.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="purple.500" mb={1}>
                  Insights:
                </Text>
                {message.insights.map((insight, idx) => (
                  <Text key={idx} fontSize="xs" color={textColor}>
                    • {insight.title || insight.description}
                  </Text>
                ))}
              </Box>
            )}
            
            {message.recommendations && message.recommendations.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="green.500" mb={1}>
                  Recommendations:
                </Text>
                {message.recommendations.map((rec, idx) => (
                  <Text key={idx} fontSize="xs" color={textColor}>
                    • {rec}
                  </Text>
                ))}
              </Box>
            )}
            
            {message.toolsUsed && message.toolsUsed.length > 0 && (
              <Flex wrap="wrap" gap={1}>
                {message.toolsUsed.map((tool, idx) => (
                  <Badge key={idx} size="sm" colorScheme="blue" variant="subtle">
                    {tool.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </Flex>
            )}
          </>
        )}
        
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign={isUser ? 'right' : 'left'}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </VStack>
    </Box>
  );
};
