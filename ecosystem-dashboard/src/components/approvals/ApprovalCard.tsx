/**
 * ApprovalCard Component
 * 
 * Minimalist card with drill-down detail view.
 * Tap card to see details, swipe or use buttons for actions.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import {
  FiCheck,
  FiX,
  FiCalendar,
  FiMail,
  FiClock,
  FiUser,
  FiMessageSquare,
  FiDatabase,
  FiFile,
  FiChevronRight,
} from 'react-icons/fi';
import type {
  ApprovalSummary,
  ApprovalRequest,
  CostAttribution,
  CloudServiceInfo,
} from '@/types/approval';
import {
  ACTION_TYPE_LABELS,
  RISK_LEVEL_COLORS,
  PRIORITY_COLORS,
  CLOUD_PROVIDER_INFO,
  isCalendarPayload,
  isEmailPayload,
  isResearchRequestPayload,
  isLlmInferencePayload,
} from '@/types/approval';

const MotionBox = motion(Box);

// Trigger haptic feedback on iOS
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'medium') => {
  if (typeof window !== 'undefined' && 'navigator' in window) {
    // Try the Vibration API
    if ('vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        error: [30, 50, 30],
      };
      navigator.vibrate(patterns[style]);
    }
  }
};

interface ApprovalCardProps {
  approval: ApprovalSummary;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onViewDetails?: (id: string) => void;
  isExpanded?: boolean;
  detailedApproval?: ApprovalRequest | null;
}

import { FiDollarSign, FiCloud, FiAlertTriangle, FiShield, FiCpu } from 'react-icons/fi';

// Action type icons
const ACTION_ICONS: Record<string, typeof FiCalendar> = {
  calendar_event_create: FiCalendar,
  calendar_event_update: FiCalendar,
  calendar_event_delete: FiCalendar,
  calendar_invite_send: FiCalendar,
  email_draft_create: FiMail,
  email_send: FiMail,
  email_reply: FiMail,
  email_forward: FiMail,
  knowledge_graph_add: FiDatabase,
  knowledge_graph_update: FiDatabase,
  knowledge_graph_delete: FiDatabase,
  contact_create: FiUser,
  contact_update: FiUser,
  document_share: FiFile,
  file_delete: FiFile,
  workspace_page_delete: FiFile,
  // Child account approval icons
  child_conversation_access: FiMessageSquare,
  child_service_access: FiUser,
  child_extended_time: FiClock,
  child_content_unlock: FiFile,
  child_feature_request: FiUser,
  // Cloud service / AI research icons
  deep_research_request: FiCpu,
  news_story_generation: FiFile,
  podcast_generation: FiFile,
  cloud_api_call: FiCloud,
  llm_inference_request: FiCpu,
};

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onViewDetails,
  isExpanded: controlledExpanded,
  detailedApproval,
}: ApprovalCardProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isProcessing, setIsProcessing] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Semantic tokens
  const bgElevated = useSemanticToken('surface.elevated');
  const bgBase = useSemanticToken('surface.base');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const statusError = useSemanticToken('status.error');
  const statusWarning = useSemanticToken('status.warning');
  
  // Swipe gesture handling
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(229, 62, 62, 0.2)', 'rgba(0, 0, 0, 0)', 'rgba(72, 187, 120, 0.2)']
  );
  
  const ActionIcon = ACTION_ICONS[approval.action_type] || FiMessageSquare;
  
  const handleApprove = useCallback(async () => {
    setIsProcessing(true);
    triggerHaptic('success');
    try {
      await onApprove(approval.id);
    } finally {
      setIsProcessing(false);
    }
  }, [approval.id, onApprove]);
  
  const handleReject = useCallback(async () => {
    setIsProcessing(true);
    triggerHaptic('error');
    try {
      await onReject(approval.id);
    } finally {
      setIsProcessing(false);
    }
  }, [approval.id, onReject]);
  
  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    const threshold = 80;
    
    if (info.offset.x > threshold) {
      // Swiped right = approve
      setSwipeDirection('right');
      triggerHaptic('success');
      await handleApprove();
    } else if (info.offset.x < -threshold) {
      // Swiped left = reject
      setSwipeDirection('left');
      triggerHaptic('error');
      await handleReject();
    } else {
      // Light haptic when releasing without action
      triggerHaptic('light');
    }
    setSwipeDirection(null);
  }, [handleApprove, handleReject]);
  
  // Time until expiry
  const expiresAt = approval.expires_at ? new Date(approval.expires_at) : null;
  const timeUntilExpiry = expiresAt 
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60)))
    : null;
  const isExpiringSoon = timeUntilExpiry !== null && timeUntilExpiry < 60;
  
  return (
    <MotionBox
      style={{ background, x }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      borderRadius="xl"
      overflow="hidden"
      position="relative"
    >
      {/* Swipe indicators - smaller */}
      <Box position="absolute" left={2} top="50%" transform="translateY(-50%)" opacity={swipeDirection === 'left' ? 1 : 0.2} pointerEvents="none">
        <Icon as={FiX} color="red.400" boxSize={4} />
      </Box>
      <Box position="absolute" right={2} top="50%" transform="translateY(-50%)" opacity={swipeDirection === 'right' ? 1 : 0.2} pointerEvents="none">
        <Icon as={FiCheck} color="green.400" boxSize={4} />
      </Box>
      
      {/* Clean card design */}
      <Box
        bg={bgElevated}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={borderSubtle}
        overflow="hidden"
        onClick={onOpen}
        cursor="pointer"
        _hover={{ borderColor: 'gray.300' }}
        transition="all 0.15s"
      >
        <HStack p={3} spacing={3}>
          {/* Left: Icon */}
          <Box
            w="36px"
            h="36px"
            borderRadius="lg"
            bg={`${RISK_LEVEL_COLORS[approval.risk_level]}.50`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Icon as={ActionIcon} boxSize={4} color={`${RISK_LEVEL_COLORS[approval.risk_level]}.500`} />
          </Box>
          
          {/* Middle: Content */}
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <HStack w="100%" justify="space-between">
              <Text fontWeight="500" fontSize="sm" color={textPrimary} noOfLines={1}>
                {approval.title}
              </Text>
              <Text fontSize="xs" color={textSecondary} flexShrink={0}>
                {timeUntilExpiry !== null ? (timeUntilExpiry < 60 ? `${timeUntilExpiry}m` : `${Math.floor(timeUntilExpiry / 60)}h`) : ''}
              </Text>
            </HStack>
            <Text fontSize="xs" color={textSecondary} noOfLines={1}>
              {approval.summary}
            </Text>
          </VStack>
          
          {/* Right: Actions */}
          <HStack spacing={1} flexShrink={0} onClick={e => e.stopPropagation()}>
            <Box
              as="button"
              w="32px"
              h="32px"
              borderRadius="full"
              bg="red.50"
              display="flex"
              alignItems="center"
              justifyContent="center"
              onClick={handleReject}
              cursor="pointer"
              _hover={{ bg: 'red.100' }}
              transition="all 0.15s"
              opacity={isProcessing ? 0.5 : 1}
            >
              <Icon as={FiX} boxSize={4} color="red.500" />
            </Box>
            <Box
              as="button"
              w="32px"
              h="32px"
              borderRadius="full"
              bg="green.50"
              display="flex"
              alignItems="center"
              justifyContent="center"
              onClick={handleApprove}
              cursor="pointer"
              _hover={{ bg: 'green.100' }}
              transition="all 0.15s"
              opacity={isProcessing ? 0.5 : 1}
            >
              <Icon as={FiCheck} boxSize={4} color="green.500" />
            </Box>
          </HStack>
        </HStack>
        
        {/* Priority indicator bar */}
        {(approval.priority === 'critical' || approval.priority === 'high') && (
          <Box h="2px" bg={approval.priority === 'critical' ? 'red.400' : 'orange.400'} />
        )}
      </Box>
      
      {/* Drill-down detail modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(4px)" />
        <ModalContent 
          bg={bgElevated} 
          m={0} 
          borderRadius="xl" 
          borderBottomRadius={0}
          position="fixed"
          bottom={0}
          maxH="85vh"
        >
          <ModalHeader 
            fontSize="sm" 
            fontWeight="600" 
            color={textPrimary}
            borderBottomWidth="1px"
            borderColor={borderSubtle}
            py={3}
          >
            <HStack spacing={2}>
              <Icon as={ActionIcon} boxSize={4} color={`${RISK_LEVEL_COLORS[approval.risk_level]}.500`} />
              <Text>{approval.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton size="sm" />
          <ModalBody py={4} overflowY="auto">
            <VStack align="stretch" spacing={4}>
              {/* Summary */}
              <Box>
                <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                  Summary
                </Text>
                <Text fontSize="sm" color={textPrimary}>
                  {approval.summary}
                </Text>
              </Box>
              
              {/* Meta info */}
              <HStack spacing={4} fontSize="xs" color={textSecondary}>
                <HStack spacing={1}>
                  <Icon as={FiUser} boxSize={3} />
                  <Text>{approval.agent_name}</Text>
                </HStack>
                <Text>{ACTION_TYPE_LABELS[approval.action_type]}</Text>
                {timeUntilExpiry !== null && (
                  <HStack spacing={1}>
                    <Icon as={FiClock} boxSize={3} />
                    <Text>{timeUntilExpiry < 60 ? `${timeUntilExpiry}m` : `${Math.floor(timeUntilExpiry / 60)}h`}</Text>
                  </HStack>
                )}
              </HStack>
              
              {/* Detailed content when available */}
              {detailedApproval && (
                <>
                  {/* Cost Attribution Section */}
                  {detailedApproval.cost && (
                    <Box 
                      p={3} 
                      bg="blue.50" 
                      borderRadius="lg" 
                      borderWidth="1px" 
                      borderColor="blue.200"
                    >
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={2}>
                          <Icon as={FiDollarSign} color="blue.500" boxSize={4} />
                          <Text fontSize="xs" fontWeight="600" color="blue.700" textTransform="uppercase">
                            Cost Estimate
                          </Text>
                        </HStack>
                        <Text fontSize="lg" fontWeight="bold" color="blue.700">
                          ${detailedApproval.cost.estimated_cost.toFixed(4)}
                        </Text>
                      </HStack>
                      
                      {/* Cost breakdown */}
                      {detailedApproval.cost.cost_breakdown.length > 0 && (
                        <VStack align="stretch" spacing={1} mb={2}>
                          {detailedApproval.cost.cost_breakdown.map((item, i) => (
                            <HStack key={i} justify="space-between" fontSize="xs">
                              <HStack spacing={1}>
                                <Box 
                                  w={2} 
                                  h={2} 
                                  borderRadius="full" 
                                  bg={`${CLOUD_PROVIDER_INFO[item.provider]?.color || 'gray'}.400`} 
                                />
                                <Text color="blue.600">{item.service}</Text>
                              </HStack>
                              <Text color="blue.700" fontWeight="500">${item.subtotal.toFixed(4)}</Text>
                            </HStack>
                          ))}
                        </VStack>
                      )}
                      
                      {/* Budget context */}
                      {detailedApproval.cost.monthly_budget && (
                        <Box mt={2} pt={2} borderTopWidth="1px" borderColor="blue.200">
                          <HStack justify="space-between" fontSize="xs" color="blue.600">
                            <Text>Monthly spent: ${detailedApproval.cost.monthly_spent?.toFixed(2) || '0.00'}</Text>
                            <Text>Budget: ${detailedApproval.cost.monthly_budget.toFixed(2)}</Text>
                          </HStack>
                          <Box 
                            mt={1} 
                            h="4px" 
                            bg="blue.100" 
                            borderRadius="full" 
                            overflow="hidden"
                          >
                            <Box 
                              h="100%" 
                              bg={
                                (detailedApproval.cost.monthly_spent || 0) / detailedApproval.cost.monthly_budget > 0.8 
                                  ? 'red.400' 
                                  : 'blue.400'
                              }
                              w={`${Math.min(100, ((detailedApproval.cost.monthly_spent || 0) / detailedApproval.cost.monthly_budget) * 100)}%`}
                            />
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Cloud Services Section */}
                  {detailedApproval.cloud_services && detailedApproval.cloud_services.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiCloud} color="purple.500" boxSize={4} />
                        <Text fontSize="10px" fontWeight="600" color="purple.500" textTransform="uppercase">
                          Cloud Services Used
                        </Text>
                      </HStack>
                      <VStack align="stretch" spacing={2}>
                        {detailedApproval.cloud_services.map((service, i) => (
                          <Box 
                            key={i} 
                            p={2} 
                            bg="purple.50" 
                            borderRadius="md" 
                            borderWidth="1px" 
                            borderColor="purple.200"
                          >
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Box 
                                  w={2} 
                                  h={2} 
                                  borderRadius="full" 
                                  bg={`${CLOUD_PROVIDER_INFO[service.provider]?.color || 'gray'}.400`} 
                                />
                                <Text fontSize="sm" fontWeight="500" color="purple.700">
                                  {CLOUD_PROVIDER_INFO[service.provider]?.name || service.provider}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color="purple.600">{service.model || service.service_name}</Text>
                            </HStack>
                            
                            {/* Data handling info */}
                            <HStack mt={1} spacing={3} fontSize="xs" color="purple.600">
                              {service.data_used_for_training !== undefined && (
                                <HStack spacing={1}>
                                  <Icon as={service.data_used_for_training ? FiAlertTriangle : FiShield} boxSize={3} />
                                  <Text>{service.data_used_for_training ? 'May train on data' : 'No training'}</Text>
                                </HStack>
                              )}
                              {service.data_residency && (
                                <Text>Region: {service.data_residency}</Text>
                              )}
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* Research Request Details */}
                  {isResearchRequestPayload(detailedApproval.payload) && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                        Research Details
                      </Text>
                      <VStack align="stretch" spacing={2} fontSize="sm" color={textPrimary}>
                        <Text><strong>Query:</strong> {detailedApproval.payload.query}</Text>
                        <Text><strong>Mode:</strong> {detailedApproval.payload.research_mode.replace('_', ' ')}</Text>
                        
                        {detailedApproval.payload.models.length > 0 && (
                          <Box>
                            <Text fontWeight="500" mb={1}>Models:</Text>
                            {detailedApproval.payload.models.map((m, i) => (
                              <HStack key={i} justify="space-between" fontSize="xs" pl={2}>
                                <Text>{m.model} - {m.purpose}</Text>
                                {m.estimated_cost !== undefined && (
                                  <Text color="blue.500">${m.estimated_cost.toFixed(4)}</Text>
                                )}
                              </HStack>
                            ))}
                          </Box>
                        )}
                        
                        {detailedApproval.payload.external_services.length > 0 && (
                          <Box>
                            <Text fontWeight="500" mb={1}>External Services:</Text>
                            {detailedApproval.payload.external_services.map((s, i) => (
                              <HStack key={i} justify="space-between" fontSize="xs" pl={2}>
                                <Text>{s.service} - {s.purpose}</Text>
                                {s.estimated_cost !== undefined && (
                                  <Text color="blue.500">${s.estimated_cost.toFixed(4)}</Text>
                                )}
                              </HStack>
                            ))}
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}

                  {/* LLM Inference Details */}
                  {isLlmInferencePayload(detailedApproval.payload) && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                        Inference Details
                      </Text>
                      <VStack align="stretch" spacing={1} fontSize="sm" color={textPrimary}>
                        <HStack justify="space-between">
                          <Text>Model:</Text>
                          <Text fontWeight="500">{detailedApproval.payload.model}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Input tokens:</Text>
                          <Text>{detailedApproval.payload.input_tokens.toLocaleString()}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Est. output tokens:</Text>
                          <Text>{detailedApproval.payload.estimated_output_tokens.toLocaleString()}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Est. cost:</Text>
                          <Text fontWeight="bold" color="blue.500">
                            ${detailedApproval.payload.estimated_total_cost.toFixed(4)}
                          </Text>
                        </HStack>
                        
                        {/* Alternatives */}
                        {detailedApproval.payload.local_alternative && (
                          <Box mt={2} p={2} bg="green.50" borderRadius="md">
                            <Text fontSize="xs" fontWeight="600" color="green.600">
                              💡 Local alternative available:
                            </Text>
                            <Text fontSize="xs" color="green.700">
                              {detailedApproval.payload.local_alternative.model} (Free) - {detailedApproval.payload.local_alternative.quality_tradeoff}
                            </Text>
                          </Box>
                        )}
                        
                        {detailedApproval.payload.cheaper_alternative && (
                          <Box mt={2} p={2} bg="yellow.50" borderRadius="md">
                            <Text fontSize="xs" fontWeight="600" color="yellow.700">
                              💰 Cheaper alternative:
                            </Text>
                            <Text fontSize="xs" color="yellow.800">
                              {detailedApproval.payload.cheaper_alternative.model} (${detailedApproval.payload.cheaper_alternative.estimated_cost.toFixed(4)}) - {detailedApproval.payload.cheaper_alternative.quality_tradeoff}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}

                  {detailedApproval.ai_reasoning && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                        AI Reasoning
                      </Text>
                      <Text fontSize="sm" color={textPrimary}>
                        {detailedApproval.ai_reasoning}
                      </Text>
                    </Box>
                  )}
                  
                  {detailedApproval.risk.factors.length > 0 && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color="orange.500" textTransform="uppercase" mb={1}>
                        Risk Factors
                      </Text>
                      {detailedApproval.risk.factors.map((factor, i) => (
                        <Text key={i} fontSize="sm" color={textPrimary}>• {factor}</Text>
                      ))}
                    </Box>
                  )}
                  
                  {isCalendarPayload(detailedApproval.payload) && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                        Event Details
                      </Text>
                      <VStack align="stretch" spacing={1} fontSize="sm" color={textPrimary}>
                        <Text><strong>When:</strong> {new Date(detailedApproval.payload.start_time).toLocaleString()}</Text>
                        {detailedApproval.payload.location && (
                          <Text><strong>Where:</strong> {detailedApproval.payload.location}</Text>
                        )}
                        {detailedApproval.payload.attendees && detailedApproval.payload.attendees.length > 0 && (
                          <Text><strong>Attendees:</strong> {detailedApproval.payload.attendees.map(a => a.name || a.email).join(', ')}</Text>
                        )}
                      </VStack>
                    </Box>
                  )}
                  
                  {isEmailPayload(detailedApproval.payload) && (
                    <Box>
                      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" mb={1}>
                        Email Content
                      </Text>
                      <VStack align="stretch" spacing={2} fontSize="sm" color={textPrimary}>
                        <Text><strong>To:</strong> {detailedApproval.payload.to.map(r => r.name || r.email).join(', ')}</Text>
                        <Text><strong>Subject:</strong> {detailedApproval.payload.subject}</Text>
                        <Box p={3} bg={bgBase} borderRadius="md" maxH="200px" overflow="auto">
                          <Text fontSize="xs" whiteSpace="pre-wrap" color={textSecondary}>
                            {detailedApproval.payload.body}
                          </Text>
                        </Box>
                      </VStack>
                    </Box>
                  )}
                </>
              )}
              
              {/* Action buttons in modal */}
              <HStack spacing={3} pt={4}>
                <Box
                  as="button"
                  flex={1}
                  py={2}
                  fontSize="sm"
                  fontWeight="500"
                  color="red.500"
                  bg="rgba(254, 215, 215, 0.5)"
                  backdropFilter="blur(8px)"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="rgba(254, 178, 178, 0.4)"
                  onClick={() => { handleReject(); onClose(); }}
                  cursor="pointer"
                  _hover={{ bg: 'rgba(254, 215, 215, 0.8)' }}
                  transition="all 0.15s"
                >
                  Reject
                </Box>
                <Box
                  as="button"
                  flex={1}
                  py={2}
                  fontSize="sm"
                  fontWeight="600"
                  color="green.600"
                  bg="rgba(198, 246, 213, 0.5)"
                  backdropFilter="blur(8px)"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="rgba(154, 230, 180, 0.4)"
                  onClick={() => { handleApprove(); onClose(); }}
                  cursor="pointer"
                  _hover={{ bg: 'rgba(198, 246, 213, 0.8)' }}
                  transition="all 0.15s"
                >
                  Approve
                </Box>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </MotionBox>
  );
}

export default ApprovalCard;
