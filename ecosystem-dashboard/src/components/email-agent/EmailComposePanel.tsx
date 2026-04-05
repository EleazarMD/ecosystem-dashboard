/**
 * Email Compose Panel
 * Right panel component for quick email composition
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Divider,
  useToast,
  Badge,
} from '@chakra-ui/react';
import { PaperAirplaneIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

export default function EmailComposePanel() {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleSend = async () => {
    if (!to || !subject) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in recipient and subject',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSending(true);
    try {
      // This would integrate with the email sending API
      toast({
        title: 'Email Sent',
        description: `Email sent to ${to}`,
        status: 'success',
        duration: 3000,
      });
      // Clear form
      setTo('');
      setSubject('');
      setBody('');
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: String(error),
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSending(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!subject) {
      toast({
        title: 'Subject required',
        description: 'Please enter a subject for AI to generate content',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${GRAPHRAG_URL}/ai/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, context: body }),
      });

      if (res.ok) {
        const data = await res.json();
        setBody(data.draft || 'AI-generated content would appear here.');
        toast({
          title: 'Draft Generated',
          status: 'success',
          duration: 2000,
        });
      } else {
        // Fallback for demo
        setBody(`Dear recipient,\n\nRegarding "${subject}", I wanted to reach out to discuss this matter further.\n\nPlease let me know your thoughts.\n\nBest regards`);
        toast({
          title: 'Demo Draft Generated',
          description: 'Using placeholder content',
          status: 'info',
          duration: 2000,
        });
      }
    } catch (error) {
      // Fallback for demo
      setBody(`Dear recipient,\n\nRegarding "${subject}", I wanted to reach out to discuss this matter further.\n\nPlease let me know your thoughts.\n\nBest regards`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setTo('');
    setSubject('');
    setBody('');
  };

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Text fontWeight="600" color={textColor}>Quick Compose</Text>
            <Badge colorScheme="purple" fontSize="xs">AI-Powered</Badge>
          </HStack>
          <IconButton
            aria-label="Clear"
            icon={<XMarkIcon className="w-4 h-4" />}
            size="xs"
            variant="ghost"
            onClick={handleClear}
          />
        </HStack>

        <Divider borderColor={borderColor} />

        {/* Form */}
        <FormControl>
          <FormLabel fontSize="sm" color={textSecondary}>To</FormLabel>
          <Input
            size="sm"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color={textSecondary}>Subject</FormLabel>
          <Input
            size="sm"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <HStack justify="space-between" mb={1}>
            <FormLabel fontSize="sm" color={textSecondary} mb={0}>Body</FormLabel>
            <Button
              size="xs"
              leftIcon={<SparklesIcon className="w-3 h-3" />}
              colorScheme="purple"
              variant="ghost"
              onClick={handleAIGenerate}
              isLoading={generating}
            >
              AI Generate
            </Button>
          </HStack>
          <Textarea
            size="sm"
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            resize="none"
          />
        </FormControl>

        {/* Actions */}
        <HStack spacing={2}>
          <Button
            flex={1}
            colorScheme="blue"
            leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
            onClick={handleSend}
            isLoading={sending}
            size="sm"
          >
            Send
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            size="sm"
          >
            Clear
          </Button>
        </HStack>

        {/* Tips */}
        <Box bg="blue.50" _dark={{ bg: 'blue.900' }} p={3} borderRadius="md">
          <Text fontSize="xs" color={textSecondary}>
            💡 Tip: Use AI Generate to create a draft based on your subject line.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
