import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Text,
  Badge,
  Select,
  Icon,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
} from '@chakra-ui/react';
import { FiArrowRight, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface A2AMessage {
  id: string;
  timestamp: Date;
  sender: string;
  receiver: string;
  type: string;
  status: 'success' | 'failed' | 'pending';
  latency?: number;
  payload?: any;
  error?: string;
}

export default function A2AMessageStream() {
  const [messages, setMessages] = useState<A2AMessage[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const borderColor = useSemanticToken('border.default');
  const scrollbarThumb = useSemanticToken('border.default');
  const expandedBg = useSemanticToken('interactive.surfaceHover');
  const hoverBg = useSemanticToken('surface.hover');
  const panelBg = useSemanticToken('surface.base');

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/a2a/messages?limit=50');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            setMessages(data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch A2A messages:', error);
      }
    };

    fetchMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);

    // TODO: Replace with WebSocket connection for true real-time
    // const ws = new WebSocket('ws://localhost:8765/a2a/stream');
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.type === 'message') {
    //     setMessages(prev => [data.data, ...prev].slice(0, 50));
    //   }
    // };

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    if (filter === 'success') return msg.status === 'success';
    if (filter === 'failed') return msg.status === 'failed';
    return msg.sender === filter || msg.receiver === filter;
  });

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <Icon as={FiCheckCircle} color="green.500" />;
      case 'failed':
        return <Icon as={FiXCircle} color="red.500" />;
      default:
        return <Icon as={FiClock} color="yellow.500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <Box h="100%">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Live Message Stream</Heading>
        <HStack>
          <Badge colorScheme="purple">{filteredMessages.length} messages</Badge>
          <Select
            size="sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            w="180px"
          >
            <option value="all">All Messages</option>
            <option value="success">✓ Success Only</option>
            <option value="failed">✗ Failed Only</option>
          </Select>
        </HStack>
      </HStack>

      <Box
        h="calc(100% - 60px)"
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: scrollbarThumb,
            borderRadius: '4px'
          },
        }}
      >
        <Accordion allowMultiple>
          {filteredMessages.map((msg) => (
            <AccordionItem key={msg.id} border="none" mb={2}>
              <AccordionButton
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                _expanded={{ bg: expandedBg }}
                _hover={{ bg: hoverBg }}
              >
                <HStack flex={1} spacing={3}>
                  <StatusIcon status={msg.status} />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} minW="60px">
                    {formatTimeAgo(msg.timestamp)}
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {msg.sender}
                  </Text>
                  <Icon as={FiArrowRight} color={useSemanticToken('text.tertiary')} />
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {msg.receiver}
                  </Text>
                  <Badge colorScheme="blue" variant="subtle" ml="auto">
                    {msg.type}
                  </Badge>
                  {msg.latency && (
                    <Badge colorScheme="gray" variant="outline">
                      {msg.latency}ms
                    </Badge>
                  )}
                </HStack>
                <AccordionIcon />
              </AccordionButton>

              <AccordionPanel pb={4} pt={4} borderRadius="md" bg={panelBg}>
                <VStack align="start" spacing={3}>
                  <HStack w="full">
                    <Text fontSize="sm" fontWeight="bold" minW="100px">Timestamp:</Text>
                    <Text fontSize="sm">{msg.timestamp.toISOString()}</Text>
                  </HStack>

                  <HStack w="full">
                    <Text fontSize="sm" fontWeight="bold" minW="100px">Message ID:</Text>
                    <Code fontSize="xs">{msg.id}</Code>
                  </HStack>

                  <HStack w="full">
                    <Text fontSize="sm" fontWeight="bold" minW="100px">Status:</Text>
                    <Badge colorScheme={msg.status === 'success' ? 'green' : 'red'}>
                      {msg.status.toUpperCase()}
                    </Badge>
                  </HStack>

                  {msg.payload && (
                    <>
                      <Divider />
                      <Text fontSize="sm" fontWeight="bold">Payload:</Text>
                      <Code
                        w="full"
                        p={3}
                        borderRadius="md"
                        fontSize="xs"
                        whiteSpace="pre-wrap"
                      >
                        {JSON.stringify(msg.payload, null, 2)}
                      </Code>
                    </>
                  )}

                  {msg.error && (
                    <>
                      <Divider />
                      <Text fontSize="sm" fontWeight="bold" color="red.500">Error:</Text>
                      <Text fontSize="sm" color="red.500">{msg.error}</Text>
                    </>
                  )}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
}
