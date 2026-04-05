/**
 * Tesla Workspace - Voice-First Productivity Staging Area
 * 
 * Architecture:
 * - Voice-first: Nova/OpenClaw do the heavy lifting
 * - Screen is a companion display showing agent work
 * - Touch for quick actions: Save Draft, Queue Approval, Delegate to OpenClaw
 * - Email sending goes through Approval Engine (no instant send)
 * 
 * Sections:
 * - Pending Drafts: Emails Nova has drafted, awaiting action
 * - Active Reminders: ExoMind jobs in progress
 * - Queued for Approval: Items waiting for JIT approval
 * 
 * Nova Integration:
 * - Subscribes to SSE mirror events for real-time updates
 * - Nova can create drafts, reminders via voice
 * - Complex emails delegate to OpenClaw → Atlas Analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Badge,
} from '@chakra-ui/react';
import {
  ArrowLeft, Mail, Bell, Send, Sparkles, Calendar,
  CheckCircle, Clock, Mic, Edit3, Share2, Save,
  AlertCircle, ExternalLink, MoreHorizontal,
} from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  tone?: string;
  status: 'draft' | 'queued' | 'approved' | 'sent';
  created_at: string;
  created_by: 'nova' | 'openclaw' | 'user';
}

interface ExoMindJob {
  id: string;
  title: string;
  description?: string;
  job_type: 'task' | 'reminder' | 'followup' | 'research' | 'monitor';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  created_at: string;
}

interface ApprovalItem {
  id: string;
  type: 'email_send' | 'action';
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeslaWorkspace() {
  // Theme tokens
  const bgBase = useSemanticToken('surface.base');
  const bgCard = useSemanticToken('surface.elevated');
  const bgHover = useSemanticToken('surface.hover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const accentColor = useSemanticToken('interactive.primary');

  // State
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [jobs, setJobs] = useState<ExoMindJob[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load ExoMind jobs
      const jobsRes = await fetch('/api/exomind/jobs?status=pending,in_progress&limit=10');
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }

      // Load pending approvals
      const approvalsRes = await fetch('/api/security/approvals?status=pending&limit=5');
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setApprovals(data.approvals || []);
      }

      // TODO: Load email drafts from Hermes draft storage
      // For now, mock data to show the UI pattern
      setDrafts([]);
    } catch (err) {
      console.error('[Workspace] Failed to load data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    
    // Subscribe to Nova mirror events for real-time updates
    const eventSource = new EventSource('/api/nova/mirror/stream');
    
    eventSource.addEventListener('draft_created', (e) => {
      const draft = JSON.parse(e.data);
      setDrafts(prev => [draft, ...prev]);
    });
    
    eventSource.addEventListener('reminder_created', () => {
      loadData(); // Refresh jobs
    });

    return () => eventSource.close();
  }, [loadData]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const saveDraft = async (draft: EmailDraft) => {
    // Save to Hermes draft storage
    console.log('[Workspace] Saving draft:', draft.id);
    // TODO: POST /api/email/drafts
  };

  const queueForApproval = async (draft: EmailDraft) => {
    // Submit to approval engine
    try {
      await fetch('/api/security/approvals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'email_send',
          title: `Send email: ${draft.subject}`,
          context: { draft_id: draft.id, to: draft.to, subject: draft.subject },
        }),
      });
      loadData();
    } catch (err) {
      console.error('[Workspace] Failed to queue approval:', err);
    }
  };

  const delegateToOpenClaw = async (draft: EmailDraft) => {
    // Delegate to OpenClaw for complex analysis
    console.log('[Workspace] Delegating to OpenClaw:', draft.id);
    // TODO: POST /api/openclaw/delegate with email context
  };

  const completeJob = async (id: string) => {
    try {
      await fetch(`/api/exomind/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      loadData();
    } catch (err) {
      console.error('[Workspace] Failed to complete job:', err);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      default: return 'gray';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box minH="100vh" bg={bgBase} p={4} color={textPrimary}>
      <VStack spacing={5} maxW="800px" mx="auto">
        {/* Header */}
        <HStack w="100%" justify="space-between">
          <HStack spacing={3}>
            <Box as="button" display="flex" alignItems="center" gap={2} px={4} h="44px"
              bg={bgCard} borderRadius="full" onClick={() => { window.location.href = '/tesla'; }}
              _hover={{ bg: bgHover }}>
              <ArrowLeft size={18} />
              <Text fontSize="sm">Tesla</Text>
            </Box>
            <Text fontSize="xl" fontWeight="semibold">Workspace</Text>
          </HStack>
          <HStack spacing={2}>
            <Box as="button" w="44px" h="44px" bg={bgCard} borderRadius="full"
              display="flex" alignItems="center" justifyContent="center"
              _hover={{ bg: bgHover }}>
              <Mic size={20} color={textSecondary} />
            </Box>
          </HStack>
        </HStack>

        {/* Voice Prompt */}
        <Box bg={bgCard} borderRadius="2xl" p={4} w="100%" border="1px dashed" borderColor={borderColor}>
          <HStack spacing={3}>
            <Box w="40px" h="40px" bg={accentColor} borderRadius="full"
              display="flex" alignItems="center" justifyContent="center">
              <Sparkles size={20} color="white" />
            </Box>
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight="medium">Ask Nova</Text>
              <Text fontSize="sm" color={textSecondary}>
                "Draft an email to..." • "Remind me to..." • "What's pending?"
              </Text>
            </VStack>
          </HStack>
        </Box>

        {loading ? (
          <VStack py={12}><Spinner color={accentColor} size="lg" /></VStack>
        ) : (
          <>
            {/* ─── Pending Drafts ─────────────────────────────────────────── */}
            {drafts.length > 0 && (
              <VStack spacing={3} w="100%" align="stretch">
                <HStack>
                  <Mail size={18} color={textSecondary} />
                  <Text fontWeight="semibold" color={textSecondary}>Pending Drafts</Text>
                  <Badge colorScheme="blue">{drafts.length}</Badge>
                </HStack>
                
                {drafts.map(draft => (
                  <Box key={draft.id} bg={bgCard} borderRadius="xl" overflow="hidden">
                    {/* Draft Header */}
                    <Box p={4} cursor="pointer" onClick={() => setExpandedDraft(
                      expandedDraft === draft.id ? null : draft.id
                    )} _hover={{ bg: bgHover }}>
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontWeight="medium" noOfLines={1}>{draft.subject || '(No subject)'}</Text>
                          <Text fontSize="sm" color={textSecondary}>To: {draft.to}</Text>
                        </VStack>
                        <HStack spacing={2}>
                          <Badge colorScheme={draft.created_by === 'nova' ? 'purple' : 'gray'}>
                            {draft.created_by}
                          </Badge>
                          <Text fontSize="xs" color={textSecondary}>{formatTime(draft.created_at)}</Text>
                        </HStack>
                      </HStack>
                    </Box>

                    {/* Expanded Draft */}
                    {expandedDraft === draft.id && (
                      <VStack spacing={3} p={4} pt={0} align="stretch">
                        <Box bg={bgBase} borderRadius="lg" p={3} maxH="150px" overflowY="auto">
                          <Text fontSize="sm" whiteSpace="pre-wrap">{draft.body}</Text>
                        </Box>
                        
                        {/* Action Buttons */}
                        <HStack spacing={2} justify="flex-end">
                          <Box as="button" px={4} py={2} bg={bgHover} borderRadius="full"
                            fontSize="sm" onClick={() => saveDraft(draft)} _hover={{ bg: borderColor }}>
                            <HStack spacing={2}><Save size={14} /><Text>Save</Text></HStack>
                          </Box>
                          <Box as="button" px={4} py={2} bg={bgHover} borderRadius="full"
                            fontSize="sm" onClick={() => delegateToOpenClaw(draft)} _hover={{ bg: borderColor }}>
                            <HStack spacing={2}><ExternalLink size={14} /><Text>OpenClaw</Text></HStack>
                          </Box>
                          <Box as="button" px={4} py={2} bg="green.500" color="white" borderRadius="full"
                            fontSize="sm" onClick={() => queueForApproval(draft)} _hover={{ bg: 'green.600' }}>
                            <HStack spacing={2}><Send size={14} /><Text>Queue Send</Text></HStack>
                          </Box>
                        </HStack>
                      </VStack>
                    )}
                  </Box>
                ))}
              </VStack>
            )}

            {/* ─── Active Reminders ───────────────────────────────────────── */}
            <VStack spacing={3} w="100%" align="stretch">
              <HStack>
                <Bell size={18} color={textSecondary} />
                <Text fontWeight="semibold" color={textSecondary}>Active Reminders</Text>
                {jobs.length > 0 && <Badge colorScheme="orange">{jobs.length}</Badge>}
              </HStack>

              {jobs.length === 0 ? (
                <Box bg={bgCard} borderRadius="xl" p={6} textAlign="center">
                  <Text color={textSecondary}>No active reminders</Text>
                  <Text fontSize="sm" color={textSecondary} mt={1}>
                    Say "Nova, remind me to..."
                  </Text>
                </Box>
              ) : (
                jobs.map(job => (
                  <Box key={job.id} bg={bgCard} borderRadius="xl" p={4}>
                    <HStack justify="space-between">
                      <HStack spacing={3} flex={1}>
                        <Box as="button" w="36px" h="36px" borderRadius="full"
                          border="2px solid" borderColor={borderColor}
                          display="flex" alignItems="center" justifyContent="center"
                          onClick={() => completeJob(job.id)}
                          _hover={{ borderColor: 'green.400', bg: 'green.50' }}>
                          <CheckCircle size={18} color={textSecondary} />
                        </Box>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="medium">{job.title}</Text>
                          <HStack spacing={2} mt={1}>
                            <Badge colorScheme={getPriorityColor(job.priority)} size="sm">
                              {job.priority}
                            </Badge>
                            {job.due_date && (
                              <HStack spacing={1} color={textSecondary}>
                                <Calendar size={12} />
                                <Text fontSize="xs">
                                  {new Date(job.due_date).toLocaleDateString()}
                                </Text>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                      <Text fontSize="xs" color={textSecondary}>{formatTime(job.created_at)}</Text>
                    </HStack>
                  </Box>
                ))
              )}
            </VStack>

            {/* ─── Queued for Approval ────────────────────────────────────── */}
            {approvals.length > 0 && (
              <VStack spacing={3} w="100%" align="stretch">
                <HStack>
                  <Clock size={18} color={textSecondary} />
                  <Text fontWeight="semibold" color={textSecondary}>Queued for Approval</Text>
                  <Badge colorScheme="yellow">{approvals.length}</Badge>
                </HStack>

                {approvals.map(item => (
                  <Box key={item.id} bg={bgCard} borderRadius="xl" p={4}>
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <AlertCircle size={18} color="orange" />
                        <Text fontWeight="medium">{item.title}</Text>
                      </HStack>
                      <Badge colorScheme="yellow">Pending</Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}

            {/* Empty State */}
            {drafts.length === 0 && jobs.length === 0 && approvals.length === 0 && (
              <VStack py={12} spacing={4} opacity={0.6}>
                <Sparkles size={48} color={textSecondary} />
                <Text color={textSecondary} textAlign="center">
                  Your workspace is clear
                </Text>
                <Text fontSize="sm" color={textSecondary} textAlign="center">
                  Ask Nova to draft an email or create a reminder
                </Text>
              </VStack>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}
