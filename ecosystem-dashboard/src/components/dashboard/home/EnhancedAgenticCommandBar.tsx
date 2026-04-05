import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  Text,
  FormControl,
  HStack,
  VStack,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Tooltip,
  Flex,
  Avatar,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
  Progress,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiMic, 
  FiMicOff, 
  FiCommand, 
  FiActivity, 
  FiTrendingUp, 
  FiSettings,
  FiClock,
  FiCpu,
  FiZap
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgenticCommand } from '@/context/AgenticCommandContext';
import { useVoiceInterface } from '@/hooks/useVoiceInterface';
import { useAgentSuggestions } from '@/hooks/useAgentSuggestions';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Animation variants
const commandVariants = {
  idle: { scale: 1, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
  active: { scale: 1.02, boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)' },
  processing: { scale: 0.98, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
};

interface CommandSuggestion {
  text: string;
  icon: React.ElementType;
  category: 'monitoring' | 'optimization' | 'troubleshooting' | 'analysis';
  priority: 'high' | 'medium' | 'low';
}

const EnhancedAgenticCommandBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const { 
    executeQuery, 
    response, 
    loading, 
    error,
    executionTime,
    confidence 
  } = useAgenticCommand();
  
  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    isSupported: voiceSupported
  } = useVoiceInterface();
  
  const {
    suggestions,
    refreshSuggestions,
    executeSuggestion
  } = useAgentSuggestions();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Handle voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      setQuery(transcript);
      handleSubmit();
    }
  }, [transcript, isListening]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    
    // Add to history
    setCommandHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10
    setHistoryIndex(-1);
    
    await executeQuery(query);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setQuery(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setQuery(newIndex === -1 ? '' : commandHistory[newIndex]);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSuggestionClick = (suggestion: CommandSuggestion) => {
    setQuery(suggestion.text);
    inputRef.current?.focus();
  };

  const getCommandState = () => {
    if (loading) return 'processing';
    if (query.length > 0 || isListening) return 'active';
    return 'idle';
  };

  return (
    <GlassPanel p={6} w="100%">
      <VStack spacing={6} align="stretch">
        {/* Header with Agent Status */}
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Avatar 
              size="sm" 
              name="AI Agent" 
              bg="blue.500"
              icon={<FiCpu />}
            />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="lg">AI Homelab Agent</Text>
              <HStack spacing={2}>
                <Badge colorScheme="green" size="sm">
                  <FiActivity style={{ marginRight: '4px' }} />
                  Active
                </Badge>
                {confidence && (
                  <Badge colorScheme="blue" size="sm">
                    {Math.round(confidence * 100)}% Confident
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
          
          <HStack spacing={2}>
            {executionTime && (
              <Badge variant="subtle" colorScheme="gray">
                <FiClock style={{ marginRight: '4px' }} />
                {executionTime}ms
              </Badge>
            )}
            <Menu>
              <MenuButton 
                as={IconButton}
                icon={<FiSettings />}
                variant="ghost"
                size="sm"
              />
              <MenuList>
                <MenuItem icon={<FiTrendingUp />}>
                  View Performance
                </MenuItem>
                <MenuItem icon={<FiCpu />}>
                  Agent Settings
                </MenuItem>
                <MenuItem icon={<FiCommand />}>
                  Command History
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {/* Enhanced Command Input */}
        <motion.div
          variants={commandVariants}
          animate={getCommandState()}
          transition={{ duration: 0.2 }}
        >
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>
                <FiCommand style={{ marginRight: '8px' }} />
                Command
              </Tab>
              <Tab>
                <FiZap style={{ marginRight: '8px' }} />
                Quick Actions
              </Tab>
              <Tab>
                <FiTrendingUp style={{ marginRight: '8px' }} />
                Suggestions
              </Tab>
            </TabList>

            <TabPanels>
              {/* Command Tab */}
              <TabPanel p={4}>
                <form onSubmit={handleSubmit}>
                  <VStack spacing={4}>
                    <HStack w="100%">
                      <Input
                        ref={inputRef}
                        placeholder="Ask me anything about your AI Homelab ecosystem..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        isDisabled={loading}
                        size="lg"
                        bg={bgColor}
                        border="2px solid"
                        borderColor={isListening ? 'red.300' : borderColor}
                        _focus={{
                          borderColor: 'blue.500',
                          boxShadow: '0 0 0 1px blue.500'
                        }}
                      />
                      
                      {voiceSupported && (
                        <Tooltip label={isListening ? 'Stop listening' : 'Start voice input'}>
                          <IconButton
                            aria-label="Voice input"
                            icon={isListening ? <FiMicOff /> : <FiMic />}
                            onClick={handleVoiceToggle}
                            colorScheme={isListening ? 'red' : 'blue'}
                            variant={isListening ? 'solid' : 'outline'}
                            size="lg"
                          />
                        </Tooltip>
                      )}
                      
                      <IconButton
                        aria-label="Execute command"
                        icon={<FiSend />}
                        type="submit"
                        isLoading={loading}
                        colorScheme="blue"
                        size="sm"
                        isDisabled={!query.trim()}
                      />
                    </HStack>

                    {isListening && (
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="bold">Listening...</Text>
                          <Text fontSize="sm">
                            {transcript || "Say something..."}
                          </Text>
                        </VStack>
                      </Alert>
                    )}

                    {loading && (
                      <Box w="100%">
                        <Progress 
                          isIndeterminate 
                          colorScheme="blue" 
                          size="sm" 
                          borderRadius="full"
                        />
                        <Text textAlign="center" mt={2} fontSize="sm" color={useSemanticToken('text.secondary')}>
                          Processing your request...
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </form>
              </TabPanel>

              {/* Quick Actions Tab */}
              <TabPanel>
                <VStack spacing={4}>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    Common actions for your AI Homelab
                  </Text>
                  <HStack wrap="wrap" spacing={2}>
                    {[
                      { text: 'Check all service status', category: 'monitoring' },
                      { text: 'Find performance bottlenecks', category: 'analysis' },
                      { text: 'Restart failed services', category: 'troubleshooting' },
                      { text: 'Optimize resource usage', category: 'optimization' },
                      { text: 'Show recent errors', category: 'monitoring' },
                      { text: 'Generate health report', category: 'analysis' }
                    ].map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setQuery(action.text);
                          setActiveTab(0);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                      >
                        {action.text}
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Suggestions Tab */}
              <TabPanel>
                <VStack spacing={4}>
                  <HStack justify="space-between" w="100%">
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      AI-generated suggestions based on current system state
                    </Text>
                    <Button size="xs" variant="ghost" onClick={refreshSuggestions}>
                      Refresh
                    </Button>
                  </HStack>
                  
                  <VStack spacing={2} w="100%">
                    {suggestions.map((suggestion, index) => (
                      <Box
                        key={index}
                        p={3}
                        w="100%"
                        bg={useSemanticToken('surface.base')}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: 'gray.100' }}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <HStack justify="space-between">
                          <HStack>
                            <suggestion.icon />
                            <Text fontSize="sm">{suggestion.text}</Text>
                          </HStack>
                          <Badge
                            size="sm"
                            colorScheme={
                              suggestion.priority === 'high' ? 'red' :
                              suggestion.priority === 'medium' ? 'yellow' : 'green'
                            }
                          >
                            {suggestion.priority}
                          </Badge>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </motion.div>

        {/* Response Display */}
        <AnimatePresence>
          {(response || error) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {error ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">Error</Text>
                    <Text fontSize="sm">{error}</Text>
                  </VStack>
                </Alert>
              ) : response && (
                <Box
                  p={4}
                  bg="blue.50"
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderLeftColor="blue.500"
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold" color="blue.700">
                      Agent Response
                    </Text>
                    {confidence && (
                      <Badge colorScheme="blue">
                        {Math.round(confidence * 100)}% confident
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="blue.800" whiteSpace="pre-wrap">
                    {typeof response === 'string' 
                      ? response 
                      : JSON.stringify(response, null, 2)
                    }
                  </Text>
                </Box>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </VStack>
    </GlassPanel>
  );
};

export default EnhancedAgenticCommandBar;
