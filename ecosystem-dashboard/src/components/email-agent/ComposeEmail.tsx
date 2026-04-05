/**
 * Compose Email Component
 * 
 * Full-featured email composition with AI assistance.
 * Supports new emails, replies, and forwards.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Input,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Text,
  useToast,
  Divider,
  Box,
  Tooltip,
  Badge,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
  PaperClipIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { EmailItem } from './EmailList';

interface ComposeEmailProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'reply' | 'forward';
  originalEmail?: EmailItem | null;
  graphragUrl: string;
  onSend?: (email: ComposeData) => Promise<void>;
}

export interface ComposeData {
  to: string;
  cc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}

export const ComposeEmail: React.FC<ComposeEmailProps> = ({
  isOpen,
  onClose,
  mode,
  originalEmail,
  graphragUrl,
  onSend,
}) => {
  const toast = useToast();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Focus parameters for targeted AI replies
  const [showFocusPanel, setShowFocusPanel] = useState(false);
  const [focusTopic, setFocusTopic] = useState('');
  const [focusPerspective, setFocusPerspective] = useState('');
  const [focusPoints, setFocusPoints] = useState<string[]>(['']);
  const [focusAction, setFocusAction] = useState('');

  // Theme tokens
  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const modalSize = useBreakpointValue({ base: 'full', md: 'xl' });

  // Initialize fields based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'reply' && originalEmail) {
      setTo(originalEmail.from_email);
      setSubject(
        originalEmail.subject.startsWith('Re:')
          ? originalEmail.subject
          : `Re: ${originalEmail.subject}`
      );
      setBody(`\n\n---\nOn ${originalEmail.date}, ${originalEmail.from_name || originalEmail.from_email} wrote:\n> ${(originalEmail.snippet || '').split('\n').join('\n> ')}`);
    } else if (mode === 'forward' && originalEmail) {
      setTo('');
      setSubject(
        originalEmail.subject.startsWith('Fwd:')
          ? originalEmail.subject
          : `Fwd: ${originalEmail.subject}`
      );
      setBody(`\n\n---\nForwarded message:\nFrom: ${originalEmail.from_name || originalEmail.from_email}\nDate: ${originalEmail.date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body || originalEmail.snippet || ''}`);
    } else {
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
    }
  }, [isOpen, mode, originalEmail]);

  // Helper functions for focus points
  const addFocusPoint = () => {
    setFocusPoints([...focusPoints, '']);
  };

  const updateFocusPoint = (index: number, value: string) => {
    const updated = [...focusPoints];
    updated[index] = value;
    setFocusPoints(updated);
  };

  const removeFocusPoint = (index: number) => {
    if (focusPoints.length > 1) {
      setFocusPoints(focusPoints.filter((_, i) => i !== index));
    }
  };

  const hasFocusParams = focusTopic || focusPerspective || focusPoints.some(p => p.trim()) || focusAction;

  // Generate AI reply
  const generateAIReply = async () => {
    if (!originalEmail) {
      toast({
        title: 'No original email',
        description: 'AI reply requires an original email to respond to',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setGeneratingAI(true);
    try {
      // Build request with focus parameters if provided
      const requestBody: Record<string, unknown> = {
        email_id: originalEmail.id,
      };

      // Add focus parameters if any are set
      if (focusTopic.trim()) {
        requestBody.focus_topic = focusTopic.trim();
      }
      if (focusPerspective.trim()) {
        requestBody.focus_perspective = focusPerspective.trim();
      }
      const validPoints = focusPoints.filter(p => p.trim());
      if (validPoints.length > 0) {
        requestBody.focus_points = validPoints;
      }
      if (focusAction.trim()) {
        requestBody.focus_action = focusAction.trim();
      }

      // Use v2 endpoint for enhanced generation with focus support
      const response = await fetch(`${graphragUrl}/v2/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedBody = data.draft?.body || data.reply || '';
        setBody(generatedBody + body); // Prepend AI reply, keep quoted text
        toast({
          title: hasFocusParams ? 'Focused AI Reply Generated' : 'AI Reply Generated',
          description: hasFocusParams 
            ? 'Reply focused on your perspective - review before sending'
            : 'Review and edit before sending',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error('Failed to generate reply');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'AI Generation Failed',
        description: 'Could not generate AI reply',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Send email via Mac Agent
  const handleSend = async () => {
    if (!to.trim()) {
      toast({
        title: 'Missing recipient',
        description: 'Please enter a recipient email address',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSending(true);
    try {
      if (onSend) {
        await onSend({
          to,
          cc,
          subject,
          body,
          inReplyTo: originalEmail?.id,
        });
      } else {
        // Default: send via Mac Agent
        const response = await fetch(`${graphragUrl}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: to.split(',').map(e => e.trim()),
            cc: cc ? cc.split(',').map(e => e.trim()) : [],
            subject,
            body,
            in_reply_to: originalEmail?.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send email');
        }
      }

      toast({
        title: 'Email Sent',
        description: `Message sent to ${to}`,
        status: 'success',
        duration: 3000,
      });
      onClose();
    } catch (error) {
      console.error('Send error:', error);
      toast({
        title: 'Send Failed',
        description: 'Could not send email. Check Mac Agent connection.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  // Copy to clipboard (fallback for manual send)
  const copyToClipboard = async () => {
    const emailText = `To: ${to}\nCc: ${cc}\nSubject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(emailText);
    toast({
      title: 'Copied to Clipboard',
      description: 'Paste into Apple Mail to send',
      status: 'info',
      duration: 3000,
    });
  };

  const getTitle = () => {
    switch (mode) {
      case 'reply':
        return 'Reply';
      case 'forward':
        return 'Forward';
      default:
        return 'New Email';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={modalSize} 
      scrollBehavior="inside"
      motionPreset={isMobile ? 'slideInBottom' : 'scale'}
    >
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent 
        bg={bgColor} 
        maxW={{ base: '100%', md: '700px' }}
        m={{ base: 0, md: 4 }}
        borderRadius={{ base: 0, md: 'lg' }}
        h={{ base: '100vh', md: 'auto' }}
        maxH={{ base: '100vh', md: '90vh' }}
      >
        <ModalHeader py={{ base: 3, md: 4 }}>
          <HStack>
            <Text fontSize={{ base: 'md', md: 'lg' }}>{getTitle()}</Text>
            {mode !== 'new' && !isMobile && (
              <Badge colorScheme="blue" fontSize="xs">
                {originalEmail?.subject?.slice(0, 30)}...
              </Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* To field */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                To
              </FormLabel>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                size="sm"
              />
            </FormControl>

            {/* CC field */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Cc
              </FormLabel>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com (optional)"
                size="sm"
              />
            </FormControl>

            {/* Subject field */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Subject
              </FormLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                size="sm"
              />
            </FormControl>

            <Divider />

            {/* AI Actions */}
            {mode === 'reply' && (
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <HStack>
                    <Button
                      leftIcon={<SparklesIcon style={{ width: 16, height: 16 }} />}
                      size="sm"
                      colorScheme="purple"
                      variant={hasFocusParams ? 'solid' : 'outline'}
                      onClick={generateAIReply}
                      isLoading={generatingAI}
                      loadingText="Generating..."
                    >
                      {hasFocusParams ? 'Generate Focused Reply' : 'Generate AI Reply'}
                    </Button>
                    {hasFocusParams && (
                      <Badge colorScheme="purple" fontSize="xs">
                        Focused
                      </Badge>
                    )}
                  </HStack>
                  <Button
                    leftIcon={<LightBulbIcon style={{ width: 14, height: 14 }} />}
                    rightIcon={showFocusPanel 
                      ? <ChevronUpIcon style={{ width: 14, height: 14 }} />
                      : <ChevronDownIcon style={{ width: 14, height: 14 }} />
                    }
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowFocusPanel(!showFocusPanel)}
                  >
                    Focus Your Reply
                  </Button>
                </HStack>

                {/* Focus Panel - Collapsible */}
                {showFocusPanel && (
                  <Box
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                    bg="whiteAlpha.50"
                  >
                    <VStack align="stretch" spacing={3}>
                      <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                        Guide the AI to focus on your specific perspective and ideas
                      </Text>

                      {/* Focus Topic */}
                      <FormControl>
                        <FormLabel fontSize="xs" color={textSecondary}>
                          📌 Main Topic/Idea
                        </FormLabel>
                        <Input
                          value={focusTopic}
                          onChange={(e) => setFocusTopic(e.target.value)}
                          placeholder="e.g., Auto-ordering mammograms and physician attribution"
                          size="sm"
                        />
                      </FormControl>

                      {/* Focus Perspective */}
                      <FormControl>
                        <FormLabel fontSize="xs" color={textSecondary}>
                          🎯 Your Perspective/Stance
                        </FormLabel>
                        <Textarea
                          value={focusPerspective}
                          onChange={(e) => setFocusPerspective(e.target.value)}
                          placeholder="e.g., I support this initiative but have concerns about..."
                          size="sm"
                          rows={2}
                        />
                      </FormControl>

                      {/* Focus Points */}
                      <FormControl>
                        <FormLabel fontSize="xs" color={textSecondary}>
                          📋 Key Points to Make
                        </FormLabel>
                        <VStack align="stretch" spacing={1}>
                          {focusPoints.map((point, index) => (
                            <HStack key={index}>
                              <Input
                                value={point}
                                onChange={(e) => updateFocusPoint(index, e.target.value)}
                                placeholder={`Point ${index + 1}...`}
                                size="sm"
                              />
                              {focusPoints.length > 1 && (
                                <IconButton
                                  aria-label="Remove point"
                                  icon={<XMarkIcon style={{ width: 14, height: 14 }} />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => removeFocusPoint(index)}
                                />
                              )}
                            </HStack>
                          ))}
                          <Button
                            leftIcon={<PlusIcon style={{ width: 12, height: 12 }} />}
                            size="xs"
                            variant="ghost"
                            onClick={addFocusPoint}
                          >
                            Add Point
                          </Button>
                        </VStack>
                      </FormControl>

                      {/* Focus Action */}
                      <FormControl>
                        <FormLabel fontSize="xs" color={textSecondary}>
                          🎬 Desired Outcome
                        </FormLabel>
                        <Input
                          value={focusAction}
                          onChange={(e) => setFocusAction(e.target.value)}
                          placeholder="e.g., Propose a pilot program before full rollout"
                          size="sm"
                        />
                      </FormControl>
                    </VStack>
                  </Box>
                )}
              </VStack>
            )}

            {/* Body field */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Message
              </FormLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                minH="250px"
                size="sm"
                fontFamily="inherit"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2} w="full" justify="space-between">
            <HStack>
              <Tooltip label="Attach file (coming soon)">
                <IconButton
                  aria-label="Attach"
                  icon={<PaperClipIcon style={{ width: 18, height: 18 }} />}
                  size="sm"
                  variant="ghost"
                  isDisabled
                />
              </Tooltip>
              <Tooltip label="Copy to clipboard">
                <IconButton
                  aria-label="Copy"
                  icon={<DocumentDuplicateIcon style={{ width: 18, height: 18 }} />}
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                />
              </Tooltip>
            </HStack>

            <HStack>
              <Button variant="ghost" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button
                leftIcon={<PaperAirplaneIcon style={{ width: 16, height: 16 }} />}
                colorScheme="blue"
                onClick={handleSend}
                isLoading={sending}
                loadingText="Sending..."
                size="sm"
              >
                Send
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ComposeEmail;
