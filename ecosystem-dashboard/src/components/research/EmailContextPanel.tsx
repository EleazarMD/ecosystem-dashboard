/**
 * EmailContextPanel Component
 * 
 * Displays pre-loaded email context in the AI Research Studio when
 * researching from an email. Shows sender info, thread history,
 * AI analysis, and suggested research queries.
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Avatar,
  Divider,
  Icon,
  Collapse,
  IconButton,
  Tooltip,
  Wrap,
  WrapItem,
  Button,
  Skeleton,
  SkeletonText,
} from '@chakra-ui/react';
import {
  FiMail,
  FiUser,
  FiUsers,
  FiClock,
  FiMessageSquare,
  FiChevronDown,
  FiChevronUp,
  FiZap,
  FiTarget,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { EmailResearchContext } from '@/hooks/useEmailResearchContext';

interface EmailContextPanelProps {
  context: EmailResearchContext;
  onQuerySelect?: (query: string) => void;
  onClose?: () => void;
  isCollapsible?: boolean;
}

export function EmailContextPanel({
  context,
  onQuerySelect,
  onClose,
  isCollapsible = true,
}: EmailContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullThread, setShowFullThread] = useState(false);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textMuted = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  const { email, intelligence, senderReputation, threadContext, isLoading, suggestedQueries } = context;

  if (isLoading) {
    return (
      <Box
        bg={bgColor}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        p={4}
        mb={4}
      >
        <HStack spacing={3} mb={4}>
          <Skeleton boxSize={10} borderRadius="full" />
          <VStack align="start" spacing={1} flex={1}>
            <Skeleton height="16px" width="200px" />
            <Skeleton height="12px" width="150px" />
          </VStack>
        </HStack>
        <SkeletonText noOfLines={3} spacing={2} />
      </Box>
    );
  }

  if (!email) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'green';
      case 'negative': return 'red';
      default: return 'gray';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'gray';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'trusted': return 'green';
      case 'known': return 'blue';
      case 'neutral': return 'gray';
      case 'low': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      mb={4}
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        borderBottom={isExpanded ? '1px solid' : 'none'}
        borderColor={borderColor}
        justify="space-between"
        cursor={isCollapsible ? 'pointer' : 'default'}
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
        _hover={isCollapsible ? { bg: useSemanticToken('surface.hover') } : {}}
      >
        <HStack spacing={3}>
          <Icon as={FiMail} color={accentColor} boxSize={5} />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="600" color={textPrimary}>
              Email Context
            </Text>
            <Text fontSize="xs" color={textMuted} noOfLines={1} maxW="300px">
              {email.subject}
            </Text>
          </VStack>
        </HStack>
        <HStack spacing={2}>
          {intelligence && (
            <Badge colorScheme={getSentimentColor(intelligence.sentiment)} fontSize="xs">
              {intelligence.sentiment}
            </Badge>
          )}
          {isCollapsible && (
            <Icon
              as={isExpanded ? FiChevronUp : FiChevronDown}
              color={textMuted}
              boxSize={4}
            />
          )}
          {onClose && (
            <Tooltip label="Close context panel">
              <IconButton
                aria-label="Close"
                icon={<FiX />}
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      <Collapse in={isExpanded}>
        <VStack align="stretch" spacing={0} divider={<Divider />}>
          {/* Sender Info */}
          <Box px={4} py={3}>
            <HStack spacing={3} mb={3}>
              <Avatar
                size="sm"
                name={email.from_name || email.from_email}
                bg="blue.500"
              />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                  {email.from_name || email.from_email}
                </Text>
                <Text fontSize="xs" color={textMuted}>
                  {email.from_email}
                </Text>
              </VStack>
              {senderReputation && (
                <VStack align="end" spacing={0}>
                  <Badge colorScheme={getTierColor(senderReputation.tier)} fontSize="xs">
                    {senderReputation.tier}
                  </Badge>
                  <Text fontSize="xs" color={textMuted}>
                    {senderReputation.emails_received} emails
                  </Text>
                </VStack>
              )}
            </HStack>

            <HStack spacing={4} fontSize="xs" color={textMuted}>
              <HStack spacing={1}>
                <Icon as={FiClock} boxSize={3} />
                <Text>{formatDate(email.date)}</Text>
              </HStack>
              {email.to_addrs && email.to_addrs.length > 0 && (
                <HStack spacing={1}>
                  <Icon as={FiUsers} boxSize={3} />
                  <Text>{email.to_addrs.length + (email.cc_addrs?.length || 0)} recipients</Text>
                </HStack>
              )}
            </HStack>
          </Box>

          {/* AI Analysis */}
          {intelligence && (
            <Box px={4} py={3}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiZap} color="purple.500" boxSize={4} />
                <Text fontSize="xs" fontWeight="600" color={textMuted} textTransform="uppercase">
                  AI Analysis
                </Text>
              </HStack>

              {intelligence.summary && (
                <Text fontSize="sm" color={textPrimary} mb={2}>
                  {intelligence.summary}
                </Text>
              )}

              <Wrap spacing={2} mb={2}>
                <WrapItem>
                  <Badge colorScheme="purple" fontSize="xs">
                    {intelligence.category}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme={getUrgencyColor(intelligence.urgency)} fontSize="xs">
                    {intelligence.urgency} urgency
                  </Badge>
                </WrapItem>
                {intelligence.requires_response && (
                  <WrapItem>
                    <Badge colorScheme="orange" fontSize="xs">
                      Response needed
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>

              {intelligence.topics.length > 0 && (
                <HStack spacing={1} flexWrap="wrap">
                  <Text fontSize="xs" color={textMuted}>Topics:</Text>
                  {intelligence.topics.slice(0, 5).map((topic, i) => (
                    <Badge key={i} variant="outline" colorScheme="gray" fontSize="xs">
                      {topic}
                    </Badge>
                  ))}
                </HStack>
              )}

              {intelligence.key_entities.length > 0 && (
                <HStack spacing={1} flexWrap="wrap" mt={1}>
                  <Text fontSize="xs" color={textMuted}>Entities:</Text>
                  {intelligence.key_entities.slice(0, 5).map((entity, i) => (
                    <Badge key={i} variant="subtle" colorScheme="blue" fontSize="xs">
                      {entity.type}: {entity.value}
                    </Badge>
                  ))}
                </HStack>
              )}
            </Box>
          )}

          {/* Thread Context */}
          {threadContext && threadContext.email_count > 1 && (
            <Box px={4} py={3}>
              <HStack
                spacing={2}
                mb={2}
                cursor="pointer"
                onClick={() => setShowFullThread(!showFullThread)}
              >
                <Icon as={FiMessageSquare} color="green.500" boxSize={4} />
                <Text fontSize="xs" fontWeight="600" color={textMuted} textTransform="uppercase">
                  Thread ({threadContext.email_count} emails)
                </Text>
                <Icon
                  as={showFullThread ? FiChevronUp : FiChevronDown}
                  color={textMuted}
                  boxSize={3}
                />
              </HStack>

              <Text fontSize="xs" color={textMuted} mb={2}>
                Participants: {threadContext.participants.slice(0, 5).join(', ')}
                {threadContext.participants.length > 5 && ` +${threadContext.participants.length - 5} more`}
              </Text>

              <Collapse in={showFullThread}>
                <VStack align="stretch" spacing={2} mt={2}>
                  {threadContext.emails?.slice(0, 5).map((threadEmail, i) => (
                    <HStack
                      key={threadEmail.id}
                      p={2}
                      bg={useSemanticToken('surface.base')}
                      borderRadius="md"
                      fontSize="xs"
                    >
                      <Avatar size="xs" name={threadEmail.from_name || threadEmail.from_email} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="500" color={textPrimary} noOfLines={1}>
                          {threadEmail.subject}
                        </Text>
                        <Text color={textMuted}>
                          {threadEmail.from_name || threadEmail.from_email} • {formatDate(threadEmail.date)}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}

          {/* Suggested Queries */}
          {suggestedQueries.length > 0 && onQuerySelect && (
            <Box px={4} py={3}>
              <HStack spacing={2} mb={2}>
                <Icon as={FiTarget} color="orange.500" boxSize={4} />
                <Text fontSize="xs" fontWeight="600" color={textMuted} textTransform="uppercase">
                  Suggested Research Questions
                </Text>
              </HStack>

              <VStack align="stretch" spacing={2}>
                {suggestedQueries.slice(0, 4).map((query, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    justifyContent="flex-start"
                    fontWeight="normal"
                    fontSize="xs"
                    h="auto"
                    py={2}
                    px={3}
                    whiteSpace="normal"
                    textAlign="left"
                    onClick={() => onQuerySelect(query)}
                  >
                    {query}
                  </Button>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
}

export default EmailContextPanel;
