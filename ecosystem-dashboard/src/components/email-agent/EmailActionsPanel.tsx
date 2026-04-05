/**
 * Email Actions Panel
 * Context-aware right panel that shows when an email is selected.
 * Provides actions for attachments, Workspace AI integration, and email management.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Badge,
  Divider,
  Spinner,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Progress,
  Collapse,
  useToast,
  Icon,
  Select,
  Textarea,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  Switch,
  Input,
} from '@chakra-ui/react';
import {
  PaperClipIcon,
  DocumentTextIcon,
  SparklesIcon,
  FolderPlusIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import type { EmailItem, EmailAttachment } from './EmailList';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

// Email type detection
type EmailType = 'incoming' | 'outgoing' | 'ai-draft' | 'none';

// AI Reply settings interface
export interface AIReplySettings {
  tone: string;
  focusPoint: string;
  specialInstructions: string;
  maxTokens: number;
  useSystemPrompt: boolean;
  systemPrompt: string;
}

interface EmailActionsPanelProps {
  // Props can be passed directly or via customData from RightPanelContext
  email?: EmailItem | null;
  onRefresh?: () => void;
  onGenerateReply?: (settings: AIReplySettings) => void;
}

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Get icon for file type
const getFileIcon = (contentType: string): string => {
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
  if (contentType.includes('word') || contentType.includes('document')) return '📝';
  if (contentType.includes('zip') || contentType.includes('archive')) return '📦';
  return '📎';
};

// Default settings by email type
const getDefaultSettings = (emailType: EmailType): AIReplySettings => {
  switch (emailType) {
    case 'incoming':
      return {
        tone: 'professional',
        focusPoint: '',
        specialInstructions: '',
        maxTokens: 500,
        useSystemPrompt: false,
        systemPrompt: '',
      };
    case 'outgoing':
      return {
        tone: 'friendly',
        focusPoint: 'follow-up',
        specialInstructions: 'This is a follow-up to my previous email.',
        maxTokens: 300,
        useSystemPrompt: false,
        systemPrompt: '',
      };
    case 'ai-draft':
      return {
        tone: 'professional',
        focusPoint: 'refinement',
        specialInstructions: 'Refine and improve this draft.',
        maxTokens: 600,
        useSystemPrompt: true,
        systemPrompt: 'You are refining an AI-generated draft. Maintain the original intent while improving clarity and tone.',
      };
    default:
      return {
        tone: 'professional',
        focusPoint: '',
        specialInstructions: '',
        maxTokens: 500,
        useSystemPrompt: false,
        systemPrompt: '',
      };
  }
};

export const EmailActionsPanel: React.FC<EmailActionsPanelProps> = ({
  email,
  onRefresh,
  onGenerateReply,
}) => {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.subtle');
  const surfaceBg = useSemanticToken('surface.raised');

  // Determine email type
  const getEmailType = (): EmailType => {
    if (!email) return 'none';
    if (email.is_ai_draft) return 'ai-draft';
    if (email.is_sent) return 'outgoing';
    return 'incoming';
  };

  const emailType = getEmailType();

  // State
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    replySettings: true,
    attachments: false,
    actions: false,
    insights: true,
  });

  // AI Reply Settings state
  const [replySettings, setReplySettings] = useState<AIReplySettings>(() => 
    getDefaultSettings(emailType)
  );

  // Update settings when email type changes
  useEffect(() => {
    setReplySettings(getDefaultSettings(emailType));
  }, [emailType, email?.id]);

  // Fetch attachments when email changes
  useEffect(() => {
    if (email?.id) {
      fetchAttachments();
    } else {
      setAttachments([]);
    }
  }, [email?.id]);

  const fetchAttachments = async () => {
    if (!email) return;
    setLoadingAttachments(true);
    try {
      const res = await fetch(`${GRAPHRAG_URL}/emails/${encodeURIComponent(email.id)}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const analyzeAttachment = async (attachment: EmailAttachment) => {
    if (!email?.source_path) {
      toast({
        title: 'Cannot analyze',
        description: 'Email source path not available',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setAnalyzingId(attachment.filename);
    try {
      // Step 1: Retrieve attachment from Mac
      const retrieveRes = await fetch(`${GRAPHRAG_URL}/attachments/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emlx_path: email.source_path,
          filename: attachment.filename,
        }),
      });

      if (!retrieveRes.ok) {
        throw new Error('Failed to retrieve attachment');
      }

      const attachmentData = await retrieveRes.json();

      // Step 2: Analyze with AI
      const analyzeRes = await fetch(`${GRAPHRAG_URL}/analyze/attachment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: attachment.filename,
          content_type: attachment.content_type,
          data: attachmentData.data,
          context: `Email subject: ${email.subject}\nFrom: ${email.from_email}`,
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error('Analysis failed');
      }

      const analysis = await analyzeRes.json();

      toast({
        title: 'Analysis Complete',
        description: analysis.analysis?.description?.slice(0, 100) + '...',
        status: 'success',
        duration: 5000,
      });

      // Update local state
      setAttachments(prev =>
        prev.map(a =>
          a.filename === attachment.filename
            ? { ...a, analyzed: true, description: analysis.analysis?.description }
            : a
        )
      );
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: String(error),
        status: 'error',
        duration: 3000,
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const saveToWorkspace = async (attachment: EmailAttachment) => {
    if (!email) return;

    try {
      // This will call the new bridge API (to be implemented)
      const res = await fetch('/api/email-graphrag/attachment-to-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: email.id,
          attachment_filename: attachment.filename,
          email_subject: email.subject,
          email_from: email.from_email,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Saved to Workspace',
          description: `Created page: ${data.page_title}`,
          status: 'success',
          duration: 4000,
        });

        // Update attachment with workspace page ID
        setAttachments(prev =>
          prev.map(a =>
            a.filename === attachment.filename
              ? { ...a, workspace_page_id: data.page_id }
              : a
          )
        );
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: String(error),
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!email) {
    return (
      <Box p={4} h="full">
        <VStack spacing={4} align="center" justify="center" h="200px">
          <Icon as={ChatBubbleLeftRightIcon} boxSize={12} color={textTertiary} />
          <Text color={textSecondary} textAlign="center">
            Select an email to see actions
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Email Quick Info */}
        <Box>
          <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={2}>
            {email.subject || '(No Subject)'}
          </Text>
          <Text fontSize="xs" color={textSecondary} mt={1}>
            From: {email.from_name || email.from_email}
          </Text>
          <HStack mt={2} spacing={2} flexWrap="wrap">
            {email.category && (
              <Badge size="sm" colorScheme="blue" variant="subtle">
                {email.category}
              </Badge>
            )}
            {email.sentiment && (
              <Badge
                size="sm"
                colorScheme={
                  email.sentiment === 'positive' ? 'green' :
                  email.sentiment === 'negative' ? 'red' : 'gray'
                }
                variant="subtle"
              >
                {email.sentiment}
              </Badge>
            )}
            {email.priority === 'high' && (
              <Badge size="sm" colorScheme="red" variant="solid">
                High Priority
              </Badge>
            )}
          </HStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* AI Reply Settings Section */}
        <Box>
          <HStack
            justify="space-between"
            cursor="pointer"
            onClick={() => toggleSection('replySettings')}
            py={1}
          >
            <HStack>
              <Icon as={AdjustmentsHorizontalIcon} boxSize={4} color="purple.500" />
              <Text fontWeight="600" color={textColor} fontSize="sm">
                AI Reply Settings
              </Text>
              <Badge size="sm" colorScheme={
                emailType === 'incoming' ? 'green' :
                emailType === 'outgoing' ? 'blue' :
                emailType === 'ai-draft' ? 'purple' : 'gray'
              }>
                {emailType === 'incoming' ? 'Reply' :
                 emailType === 'outgoing' ? 'Follow-up' :
                 emailType === 'ai-draft' ? 'Refine' : 'New'}
              </Badge>
            </HStack>
            <Icon
              as={expandedSections.replySettings ? ChevronUpIcon : ChevronDownIcon}
              boxSize={4}
              color={textSecondary}
            />
          </HStack>

          <Collapse in={expandedSections.replySettings}>
            <VStack align="stretch" spacing={3} mt={3}>
              {/* Email Type Indicator */}
              <HStack
                p={2}
                bg={emailType === 'incoming' ? 'green.50' : emailType === 'outgoing' ? 'blue.50' : 'purple.50'}
                borderRadius="md"
                border="1px solid"
                borderColor={emailType === 'incoming' ? 'green.200' : emailType === 'outgoing' ? 'blue.200' : 'purple.200'}
              >
                <Icon 
                  as={emailType === 'incoming' ? EnvelopeIcon : emailType === 'outgoing' ? EnvelopeOpenIcon : PencilSquareIcon} 
                  boxSize={4} 
                  color={emailType === 'incoming' ? 'green.500' : emailType === 'outgoing' ? 'blue.500' : 'purple.500'} 
                />
                <Text fontSize="xs" color={emailType === 'incoming' ? 'green.700' : emailType === 'outgoing' ? 'blue.700' : 'purple.700'} fontWeight="500">
                  {emailType === 'incoming' ? 'Incoming email - Generate reply' :
                   emailType === 'outgoing' ? 'Sent email - Generate follow-up' :
                   'AI Draft - Refine and improve'}
                </Text>
              </HStack>

              {/* Tone Selection */}
              <FormControl size="sm">
                <FormLabel fontSize="xs" color={textSecondary} mb={1}>Tone</FormLabel>
                <Select
                  size="sm"
                  value={replySettings.tone}
                  onChange={(e) => setReplySettings(prev => ({ ...prev, tone: e.target.value }))}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="empathetic">Empathetic</option>
                </Select>
              </FormControl>

              {/* Focus Point */}
              <FormControl size="sm">
                <FormLabel fontSize="xs" color={textSecondary} mb={1}>Focus Point</FormLabel>
                <Input
                  size="sm"
                  placeholder={emailType === 'outgoing' ? 'e.g., follow-up on proposal' : 'e.g., address their concerns'}
                  value={replySettings.focusPoint}
                  onChange={(e) => setReplySettings(prev => ({ ...prev, focusPoint: e.target.value }))}
                />
              </FormControl>

              {/* Special Instructions */}
              <FormControl size="sm">
                <FormLabel fontSize="xs" color={textSecondary} mb={1}>Special Instructions</FormLabel>
                <Textarea
                  size="sm"
                  rows={2}
                  placeholder="Any specific points to include or avoid..."
                  value={replySettings.specialInstructions}
                  onChange={(e) => setReplySettings(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  fontSize="sm"
                />
              </FormControl>

              {/* Max Tokens Slider */}
              <FormControl size="sm">
                <HStack justify="space-between" mb={1}>
                  <FormLabel fontSize="xs" color={textSecondary} mb={0}>Max Length</FormLabel>
                  <Text fontSize="xs" color={textTertiary}>{replySettings.maxTokens} tokens</Text>
                </HStack>
                <Slider
                  value={replySettings.maxTokens}
                  onChange={(val) => setReplySettings(prev => ({ ...prev, maxTokens: val }))}
                  min={100}
                  max={1000}
                  step={50}
                  colorScheme="purple"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              {/* System Prompt Toggle */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="xs" color={textSecondary}>
                  Custom System Prompt
                </FormLabel>
                <Switch
                  size="sm"
                  isChecked={replySettings.useSystemPrompt}
                  onChange={(e) => setReplySettings(prev => ({ ...prev, useSystemPrompt: e.target.checked }))}
                  colorScheme="purple"
                />
              </FormControl>

              {/* System Prompt Textarea */}
              <Collapse in={replySettings.useSystemPrompt}>
                <Textarea
                  size="sm"
                  rows={3}
                  placeholder="Enter custom instructions for AI behavior..."
                  value={replySettings.systemPrompt}
                  onChange={(e) => setReplySettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  fontSize="sm"
                />
              </Collapse>

              {/* Generate Button */}
              <Button
                size="sm"
                colorScheme="purple"
                leftIcon={<Icon as={SparklesIcon} boxSize={4} />}
                onClick={() => onGenerateReply?.(replySettings)}
                w="full"
              >
                {emailType === 'incoming' ? 'Generate AI Reply' :
                 emailType === 'outgoing' ? 'Generate Follow-up' :
                 'Refine Draft'}
              </Button>
            </VStack>
          </Collapse>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Attachments Section */}
        <Box>
          <HStack
            justify="space-between"
            cursor="pointer"
            onClick={() => toggleSection('attachments')}
            py={1}
          >
            <HStack>
              <Icon as={PaperClipIcon} boxSize={4} color={textSecondary} />
              <Text fontWeight="600" color={textColor} fontSize="sm">
                Attachments
              </Text>
              <Badge size="sm" colorScheme="gray">
                {attachments.length}
              </Badge>
            </HStack>
            <Icon
              as={expandedSections.attachments ? ChevronUpIcon : ChevronDownIcon}
              boxSize={4}
              color={textSecondary}
            />
          </HStack>

          <Collapse in={expandedSections.attachments}>
            <VStack align="stretch" spacing={2} mt={2}>
              {loadingAttachments ? (
                <HStack justify="center" py={4}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color={textSecondary}>Loading...</Text>
                </HStack>
              ) : attachments.length === 0 ? (
                <Text fontSize="sm" color={textTertiary} py={2}>
                  No attachments
                </Text>
              ) : (
                attachments.map((att, idx) => (
                  <Box
                    key={idx}
                    p={2}
                    bg={surfaceBg}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <HStack justify="space-between" mb={1}>
                      <HStack spacing={2} flex={1} minW={0}>
                        <Text fontSize="lg">{getFileIcon(att.content_type)}</Text>
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text fontSize="xs" color={textTertiary}>
                            {formatSize(att.size)}
                          </Text>
                        </VStack>
                      </HStack>
                      {att.analyzed && (
                        <Tooltip label="Analyzed">
                          <Icon as={CheckCircleIcon} boxSize={4} color="green.400" />
                        </Tooltip>
                      )}
                      {att.workspace_page_id && (
                        <Tooltip label="Saved to Workspace">
                          <Icon as={FolderPlusIcon} boxSize={4} color="blue.400" />
                        </Tooltip>
                      )}
                    </HStack>

                    {/* Attachment Actions */}
                    <HStack mt={2} spacing={1}>
                      <Button
                        size="xs"
                        leftIcon={<Icon as={SparklesIcon} boxSize={3} />}
                        variant="ghost"
                        colorScheme="purple"
                        isLoading={analyzingId === att.filename}
                        onClick={() => analyzeAttachment(att)}
                        isDisabled={att.analyzed}
                      >
                        {att.analyzed ? 'Analyzed' : 'Analyze'}
                      </Button>
                      <Button
                        size="xs"
                        leftIcon={<Icon as={FolderPlusIcon} boxSize={3} />}
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() => saveToWorkspace(att)}
                        isDisabled={!!att.workspace_page_id}
                      >
                        {att.workspace_page_id ? 'Saved' : 'Save to Workspace'}
                      </Button>
                    </HStack>

                    {/* Analysis Description */}
                    {att.description && (
                      <Text fontSize="xs" color={textSecondary} mt={2} noOfLines={3}>
                        {att.description}
                      </Text>
                    )}
                  </Box>
                ))
              )}
            </VStack>
          </Collapse>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Quick Actions Section */}
        <Box>
          <HStack
            justify="space-between"
            cursor="pointer"
            onClick={() => toggleSection('actions')}
            py={1}
          >
            <HStack>
              <Icon as={ClipboardDocumentListIcon} boxSize={4} color={textSecondary} />
              <Text fontWeight="600" color={textColor} fontSize="sm">
                Quick Actions
              </Text>
            </HStack>
            <Icon
              as={expandedSections.actions ? ChevronUpIcon : ChevronDownIcon}
              boxSize={4}
              color={textSecondary}
            />
          </HStack>

          <Collapse in={expandedSections.actions}>
            <VStack align="stretch" spacing={2} mt={2}>
              <Button
                size="sm"
                leftIcon={<Icon as={SparklesIcon} boxSize={4} />}
                variant="outline"
                colorScheme="purple"
                justifyContent="flex-start"
              >
                Generate AI Reply
              </Button>
              <Button
                size="sm"
                leftIcon={<Icon as={DocumentDuplicateIcon} boxSize={4} />}
                variant="outline"
                justifyContent="flex-start"
              >
                Create Draft from Template
              </Button>
              <Button
                size="sm"
                leftIcon={<Icon as={FolderPlusIcon} boxSize={4} />}
                variant="outline"
                colorScheme="blue"
                justifyContent="flex-start"
              >
                Save Email to Workspace
              </Button>
              <Button
                size="sm"
                leftIcon={<Icon as={UserGroupIcon} boxSize={4} />}
                variant="outline"
                justifyContent="flex-start"
              >
                View Contact Graph
              </Button>
            </VStack>
          </Collapse>
        </Box>

        <Divider borderColor={borderColor} />

        {/* AI Insights Section */}
        <Box>
          <HStack
            justify="space-between"
            cursor="pointer"
            onClick={() => toggleSection('insights')}
            py={1}
          >
            <HStack>
              <Icon as={TagIcon} boxSize={4} color={textSecondary} />
              <Text fontWeight="600" color={textColor} fontSize="sm">
                AI Insights
              </Text>
            </HStack>
            <Icon
              as={expandedSections.insights ? ChevronUpIcon : ChevronDownIcon}
              boxSize={4}
              color={textSecondary}
            />
          </HStack>

          <Collapse in={expandedSections.insights}>
            <VStack align="stretch" spacing={3} mt={2}>
              {/* Topics */}
              {email.topics && email.topics.length > 0 && (
                <Box>
                  <Text fontSize="xs" color={textSecondary} mb={1}>Topics</Text>
                  <HStack flexWrap="wrap" spacing={1}>
                    {email.topics.map((topic, idx) => (
                      <Badge key={idx} size="sm" variant="subtle" colorScheme="cyan">
                        {topic}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              {/* Action Items */}
              {email.action_items && email.action_items.length > 0 && (
                <Box>
                  <Text fontSize="xs" color={textSecondary} mb={1}>Action Items</Text>
                  <VStack align="stretch" spacing={1}>
                    {email.action_items.map((item, idx) => (
                      <HStack key={idx} spacing={2}>
                        <Icon as={ExclamationTriangleIcon} boxSize={3} color="orange.400" />
                        <Text fontSize="xs" color={textColor}>{item}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Response Required */}
              {email.requires_response && (
                <HStack
                  p={2}
                  bg="orange.50"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="orange.200"
                >
                  <Icon as={ExclamationTriangleIcon} boxSize={4} color="orange.500" />
                  <Text fontSize="xs" color="orange.700" fontWeight="500">
                    This email requires a response
                  </Text>
                </HStack>
              )}

              {/* No insights available */}
              {!email.topics?.length && !email.action_items?.length && !email.requires_response && (
                <Text fontSize="xs" color={textTertiary}>
                  No AI insights available. Process this email to extract insights.
                </Text>
              )}
            </VStack>
          </Collapse>
        </Box>
      </VStack>
    </Box>
  );
};

export default EmailActionsPanel;
