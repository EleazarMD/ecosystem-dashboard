/**
 * Glassmorphic Message Card Component
 * 
 * Beautiful white glassmorphic cards for user and assistant messages
 * with accordion-style tool execution displays
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Collapse,
  IconButton,
  Divider,
  Code,
  Flex,
  Tooltip,
  Avatar,
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TimeIcon,
  CheckCircleIcon,
  WarningIcon,
} from '@chakra-ui/icons';
import {
  FiTool,
  FiTerminal,
  FiClock,
  FiZap,
  FiUser,
} from 'react-icons/fi';
import { MessageContentRenderer } from './MessageContentRenderer';
import { MessageActionToolbar } from './MessageActionToolbar';

interface ToolCall {
  name: string;
  arguments?: Record<string, any>;
  result?: string;
  error?: string;
  duration_ms?: number;
  timestamp?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
  citations?: Array<{
    number: number;
    url: string;
    title?: string;
  }>;
  metadata?: {
    tools_used?: ToolCall[];
    job_id?: string;
    job_status?: string;
  };
}

interface GlassmorphicMessageCardProps {
  message: Message;
  isDeepResearchPlan?: boolean;
  isPlanApproved?: boolean;
  onApprovePlan?: () => void;
  onRevisePlan?: (feedback: string) => void;
  isLast?: boolean;
}

export const GlassmorphicMessageCard: React.FC<GlassmorphicMessageCardProps> = ({
  message,
  isDeepResearchPlan = false,
  isPlanApproved = false,
  onApprovePlan,
  onRevisePlan,
  isLast = false,
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Use semantic tokens for theme-aware styling
  const glassUserBg = useSemanticToken('interactive.surface');
  const glassAssistantBg = useSemanticToken('surface.elevated');
  const glassUserBorder = useSemanticToken('interactive.primary');
  const glassAssistantBorder = useSemanticToken('border.subtle');
  const glassBackdropFilter = 'blur(8px) saturate(120%)';
  const glassUserShadow = 'md';
  const glassAssistantShadow = 'sm';

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  // Tool cards state - group duplicate tools
  const rawToolCalls = message.metadata?.tools_used || [];

  // Group tools by name
  const groupedTools = rawToolCalls.reduce((acc, tool) => {
    const existing = acc.find(g => g.name === tool.name);
    if (existing) {
      existing.calls.push(tool);
      existing.count++;
    } else {
      acc.push({
        name: tool.name,
        count: 1,
        calls: [tool],
      });
    }
    return acc;
  }, [] as Array<{ name: string; count: number; calls: typeof rawToolCalls }>);

  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const toggleTool = (index: number) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <HStack
      align="flex-start"
      justify={isUser ? 'flex-end' : 'flex-start'}
      w="full"
      spacing={3}
      position="relative"
    >
      {/* Connection line for multi-turn conversation */}
      {isAssistant && (
        <Box
          position="absolute"
          left="14px"
          top="-12px"
          bottom="-12px"
          width="2px"
          bg={useSemanticToken('border.subtle')}
          borderRadius="full"
        />
      )}
      {/* Avatar for assistant */}
      {isAssistant && (
        <Box
          position="relative"
          w="28px"
          h="28px"
        >
          {/* Halo effect */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="34px"
            h="34px"
            borderRadius="full"
            bg={useSemanticToken('glass.background')}
            filter="blur(4px)"
            opacity={0.3}
          />
          {/* Icon */}
          <Box
            as="img"
            src="/goose-icon.png"
            alt="Goose"
            position="relative"
            w="28px"
            h="28px"
            borderRadius="full"
            bg={useSemanticToken('surface.elevated')}
            p={0.5}
            // Icon filter removed - handled by theme
          />
        </Box>
      )}

      <VStack
        align={isUser ? 'flex-end' : 'flex-start'}
        spacing={1.5}
        maxW={isUser ? '75%' : '80%'}
        w="auto"
      >
        {/* Main message card */}
        <Box
          position="relative"
          background={isUser ? glassUserBg : glassAssistantBg}
          backdropFilter={glassBackdropFilter}
          border="1px solid"
          borderColor={isUser ? glassUserBorder : glassAssistantBorder}
          borderRadius={isUser ? '2xl' : 'xl'}
          boxShadow={isUser ? glassUserShadow : glassAssistantShadow}
          px={isUser ? 5 : 4}
          py={isUser ? 3.5 : 2.5}
          minW={isUser ? '280px' : '320px'}
          maxW="100%"
          w="fit-content"
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          _before={{}}
        >
          <VStack align="stretch" spacing={isUser ? 1.5 : 1} w="full">
            {/* Role badge */}
            <HStack justify="space-between">
              <Badge
                colorScheme={isUser ? 'gray' : 'blue'}
                variant="subtle"
                fontSize="xs"
                px={1.5}
                py={0}
                borderRadius="md"
              >
                {isUser ? (
                  <HStack spacing={1}>
                    <FiUser size={10} />
                    <Text>You</Text>
                  </HStack>
                ) : (
                  <Text fontWeight="600" fontSize="xs">Goose</Text>
                )}
              </Badge>

              {message.model && isAssistant && (
                <Badge
                  variant="outline"
                  fontSize="xs"
                  colorScheme="gray"
                  borderRadius="md"
                >
                  {message.model}
                </Badge>
              )}
            </HStack>

            {/* Message content */}
            <Box
              fontSize={isUser ? 'sm' : 'sm'}
              lineHeight={isUser ? '1.6' : '1.5'}
              color={textColor}
              w="full"
              overflow="visible"
              sx={isAssistant ? {
                '& p': {
                  marginBottom: '0.5em',
                  marginTop: '0.25em',
                },
                '& ul, & ol': {
                  marginTop: '0.25em',
                  marginBottom: '0.5em',
                  paddingLeft: '1.5em',
                },
                '& li': {
                  marginBottom: '0.15em',
                },
                '& h1, & h2, & h3, & h4': {
                  marginTop: '0.5em',
                  marginBottom: '0.35em',
                },
              } : {}}
            >
              {isAssistant ? (
                <MessageContentRenderer
                  content={message.content}
                  citations={message.citations}
                  isDeepResearchPlan={isDeepResearchPlan}
                  isPlanApproved={isPlanApproved}
                  onApprovePlan={onApprovePlan}
                  onRevisePlan={onRevisePlan}
                />
              ) : (
                <Text whiteSpace="pre-wrap" wordBreak="break-word">{message.content}</Text>
              )}
            </Box>

            {/* Tool calls section */}
            {groupedTools.length > 0 && (
              <VStack align="stretch" spacing={1} mt={1}>
                <Divider />
                <Text fontSize="2xs" fontWeight="semibold" color={mutedColor} textTransform="uppercase">
                  Tools Used ({rawToolCalls.length} {rawToolCalls.length === 1 ? 'call' : 'calls'})
                </Text>

                {groupedTools.map((group, index) => (
                  <GroupedToolCard
                    key={index}
                    toolGroup={group}
                    index={index}
                    isExpanded={expandedTools.has(index)}
                    onToggle={() => toggleTool(index)}
                  />
                ))}
              </VStack>
            )}

            {/* Action toolbar for assistant messages */}
            {isAssistant && (
              <Box pt={0.5}>
                <MessageActionToolbar
                  messageContent={message.content}
                  messageId={message.metadata?.job_id}
                  onBranch={() => {
                    // TODO: Implement branch in new chat
                    console.log('Branch in new chat');
                  }}
                  onShare={() => {
                    // TODO: Implement share
                    console.log('Share message');
                  }}
                />
              </Box>
            )}

            {/* Metadata footer - compact */}
            <HStack
              justify="space-between"
              fontSize="2xs"
              color={mutedColor}
              pt={0}
            >
              <HStack spacing={1.5}>
                <FiClock size={9} />
                <Text>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                {message.cost !== undefined && message.cost > 0 && isAssistant && (
                  <Text opacity={0.7}>• ${message.cost.toFixed(4)}</Text>
                )}

                {message.metadata?.job_status && (
                  <Badge
                    variant="subtle"
                    colorScheme={
                      message.metadata.job_status === 'completed' ? 'green' :
                        message.metadata.job_status === 'failed' ? 'red' :
                          'yellow'
                    }
                    fontSize="2xs"
                    px={1}
                  >
                    {message.metadata.job_status}
                  </Badge>
                )}
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </VStack>

      {/* Avatar for user with professional styling */}
      {isUser && (
        <Box position="relative">
          {/* Glow effect */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="36px"
            h="36px"
            borderRadius="full"
            bg={useSemanticToken('glass.background')}
            filter="blur(6px)"
            opacity={0.5}
          />
          <Avatar
            size="sm"
            name="User"
            bg={useSemanticToken('interactive.surface')}
            color={useSemanticToken('text.primary')}
            icon={<FiUser />}
            position="relative"
            border="2px solid"
            borderColor={useSemanticToken('border.default')}
          />
        </Box>
      )}
    </HStack>
  );
};

