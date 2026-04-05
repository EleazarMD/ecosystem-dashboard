/**
 * ApprovalQueue Component
 * 
 * Minimalist, professional queue view for pending AI action approvals.
 * Features type-based tabs (Email, Calendar, Knowledge) and priority filters.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Spinner,
  Center,
  useToast,
  Checkbox,
  Icon,
  Flex,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckSquare,
  FiAlertCircle,
  FiInbox,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiClock,
  FiMail,
  FiCalendar,
  FiDatabase,
  FiLayers,
  FiFilter,
  FiUser,
  FiEdit2,
  FiSave,
} from 'react-icons/fi';
import { useApproval } from '@/contexts/ApprovalContext';
import { ApprovalCard } from './ApprovalCard';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { ApprovalSummary, ApprovalRequest, ApprovalPriority } from '@/types/approval';

const MotionBox = motion(Box);

// Category definitions for type-based tabs
type ApprovalCategory = 'all' | 'email' | 'calendar' | 'knowledge' | 'personal' | 'children' | 'openclaw' | 'home' | 'other';

const CATEGORY_CONFIG: Record<ApprovalCategory, { 
  label: string; 
  icon: typeof FiMail; 
  actionTypes: string[];
}> = {
  all: { label: 'All', icon: FiLayers, actionTypes: [] },
  email: { 
    label: 'Email', 
    icon: FiMail, 
    actionTypes: ['email_draft_create', 'email_send', 'email_reply', 'email_forward'] 
  },
  calendar: { 
    label: 'Calendar', 
    icon: FiCalendar, 
    actionTypes: ['calendar_event_create', 'calendar_event_update', 'calendar_event_delete', 'calendar_invite_send'] 
  },
  knowledge: { 
    label: 'Knowledge', 
    icon: FiDatabase, 
    actionTypes: ['knowledge_graph_add', 'knowledge_graph_update', 'knowledge_graph_delete'] 
  },
  personal: {
    label: 'Personal',
    icon: FiUser,
    actionTypes: ['pic_observation']
  },
  children: {
    label: 'Children',
    icon: FiUser,
    actionTypes: ['child_approval']
  },
  openclaw: {
    label: 'OpenClaw',
    icon: FiAlertCircle,
    actionTypes: [
      'openclaw_skill_execute',
      'openclaw_memory_write',
      'openclaw_shell_command',
      'openclaw_file_write',
      'openclaw_email_send',
      'openclaw_email_draft',
      'openclaw_calendar_create',
      'openclaw_research_queue',
      'openclaw_podcast_create',
    ]
  },
  home: {
    label: 'Home',
    icon: FiLayers,
    actionTypes: [
      'openclaw_home_control',
      'home_light_control',
      'home_thermostat_set',
      'home_lock_control',
      'home_garage_control',
      'home_alarm_set',
    ]
  },
  other: { 
    label: 'Other', 
    icon: FiLayers, 
    actionTypes: ['contact_create', 'contact_update', 'reminder_create', 'task_create', 'document_share', 'file_delete'] 
  },
};

// PIC observation interface
interface PICObservation {
  id: string;
  observation_type: string;
  category: string | null;
  key: string;
  value: any;
  context: string | null;
  explanation: string | null;
  source_agent: string;
  source_action: string | null;
  processed: boolean;
  created_at: string;
}

const PIC_API = '/api/pic';

// Helper to format observation values into human-readable text
const formatObservationValue = (key: string, value: any): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  // Handle interaction patterns
  if (value && typeof value === 'object') {
    if (value.domain && value.tools_used) {
      const tools = Array.isArray(value.tools_used) ? value.tools_used.join(', ') : 'none';
      const hour = value.hour_of_day !== undefined ? ` at ${value.hour_of_day}:00` : '';
      return `${value.domain} interaction using ${tools}${hour}`;
    }
    
    // Handle other structured data
    if (value.preference) return value.preference;
    if (value.pattern) return value.pattern;
    
    // Fallback to JSON for unknown structures
    return JSON.stringify(value);
  }
  
  return String(value);
};

interface ApprovalQueueProps {
  // Settings now handled by right panel context
}

export function ApprovalQueue({}: ApprovalQueueProps) {
  const {
    pendingApprovals,
    pendingCount,
    criticalCount,
    isLoading,
    error,
    fetchPendingApprovals,
    getApprovalDetail,
    approveAction,
    rejectAction,
    batchApprove,
    batchReject,
  } = useApproval();
  
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ApprovalCategory>('all');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailedApprovals, setDetailedApprovals] = useState<Record<string, ApprovalRequest>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // PIC observations state
  const [picObservations, setPicObservations] = useState<PICObservation[]>([]);
  const [picLoading, setPicLoading] = useState(true);
  const [editingPicId, setEditingPicId] = useState<string | null>(null);
  const [editedKey, setEditedKey] = useState('');
  const [editedValue, setEditedValue] = useState('');
  const [editedExplanation, setEditedExplanation] = useState('');
  const [processingPicIds, setProcessingPicIds] = useState<Set<string>>(new Set());
  
  // Fetch PIC observations
  const fetchPicObservations = useCallback(async () => {
    try {
      const response = await fetch(`${PIC_API}/learn/observations?processed=false&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setPicObservations(data.observations || []);
      }
    } catch (err) {
      console.error('Failed to fetch PIC observations:', err);
    } finally {
      setPicLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchPicObservations();
  }, [fetchPicObservations]);
  
  // PIC handlers
  const handleEditPic = (obs: PICObservation) => {
    setEditingPicId(obs.id);
    setEditedKey(obs.key);
    setEditedValue(typeof obs.value === 'object' ? JSON.stringify(obs.value) : String(obs.value));
    setEditedExplanation(obs.explanation || '');
  };
  
  const handleCancelEditPic = () => {
    setEditingPicId(null);
    setEditedKey('');
    setEditedValue('');
    setEditedExplanation('');
  };
  
  const handleSavePic = async (obsId: string) => {
    setProcessingPicIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editedKey, value: editedValue, explanation: editedExplanation }),
      });
      if (!response.ok) throw new Error('Failed to update');
      toast({ title: 'Updated', status: 'success', duration: 2000 });
      await fetchPicObservations();
      handleCancelEditPic();
    } catch (err) {
      toast({ title: 'Update failed', status: 'error', duration: 3000 });
    } finally {
      setProcessingPicIds(prev => { const n = new Set(prev); n.delete(obsId); return n; });
    }
  };
  
  const handleApprovePic = async (obsId: string) => {
    setProcessingPicIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });
      if (!response.ok) throw new Error('Failed to approve');
      toast({ title: 'Approved', status: 'success', duration: 2000 });
      await fetchPicObservations();
    } catch (err) {
      toast({ title: 'Approval failed', status: 'error', duration: 3000 });
    } finally {
      setProcessingPicIds(prev => { const n = new Set(prev); n.delete(obsId); return n; });
    }
  };
  
  const handleRejectPic = async (obsId: string) => {
    setProcessingPicIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });
      if (!response.ok) throw new Error('Failed to reject');
      toast({ title: 'Rejected', status: 'info', duration: 2000 });
      await fetchPicObservations();
    } catch (err) {
      toast({ title: 'Rejection failed', status: 'error', duration: 3000 });
    } finally {
      setProcessingPicIds(prev => { const n = new Set(prev); n.delete(obsId); return n; });
    }
  };
  
  // Count approvals by category
  const categoryCounts = useMemo(() => {
    const counts: Record<ApprovalCategory, number> = { 
      all: 0, 
      email: 0, 
      calendar: 0, 
      knowledge: 0, 
      personal: 0, 
      children: 0, 
      other: 0 
    };
    
    // Count AI approvals
    pendingApprovals.filter(a => a.status === 'pending').forEach(approval => {
      counts.all++;
      let matched = false;
      for (const [cat, config] of Object.entries(CATEGORY_CONFIG)) {
        if (cat !== 'all' && cat !== 'other' && cat !== 'personal' && cat !== 'children' && config.actionTypes.includes(approval.action_type)) {
          counts[cat as ApprovalCategory]++;
          matched = true;
          break;
        }
      }
      if (!matched && CATEGORY_CONFIG.other.actionTypes.includes(approval.action_type)) {
        counts.other++;
      }
    });
    
    // Count PIC observations
    counts.personal = picObservations.length;
    counts.all += picObservations.length;
    
    // TODO: Integrate child approvals count here when child approval data is available
    // counts.children = childApprovals.length;
    // counts.all += childApprovals.length;
    
    return counts;
  }, [pendingApprovals, picObservations]);
  
  // Filter approvals by category and priority
  const filteredApprovals = useMemo(() => {
    let filtered = pendingApprovals.filter(a => a.status === 'pending');
    
    // Filter by category
    if (activeCategory !== 'all') {
      const actionTypes = CATEGORY_CONFIG[activeCategory].actionTypes;
      filtered = filtered.filter(a => actionTypes.includes(a.action_type));
    }
    
    // Filter by critical
    if (showCriticalOnly) {
      filtered = filtered.filter(a => a.priority === 'critical' || a.priority === 'high');
    }
    
    return filtered;
  }, [pendingApprovals, activeCategory, showCriticalOnly]);
  
  // Refresh handler with pull-to-refresh feel
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchPendingApprovals(), fetchPicObservations()]);
      toast({
        title: 'Refreshed',
        status: 'success',
        duration: 1500,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Refresh failed',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPendingApprovals, fetchPicObservations, toast]);
  
  // Load detail when expanding
  const handleViewDetails = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    
    if (!detailedApprovals[id]) {
      const detail = await getApprovalDetail(id);
      if (detail) {
        setDetailedApprovals(prev => ({ ...prev, [id]: detail }));
      }
    }
  }, [expandedId, detailedApprovals, getApprovalDetail]);
  
  // Approve handler
  const handleApprove = useCallback(async (id: string) => {
    const success = await approveAction(id);
    if (success) {
      toast({
        title: 'Action approved',
        description: 'The action has been executed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      toast({
        title: 'Approval failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [approveAction, toast]);
  
  // Reject handler
  const handleReject = useCallback(async (id: string, reason?: string) => {
    const success = await rejectAction(id, reason);
    if (success) {
      toast({
        title: 'Action rejected',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      toast({
        title: 'Rejection failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [rejectAction, toast]);
  
  // Batch approve
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    const ids = Array.from(selectedIds);
    
    // Separate PIC observations from regular approvals
    const picIds = ids.filter(id => id.startsWith('pic-')).map(id => id.replace('pic-', ''));
    const regularIds = ids.filter(id => !id.startsWith('pic-'));
    
    let allSuccess = true;
    
    // Handle regular approvals
    if (regularIds.length > 0) {
      const success = await batchApprove(regularIds);
      if (!success) allSuccess = false;
    }
    
    // Handle PIC observations individually
    for (const picId of picIds) {
      try {
        const response = await fetch(`${PIC_API}/learn/observations/${picId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true }),
        });
        if (!response.ok) allSuccess = false;
      } catch (err) {
        allSuccess = false;
      }
    }
    
    if (allSuccess) {
      toast({
        title: `Approved ${selectedIds.size} items`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      // Refresh PIC observations if any were approved
      if (picIds.length > 0) {
        await fetchPicObservations();
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      toast({
        title: 'Some approvals failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedIds, batchApprove, toast, fetchPicObservations]);
  
  // Batch reject
  const handleBatchReject = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    const ids = Array.from(selectedIds);
    
    // Separate PIC observations from regular approvals
    const picIds = ids.filter(id => id.startsWith('pic-')).map(id => id.replace('pic-', ''));
    const regularIds = ids.filter(id => !id.startsWith('pic-'));
    
    let allSuccess = true;
    
    // Handle regular approvals
    if (regularIds.length > 0) {
      const success = await batchReject(regularIds);
      if (!success) allSuccess = false;
    }
    
    // Handle PIC observations individually
    for (const picId of picIds) {
      try {
        const response = await fetch(`${PIC_API}/learn/observations/${picId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: false }),
        });
        if (!response.ok) allSuccess = false;
      } catch (err) {
        allSuccess = false;
      }
    }
    
    if (allSuccess) {
      toast({
        title: `Rejected ${selectedIds.size} items`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      // Refresh PIC observations if any were rejected
      if (picIds.length > 0) {
        await fetchPicObservations();
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      toast({
        title: 'Some rejections failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [selectedIds, batchReject, toast, fetchPicObservations]);
  
  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Select all visible
  const selectAll = () => {
    setSelectedIds(new Set(filteredApprovals.map(a => a.id)));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };
  
  // Semantic tokens for dashboard styling
  const bgBase = useSemanticToken('surface.base');
  const bgElevated = useSemanticToken('surface.elevated');
  const bgSecondary = useSemanticToken('surface.secondary');
  const bgTertiary = useSemanticToken('surface.tertiary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const borderDefault = useSemanticToken('border.default');
  const accentColor = useSemanticToken('interactive.primary');
  const statusError = useSemanticToken('status.error');
  const statusErrorSubtle = useSemanticToken('status.errorSubtle');
  
  return (
    <Box>
      {/* Modern chip-based category filters */}
      <Box mb={3}>
        <HStack
          spacing={2}
          mb={2}
          overflowX="auto"
          pb={2}
          css={{
            '&::-webkit-scrollbar': { height: '4px' },
            '&::-webkit-scrollbar-thumb': { background: borderSubtle, borderRadius: '2px' },
          }}
        >
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const count = categoryCounts[key as ApprovalCategory];
            const isActive = activeCategory === key;
            const CategoryIcon = config.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
                colorScheme={isActive ? 'blue' : 'gray'}
                leftIcon={<Icon as={CategoryIcon} boxSize={3.5} />}
                onClick={() => setActiveCategory(key as ApprovalCategory)}
                isDisabled={count === 0 && key !== 'all'}
                minW="fit-content"
                px={3}
                py={1}
                h="auto"
                fontSize="xs"
                fontWeight="500"
                borderRadius="full"
                bg={isActive ? 'blue.500' : bgSecondary}
                color={isActive ? 'white' : textPrimary}
                borderColor={isActive ? 'blue.500' : borderDefault}
                _hover={{
                  bg: isActive ? 'blue.600' : bgTertiary,
                  transform: 'translateY(-1px)',
                  shadow: 'sm',
                }}
                transition="all 0.2s"
              >
                {config.label}
                {count > 0 && (
                  <Badge
                    ml={1.5}
                    fontSize="9px"
                    px={1.5}
                    borderRadius="full"
                    bg={isActive ? 'whiteAlpha.300' : 'blackAlpha.100'}
                    color={isActive ? 'white' : textSecondary}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </HStack>
        
        {/* Quick filters row */}
        <HStack spacing={2} fontSize="xs">
          {criticalCount > 0 && (
            <Button
              size="xs"
              variant={showCriticalOnly ? 'solid' : 'ghost'}
              colorScheme={showCriticalOnly ? 'red' : 'gray'}
              leftIcon={<Icon as={FiAlertTriangle} boxSize={3} />}
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              borderRadius="full"
              px={2.5}
              h="24px"
              fontSize="10px"
            >
              Critical ({criticalCount})
            </Button>
          )}
          
          {/* Selection mode toggle */}
          <Button
            size="xs"
            variant={isSelectionMode ? 'solid' : 'ghost'}
            colorScheme={isSelectionMode ? 'blue' : 'gray'}
            leftIcon={<Icon as={FiCheckSquare} boxSize={3} />}
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            borderRadius="full"
            px={2.5}
            h="24px"
            fontSize="10px"
          >
            Select
          </Button>
          
          <Text color={textSecondary} fontSize="10px" ml="auto">
            {filteredApprovals.length + (activeCategory === 'personal' || activeCategory === 'all' ? picObservations.length : 0)} items
          </Text>
        </HStack>
      </Box>
      
      {/* Selection mode toolbar */}
      {isSelectionMode && (
        <Box 
          mb={3} 
          p={2.5} 
          bg={bgElevated} 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor={borderSubtle}
        >
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Checkbox
                size="sm"
                colorScheme="blue"
                isChecked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                isIndeterminate={selectedIds.size > 0 && selectedIds.size < filteredApprovals.length}
                onChange={e => e.target.checked ? selectAll() : clearSelection()}
              />
              <Text fontSize="xs" fontWeight="500" color={textPrimary}>
                {selectedIds.size === 0 ? 'Select items' : `${selectedIds.size} selected`}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="xs"
                colorScheme="green"
                variant="solid"
                onClick={handleBatchApprove}
                isDisabled={selectedIds.size === 0}
                leftIcon={<Icon as={FiCheck} />}
                fontSize="10px"
              >
                Approve
              </Button>
              <Button
                size="xs"
                colorScheme="red"
                variant="solid"
                onClick={handleBatchReject}
                isDisabled={selectedIds.size === 0}
                leftIcon={<Icon as={FiX} />}
                fontSize="10px"
              >
                Reject
              </Button>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Cancel selection"
                icon={<Icon as={FiX} />}
                onClick={clearSelection}
              />
            </HStack>
          </HStack>
        </Box>
      )}
      
      {/* Content area */}
      <Box>
        {isLoading && filteredApprovals.length === 0 ? (
          <Center h="200px">
            <VStack spacing={3}>
              <Spinner size="md" color={accentColor} thickness="2px" />
              <Text color={textSecondary} fontSize="xs">Loading...</Text>
            </VStack>
          </Center>
        ) : error ? (
          <Center h="200px">
            <VStack spacing={3}>
              <Icon as={FiAlertCircle} boxSize={6} color={statusError} />
              <Text color={textPrimary} fontSize="sm" fontWeight="500">
                Something went wrong
              </Text>
              <Button onClick={handleRefresh} size="xs" colorScheme="blue">
                Try Again
              </Button>
            </VStack>
          </Center>
        ) : filteredApprovals.length === 0 && (activeCategory === 'personal' ? picObservations.length === 0 : activeCategory !== 'all' || picObservations.length === 0) ? (
          <Center h="200px">
            <VStack spacing={2}>
              <Icon as={FiInbox} boxSize={8} color={textSecondary} opacity={0.5} />
              <Text color={textPrimary} fontSize="sm" fontWeight="500">
                All Clear
              </Text>
              <Text color={textSecondary} fontSize="xs" textAlign="center" maxW="250px">
                No pending approvals in this category.
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={2} align="stretch">
            <AnimatePresence mode="popLayout">
              {/* Regular approvals (not shown when personal filter is active) */}
              {activeCategory !== 'personal' && filteredApprovals.map((approval, index) => (
                <MotionBox
                  key={approval.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <HStack align="start" spacing={2}>
                    {isSelectionMode && (
                      <Box pt={2}>
                        <Checkbox
                          size="sm"
                          colorScheme="blue"
                          isChecked={selectedIds.has(approval.id)}
                          onChange={() => toggleSelection(approval.id)}
                        />
                      </Box>
                    )}
                    <Box flex={1}>
                      <ApprovalCard
                        approval={approval}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onViewDetails={handleViewDetails}
                        isExpanded={expandedId === approval.id}
                        detailedApproval={detailedApprovals[approval.id]}
                      />
                    </Box>
                  </HStack>
                </MotionBox>
              ))}
              
              {/* PIC observations (shown when personal or all filter is active) */}
              {(activeCategory === 'all' || activeCategory === 'personal') && picObservations.map((obs, index) => {
                const isEditing = editingPicId === obs.id;
                const isProcessing = processingPicIds.has(obs.id);
                return (
                  <MotionBox
                    key={`pic-${obs.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: (filteredApprovals.length + index) * 0.02 }}
                  >
                    <HStack align="start" spacing={2}>
                      {isSelectionMode && (
                        <Box pt={2}>
                          <Checkbox
                            size="sm"
                            colorScheme="blue"
                            isChecked={selectedIds.has(`pic-${obs.id}`)}
                            onChange={() => toggleSelection(`pic-${obs.id}`)}
                          />
                        </Box>
                      )}
                      <Box
                        flex={1}
                        bg={bgElevated}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={borderSubtle}
                        p={3}
                        opacity={isProcessing ? 0.6 : 1}
                      >
                      <Flex justify="space-between" align="start" mb={isEditing ? 3 : 0}>
                        <HStack spacing={2} flex={1} minW={0}>
                          <Badge colorScheme="teal" fontSize="9px" variant="subtle">Personal</Badge>
                          {obs.category && (
                            <Badge colorScheme="gray" fontSize="9px" variant="outline">{obs.category}</Badge>
                          )}
                          {!isEditing && (
                            <Text fontSize="sm" color={textPrimary} fontWeight="500" noOfLines={1}>
                              {obs.key}: {formatObservationValue(obs.key, obs.value)}
                            </Text>
                          )}
                        </HStack>
                        <HStack spacing={1}>
                          {isEditing ? (
                            <>
                              <Tooltip label="Save">
                                <IconButton
                                  aria-label="Save"
                                  icon={<FiSave size={14} />}
                                  size="xs"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleSavePic(obs.id)}
                                  isLoading={isProcessing}
                                />
                              </Tooltip>
                              <Tooltip label="Cancel">
                                <IconButton
                                  aria-label="Cancel"
                                  icon={<FiX size={14} />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={handleCancelEditPic}
                                />
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip label="Edit">
                                <IconButton
                                  aria-label="Edit"
                                  icon={<FiEdit2 size={14} />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => handleEditPic(obs)}
                                />
                              </Tooltip>
                              <Tooltip label="Approve">
                                <IconButton
                                  aria-label="Approve"
                                  icon={<FiCheck size={14} />}
                                  size="xs"
                                  colorScheme="green"
                                  variant="ghost"
                                  onClick={() => handleApprovePic(obs.id)}
                                  isLoading={isProcessing}
                                />
                              </Tooltip>
                              <Tooltip label="Reject">
                                <IconButton
                                  aria-label="Reject"
                                  icon={<FiX size={14} />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleRejectPic(obs.id)}
                                  isLoading={isProcessing}
                                />
                              </Tooltip>
                            </>
                          )}
                        </HStack>
                      </Flex>
                      
                      {isEditing && (
                        <VStack spacing={2} align="stretch">
                          <HStack spacing={2}>
                            <Box flex={1}>
                              <Text fontSize="xs" color={textSecondary} mb={1}>Key</Text>
                              <input
                                value={editedKey}
                                onChange={(e) => setEditedKey(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  fontSize: '13px',
                                  borderRadius: '6px',
                                  border: `1px solid ${borderSubtle}`,
                                  background: bgBase,
                                }}
                              />
                            </Box>
                            <Box flex={2}>
                              <Text fontSize="xs" color={textSecondary} mb={1}>Value</Text>
                              <input
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  fontSize: '13px',
                                  borderRadius: '6px',
                                  border: `1px solid ${borderSubtle}`,
                                  background: bgBase,
                                }}
                              />
                            </Box>
                          </HStack>
                          <Box>
                            <Text fontSize="xs" color={textSecondary} mb={1}>Explanation</Text>
                            <textarea
                              value={editedExplanation}
                              onChange={(e) => setEditedExplanation(e.target.value)}
                              placeholder="What does this mean?"
                              rows={2}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: `1px solid ${borderSubtle}`,
                                background: bgBase,
                                resize: 'none',
                              }}
                            />
                          </Box>
                        </VStack>
                      )}
                      
                      {!isEditing && obs.explanation && (
                        <Text fontSize="xs" color={textSecondary} mt={1} noOfLines={2}>
                          {obs.explanation}
                        </Text>
                      )}
                      
                      {!isEditing && (
                        <HStack spacing={3} mt={2} fontSize="10px" color={textSecondary}>
                          <Text>{obs.source_agent}</Text>
                          <Text>{new Date(obs.created_at).toLocaleDateString()}</Text>
                        </HStack>
                      )}
                    </Box>
                    </HStack>
                  </MotionBox>
                );
              })}
            </AnimatePresence>
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export default ApprovalQueue;