/**
 * Grouped Tool Card Component
 * Shows consolidated view of multiple tool calls of the same type
 */
interface GroupedToolCardProps {
  toolGroup: {
    name: string;
    count: number;
    calls: Array<ToolCall>;
  };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const GroupedToolCard: React.FC<GroupedToolCardProps> = ({
  toolGroup,
  index,
  isExpanded,
  onToggle,
}) => {
  const toolCardBg = useSemanticToken('surface.elevated');
  const toolCardBorder = useSemanticToken('border.subtle');
  const mutedColor = useSemanticToken('text.secondary');
  const codeFont = useSemanticToken('text.primary');

  const hasError = toolGroup.calls.some(call => !!call.error);
  const hasResult = toolGroup.calls.some(call => !!call.result);
  const totalDuration = toolGroup.calls.reduce((sum, call) => sum + (call.duration_ms || 0), 0);

  return (
    <Box
      bg={toolCardBg}
      border="1px solid"
      borderColor={toolCardBorder}
      borderRadius="lg"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        borderColor: hasError ? 'red.300' : 'blue.300',
        shadow: 'sm',
      }}
    >
      {/* Tool header - clickable to expand */}
      <Flex
        align="center"
        justify="space-between"
        px={2.5}
        py={1.5}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: useSemanticToken('surface.hover') }}
        transition="background 0.2s"
      >
        <HStack spacing={1.5} flex={1}>
          <Icon
            as={FiTool}
            color={hasError ? 'red.500' : 'blue.500'}
            boxSize={3.5}
          />
          <Text fontSize="sm" fontWeight="medium" color={codeFont}>
            {toolGroup.name}
          </Text>

          {toolGroup.count > 1 && (
            <Badge variant="subtle" colorScheme="blue" fontSize="xs">
              {toolGroup.count}× calls
            </Badge>
          )}

          {totalDuration > 0 && (
            <Badge variant="subtle" colorScheme="gray" fontSize="xs">
              {totalDuration}ms total
            </Badge>
          )}

          {hasError ? (
            <Tooltip label="Some calls failed">
              <WarningIcon color="red.500" boxSize={3} />
            </Tooltip>
          ) : hasResult ? (
            <Tooltip label="All calls successful">
              <CheckCircleIcon color="green.500" boxSize={3} />
            </Tooltip>
          ) : null}
        </HStack>

        <IconButton
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          size="xs"
          variant="ghost"
          onClick={onToggle}
        />
      </Flex>

      {/* Tool details - collapsible, show each individual call */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={2} px={2.5} pb={2.5}>
          <Divider />

          <Text fontSize="xs" fontWeight="semibold" color={mutedColor}>
            {toolGroup.count} {toolGroup.count === 1 ? 'Call' : 'Calls'} Details:
          </Text>

          {toolGroup.calls.map((call, callIndex) => (
            <Box
              key={callIndex}
              p={1.5}
              bg={useSemanticToken('surface.elevated')}
              borderRadius="md"
              borderWidth="1px"
              borderColor={useSemanticToken('border.default')}
            >
              <HStack justify="space-between" mb={1.5}>
                <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                  Call #{callIndex + 1}
                </Badge>
                {call.duration_ms && (
                  <Badge variant="subtle" colorScheme="gray" fontSize="xs">
                    {call.duration_ms}ms
                  </Badge>
                )}
              </HStack>

              {/* Arguments */}
              {call.arguments && Object.keys(call.arguments).length > 0 && (
                <Box mb={1.5}>
                  <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={0.5}>
                    Arguments:
                  </Text>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    fontSize="xs"
                    p={1.5}
                    borderRadius="md"
                    maxH="120px"
                    overflowY="auto"
                  >
                    {JSON.stringify(call.arguments, null, 2)}
                  </Code>
                </Box>
              )}

              {/* Result */}
              {call.result && (
                <Box mb={1.5}>
                  <HStack spacing={1} mb={0.5}>
                    <CheckCircleIcon color="green.500" boxSize={3} />
                    <Text fontSize="xs" fontWeight="semibold" color={mutedColor}>
                      Result:
                    </Text>
                  </HStack>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    fontSize="xs"
                    p={1.5}
                    borderRadius="md"
                    maxH="120px"
                    overflowY="auto"
                  >
                    {call.result}
                  </Code>
                </Box>
              )}

              {/* Error */}
              {call.error && (
                <Box>
                  <HStack spacing={1} mb={0.5}>
                    <WarningIcon color="red.500" boxSize={3} />
                    <Text fontSize="xs" fontWeight="semibold" color="red.500">
                      Error:
                    </Text>
                  </HStack>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    fontSize="xs"
                    p={1.5}
                    borderRadius="md"
                    bg="red.50"
                    color="red.700"
                    borderColor="red.200"
                    borderWidth="1px"
                  >
                    {call.error}
                  </Code>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
};

// Fix for Icon component
import { Icon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
