/**
 * Email Client - Apple Mail Inspired Design
 * 
 * Professional email client modeled after Apple Mail with:
 * - Left sidebar: Favorites, Smart Mailboxes, iCloud, accounts
 * - Email list with colored unread dots and multi-line preview
 * - Toolbar with standard mail actions
 * - Email Intelligence panel integration on the right
 * 
 * @module pages/email
 * @version 8.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRightPanel } from '@/contexts/RightPanelContext';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Spinner,
  useToast,
  Tooltip,
  Collapse,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  InboxIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  FlagIcon,
  ClockIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  TagIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  SparklesIcon,
  ChartBarIcon,
  NewspaperIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, FlagIcon as FlagSolidIcon } from '@heroicons/react/24/solid';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { EmailIntelligencePanel } from '@/components/email-agent/EmailIntelligencePanel';

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8780';

interface EmailItem {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_email?: string;
  date: string;
  snippet: string;
  body?: string;
  body_html?: string;
  is_read: boolean;
  is_starred: boolean;
  is_sent: boolean;
  category?: string;
}

interface Account {
  id: string;
  email: string;
  name: string;
  color: string;
}

interface FolderItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  count?: number;
  color?: string;
}

export default function EmailClient() {
  const toast = useToast();
  const { data: session } = useSession();
  const { setContext, setCustomData, setIsOpen, setActiveTab } = useRightPanel();
  
  const [activeMailbox, setActiveMailbox] = useState<string>('inbox');
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    smartMailboxes: false,
    insights: true,
    icloud: false,
    work: false,
  });

  // Accounts
  const accounts: Account[] = useMemo(() => [
    { id: 'icloud', email: 'eleazarf@icloud.com', name: 'iCloud', color: '#007AFF' },
    { id: 'work', email: 'eflores2@houstonmethodist.org', name: 'Houston Methodist', color: '#C41E3A' },
  ], []);

  // Use dashboard semantic tokens for theme consistency
  const bgApp = useSemanticToken('bg.primary');
  const bgSidebar = useSemanticToken('bg.secondary');
  const bgList = useSemanticToken('bg.elevated');
  const bgContent = useSemanticToken('bg.primary');
  const bgHover = useSemanticToken('bg.tertiary');
  const bgSelected = useSemanticToken('interactive.primary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textMuted = useSemanticToken('text.muted');
  const textOnSelected = '#FFFFFF';
  const border = useSemanticToken('border.default');
  const borderSubtle = useSemanticToken('border.subtle');
  const accent = useSemanticToken('interactive.primary');
  const unreadDot = useSemanticToken('interactive.primary');

  // Fetch emails
  const fetchEmails = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const folder = activeMailbox === 'sent' ? 'sent' : 'inbox';
      const response = await fetch(
        `/api/hermes-proxy?path=v1/emails/recent&folder=${folder}&limit=100&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        // Preserve read state of currently selected email
        const updatedEmails = data.emails || [];
        if (selectedEmail) {
          const currentSelectedInNew = updatedEmails.find((e: EmailItem) => e.id === selectedEmail.id);
          if (currentSelectedInNew && selectedEmail.is_read && !currentSelectedInNew.is_read) {
            currentSelectedInNew.is_read = true;
          }
        }
        setEmails(updatedEmails);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeMailbox, selectedEmail]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Auto-refresh every 2 minutes (silent background refresh)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      fetchEmails(true); // Silent refresh to prevent blinking
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [fetchEmails, autoRefreshEnabled]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails(false); // Show loading for manual refresh
    setRefreshing(false);
    toast({
      title: 'Emails refreshed',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Mark as read/unread
  const handleToggleRead = async (email: EmailItem) => {
    try {
      const response = await fetch('/api/hermes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/emails/${email.id}/read`,
          method: 'PUT',
          body: { is_read: !email.is_read }
        })
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_read: !e.is_read } : e
        ));
        if (selectedEmail?.id === email.id) {
          setSelectedEmail({ ...email, is_read: !email.is_read });
        }
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error);
      toast({
        title: 'Failed to update email',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Toggle flag/star
  const handleToggleFlag = async (email: EmailItem) => {
    try {
      const response = await fetch('/api/hermes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/emails/${email.id}/flag`,
          method: 'PUT',
          body: { is_starred: !email.is_starred }
        })
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
        ));
        if (selectedEmail?.id === email.id) {
          setSelectedEmail({ ...email, is_starred: !email.is_starred });
        }
        toast({
          title: email.is_starred ? 'Unflagged' : 'Flagged',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to toggle flag:', error);
      toast({
        title: 'Failed to flag email',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Delete email
  const handleDelete = async (email: EmailItem) => {
    try {
      const response = await fetch('/api/hermes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/emails/${email.id}`,
          method: 'DELETE'
        })
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        toast({
          title: 'Email deleted',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
      toast({
        title: 'Failed to delete email',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Archive email
  const handleArchive = async (email: EmailItem) => {
    try {
      const response = await fetch('/api/hermes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/emails/${email.id}/archive`,
          method: 'PUT'
        })
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        toast({
          title: 'Email archived',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
      toast({
        title: 'Failed to archive email',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Filter emails
  const filteredEmails = useMemo(() => {
    let filtered = emails;
    
    // Filter by account
    if (activeAccount !== 'all') {
      const account = accounts.find(a => a.id === activeAccount);
      if (account) {
        filtered = filtered.filter(e => {
          const emailLower = account.email.toLowerCase();
          return e.from_email?.toLowerCase().includes(emailLower) ||
                 e.to_email?.toLowerCase().includes(emailLower);
        });
      }
    }
    
    // Filter by mailbox type
    if (activeMailbox === 'flagged') {
      filtered = filtered.filter(e => e.is_starred);
    } else if (activeMailbox === 'unread') {
      filtered = filtered.filter(e => !e.is_read);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.subject?.toLowerCase().includes(query) ||
        e.from_email?.toLowerCase().includes(query) ||
        e.from_name?.toLowerCase().includes(query) ||
        e.snippet?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [emails, activeAccount, accounts, searchQuery, activeMailbox]);

  // Handle email selection - only updates content, doesn't trigger layout changes
  const handleEmailSelect = useCallback(async (email: EmailItem) => {
    // Optimistically update UI immediately
    const updatedEmail = { ...email, is_read: true };
    setSelectedEmail(updatedEmail);
    
    // Update local state immediately for responsive UI
    setEmails(prev => prev.map(e => 
      e.id === email.id ? { ...e, is_read: true } : e
    ));
    
    // Mark as read in backend if unread
    if (!email.is_read) {
      try {
        await fetch('/api/hermes-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `v1/emails/${email.id}/read`,
            method: 'PUT',
            body: { is_read: true }
          })
        });
      } catch (error) {
        console.error('Failed to mark email as read:', error);
        // Revert on error
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_read: email.is_read } : e
        ));
      }
    }
  }, []);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Format date Apple Mail style
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (hours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Get sender display
  const getSenderName = (email: EmailItem): string => {
    if (email.from_name) return email.from_name;
    return email.from_email?.split('@')[0] || 'Unknown';
  };

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px)" bg={bgApp} position="relative" overflow="hidden">
        
        {/* Left Sidebar - Compact Apple Mail Style */}
        <Box
          w="180px"
          minW="180px"
          h="100%"
          bg={bgSidebar}
          borderRight="1px solid"
          borderColor={border}
          overflowY="auto"
          py={1}
          fontSize="12px"
        >
          {/* Favorites Section */}
          <SidebarSection
            title="Favorites"
            isExpanded={expandedSections.favorites}
            onToggle={() => toggleSection('favorites')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<InboxIcon className="w-4 h-4" />}
              label="Inbox"
              count={emails.filter(e => !e.is_read).length}
              isActive={activeMailbox === 'inbox' && activeAccount === 'all'}
              onClick={() => { setActiveMailbox('inbox'); setActiveAccount('all'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#0A84FF"
            />
            <SidebarItem
              icon={<FlagSolidIcon className="w-4 h-4" />}
              label="Flagged"
              isActive={activeMailbox === 'flagged'}
              onClick={() => setActiveMailbox('flagged')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF9500"
            />
            <SidebarItem
              icon={<PaperAirplaneIcon className="w-4 h-4" />}
              label="Sent"
              isActive={activeMailbox === 'sent'}
              onClick={() => setActiveMailbox('sent')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#34C759"
            />
          </SidebarSection>

          {/* Smart Mailboxes */}
          <SidebarSection
            title="Smart Mailboxes"
            isExpanded={expandedSections.smartMailboxes}
            onToggle={() => toggleSection('smartMailboxes')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<EnvelopeIcon className="w-4 h-4" />}
              label="Unread"
              count={emails.filter(e => !e.is_read).length}
              isActive={activeMailbox === 'unread'}
              onClick={() => setActiveMailbox('unread')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#AF52DE"
            />
            <SidebarItem
              icon={<ClockIcon className="w-4 h-4" />}
              label="Today"
              isActive={activeMailbox === 'today'}
              onClick={() => setActiveMailbox('today')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF3B30"
            />
          </SidebarSection>

          {/* Email Insights */}
          <SidebarSection
            title="Insights"
            isExpanded={expandedSections.insights}
            onToggle={() => toggleSection('insights')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<NewspaperIcon className="w-4 h-4" />}
              label="Daily Briefing"
              isActive={activeMailbox === 'briefing'}
              onClick={() => window.location.href = '/email-insights'}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF9F0A"
            />
            <SidebarItem
              icon={<ChartBarIcon className="w-4 h-4" />}
              label="Metrics"
              isActive={activeMailbox === 'metrics'}
              onClick={() => window.location.href = '/email-metrics'}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#30D158"
            />
            <SidebarItem
              icon={<SparklesIcon className="w-4 h-4" />}
              label="AI Analysis"
              isActive={activeMailbox === 'analysis'}
              onClick={() => window.location.href = '/email-analysis'}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#BF5AF2"
            />
          </SidebarSection>

          {/* iCloud Account */}
          <SidebarSection
            title="iCloud"
            isExpanded={expandedSections.icloud}
            onToggle={() => toggleSection('icloud')}
            textSecondary={textSecondary}
            indicator="#007AFF"
          >
            <SidebarItem
              icon={<InboxIcon className="w-4 h-4" />}
              label="Inbox"
              isActive={activeMailbox === 'inbox' && activeAccount === 'icloud'}
              onClick={() => { setActiveMailbox('inbox'); setActiveAccount('icloud'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<FolderIcon className="w-4 h-4" />}
              label="Drafts"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<PaperAirplaneIcon className="w-4 h-4" />}
              label="Sent"
              isActive={activeMailbox === 'sent' && activeAccount === 'icloud'}
              onClick={() => { setActiveMailbox('sent'); setActiveAccount('icloud'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<ArchiveBoxIcon className="w-4 h-4" />}
              label="Archive"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<TrashIcon className="w-4 h-4" />}
              label="Trash"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
          </SidebarSection>

          {/* Work Account */}
          <SidebarSection
            title="Houston Methodist"
            isExpanded={expandedSections.work}
            onToggle={() => toggleSection('work')}
            textSecondary={textSecondary}
            indicator="#C41E3A"
          >
            <SidebarItem
              icon={<InboxIcon className="w-4 h-4" />}
              label="Inbox"
              isActive={activeMailbox === 'inbox' && activeAccount === 'work'}
              onClick={() => { setActiveMailbox('inbox'); setActiveAccount('work'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<PaperAirplaneIcon className="w-4 h-4" />}
              label="Sent"
              isActive={activeMailbox === 'sent' && activeAccount === 'work'}
              onClick={() => { setActiveMailbox('sent'); setActiveAccount('work'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<TrashIcon className="w-4 h-4" />}
              label="Trash"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
          </SidebarSection>
        </Box>

        {/* Email List */}
        <Box
          w="340px"
          minW="340px"
          h="100%"
          bg={bgList}
          borderRight="1px solid"
          borderColor={border}
          display="flex"
          flexDirection="column"
        >
          {/* Search Bar */}
          <Box px={3} py={2} borderBottom="1px solid" borderColor={border}>
            <InputGroup size="sm">
              <InputLeftElement>
                <MagnifyingGlassIcon className="w-4 h-4" style={{ color: textSecondary }} />
              </InputLeftElement>
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg={bgSidebar}
                border="none"
                borderRadius="6px"
                fontSize="13px"
                _placeholder={{ color: textSecondary }}
                _focus={{ boxShadow: 'none' }}
              />
            </InputGroup>
          </Box>

          {/* List Header */}
          <HStack px={3} py={2} borderBottom="1px solid" borderColor={border} justify="space-between">
            <HStack spacing={2}>
              <Text fontSize="12px" fontWeight="600" color={textPrimary}>
                {activeMailbox === 'inbox' ? 'Inbox' : 
                 activeMailbox === 'sent' ? 'Sent' :
                 activeMailbox === 'flagged' ? 'Flagged' :
                 activeMailbox === 'unread' ? 'Unread' : 'All Mail'}
              </Text>
              <Text fontSize="12px" color={textSecondary}>
                {filteredEmails.length} messages
              </Text>
            </HStack>
            <Tooltip label="Refresh emails" placement="bottom">
              <IconButton
                aria-label="Refresh"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                size="xs"
                variant="ghost"
                color={textSecondary}
                isLoading={refreshing}
                onClick={handleRefresh}
                _hover={{ bg: bgHover }}
              />
            </Tooltip>
          </HStack>

          {/* Email List */}
          <Box flex={1} overflowY="auto">
            {loading ? (
              <Flex justify="center" align="center" h="100px">
                <Spinner size="sm" color={textSecondary} />
              </Flex>
            ) : filteredEmails.length === 0 ? (
              <Flex justify="center" align="center" h="100px">
                <Text fontSize="13px" color={textSecondary}>No messages</Text>
              </Flex>
            ) : (
              filteredEmails.map((email) => (
                <Box
                  key={email.id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  bg={selectedEmail?.id === email.id ? bgSelected : 'transparent'}
                  _hover={{ bg: selectedEmail?.id === email.id ? bgSelected : bgHover }}
                  onClick={() => handleEmailSelect(email)}
                  borderBottom="1px solid"
                  borderColor={border}
                  transition="none"
                >
                  <HStack align="start" spacing={2}>
                    {/* Unread indicator */}
                    <Box w="8px" pt="6px">
                      {!email.is_read && (
                        <Box w="8px" h="8px" borderRadius="full" bg={unreadDot} />
                      )}
                    </Box>
                    
                    <Box flex={1} minW={0}>
                      {/* Sender and Date */}
                      <HStack justify="space-between" mb={0.5}>
                        <Text
                          fontSize="13px"
                          fontWeight={email.is_read ? '400' : '600'}
                          color={selectedEmail?.id === email.id ? textOnSelected : textPrimary}
                          noOfLines={1}
                        >
                          {getSenderName(email)}
                        </Text>
                        <Text
                          fontSize="11px"
                          color={selectedEmail?.id === email.id ? textOnSelected : textSecondary}
                          flexShrink={0}
                        >
                          {formatDate(email.date)}
                        </Text>
                      </HStack>
                      
                      {/* Subject */}
                      <Text
                        fontSize="12px"
                        fontWeight={email.is_read ? '400' : '500'}
                        color={selectedEmail?.id === email.id ? textOnSelected : textPrimary}
                        noOfLines={1}
                        mb={0.5}
                      >
                        {email.subject || '(No Subject)'}
                      </Text>
                      
                      {/* Preview */}
                      <Text
                        fontSize="12px"
                        color={selectedEmail?.id === email.id ? 'whiteAlpha.800' : textSecondary}
                        noOfLines={2}
                        lineHeight="1.4"
                      >
                        {email.snippet}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Email Content */}
        <Box flex={1} h="100%" bg={bgContent} display="flex" flexDirection="row">
          {/* Email Viewer */}
          <Box flex={1} display="flex" flexDirection="column" borderRight="1px solid" borderColor={border}>
          {selectedEmail ? (
            <>
              {/* Toolbar */}
              <HStack
                px={4}
                py={2}
                borderBottom="1px solid"
                borderColor={border}
                spacing={1}
                bg={bgSidebar}
              >
                <Tooltip label="Reply" placement="bottom">
                  <IconButton
                    aria-label="Reply"
                    icon={<ArrowUturnLeftIcon className="w-5 h-5" />}
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Tooltip label="Reply All" placement="bottom">
                  <IconButton
                    aria-label="Reply All"
                    icon={<ArrowUturnLeftIcon className="w-5 h-5" />}
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Tooltip label="Forward" placement="bottom">
                  <IconButton
                    aria-label="Forward"
                    icon={<ArrowUturnRightIcon className="w-5 h-5" />}
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Box w="1px" h="20px" bg={border} mx={1} />
                <Tooltip label="Archive" placement="bottom">
                  <IconButton
                    aria-label="Archive"
                    icon={<ArchiveBoxIcon className="w-5 h-5" />}
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    onClick={() => selectedEmail && handleArchive(selectedEmail)}
                    isDisabled={!selectedEmail}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Tooltip label="Delete" placement="bottom">
                  <IconButton
                    aria-label="Delete"
                    icon={<TrashIcon className="w-5 h-5" />}
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    onClick={() => selectedEmail && handleDelete(selectedEmail)}
                    isDisabled={!selectedEmail}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Tooltip label={selectedEmail?.is_starred ? "Unflag" : "Flag"} placement="bottom">
                  <IconButton
                    aria-label="Flag"
                    icon={selectedEmail?.is_starred ? 
                      <FlagSolidIcon className="w-5 h-5" /> : 
                      <FlagIcon className="w-5 h-5" />
                    }
                    size="sm"
                    variant="ghost"
                    color={selectedEmail?.is_starred ? "#FF9500" : textSecondary}
                    onClick={() => selectedEmail && handleToggleFlag(selectedEmail)}
                    isDisabled={!selectedEmail}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Tooltip label={selectedEmail?.is_read ? "Mark Unread" : "Mark Read"} placement="bottom">
                  <IconButton
                    aria-label="Toggle Read"
                    icon={selectedEmail?.is_read ? 
                      <EnvelopeOpenIcon className="w-5 h-5" /> : 
                      <EnvelopeIcon className="w-5 h-5" />
                    }
                    size="sm"
                    variant="ghost"
                    color={textSecondary}
                    onClick={() => selectedEmail && handleToggleRead(selectedEmail)}
                    isDisabled={!selectedEmail}
                    _hover={{ bg: bgHover }}
                  />
                </Tooltip>
                <Box flex={1} />
                <InputGroup size="sm" w="200px">
                  <InputLeftElement>
                    <MagnifyingGlassIcon className="w-4 h-4" style={{ color: textSecondary }} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search"
                    bg={bgList}
                    border="none"
                    borderRadius="6px"
                    fontSize="12px"
                  />
                </InputGroup>
              </HStack>

              {/* Email Header */}
              <Box px={6} py={4} borderBottom="1px solid" borderColor={border}>
                <Text fontSize="18px" fontWeight="500" color={textPrimary} mb={3}>
                  {selectedEmail.subject || '(No Subject)'}
                </Text>
                <HStack spacing={3} align="start">
                  <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={bgSelected}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="14px"
                    fontWeight="500"
                    flexShrink={0}
                  >
                    {getSenderName(selectedEmail).charAt(0).toUpperCase()}
                  </Box>
                  <Box flex={1}>
                    <HStack justify="space-between">
                      <Text fontSize="14px" fontWeight="500" color={textPrimary}>
                        {getSenderName(selectedEmail)}
                      </Text>
                      <Text fontSize="12px" color={textSecondary}>
                        {new Date(selectedEmail.date).toLocaleString([], {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </Text>
                    </HStack>
                    <Text fontSize="12px" color={textSecondary}>
                      {selectedEmail.from_email}
                    </Text>
                    <Text fontSize="12px" color={textSecondary} mt={1}>
                      To: {selectedEmail.to_email || session?.user?.email || 'me'}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              {/* Email Body - Full Height */}
              <Box flex={1} overflowY="auto" px={6} py={4} minH={0}>
                {selectedEmail.body_html ? (
                  <Box
                    as="iframe"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <style>
                            * { box-sizing: border-box; }
                            body {
                              margin: 0;
                              padding: 0;
                              font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
                              font-size: 14px;
                              line-height: 1.5;
                              color: #1D1D1F;
                              background: transparent;
                            }
                            img { max-width: 100%; height: auto; }
                            a { color: #0A84FF; }
                            table { max-width: 100%; }
                          </style>
                        </head>
                        <body>${selectedEmail.body_html}</body>
                      </html>
                    `}
                    width="100%"
                    h="100%"
                    minH="600px"
                    border="none"
                    sx={{ border: 'none' }}
                  />
                ) : (
                  <Text fontSize="14px" lineHeight="1.6" color={textPrimary} whiteSpace="pre-wrap">
                    {selectedEmail.body || selectedEmail.snippet}
                  </Text>
                )}
              </Box>
            </>
          ) : (
            <Flex justify="center" align="center" h="100%">
              <VStack spacing={2}>
                <EnvelopeIcon className="w-12 h-12" style={{ color: textSecondary, opacity: 0.5 }} />
                <Text fontSize="14px" color={textSecondary}>
                  No Message Selected
                </Text>
              </VStack>
            </Flex>
          )}
          </Box>

          {/* Email Intelligence Panel - Always rendered, static width */}
          <Box 
            w="400px" 
            minW="400px" 
            h="100%" 
            bg={bgSidebar}
            overflowY="auto"
            display={selectedEmail ? 'block' : 'none'}
          >
            {selectedEmail && (
              <EmailIntelligencePanel email={selectedEmail} />
            )}
          </Box>
        </Box>
      </Flex>
    </DashboardLayout>
  );
}

// Sidebar Section Component
interface SidebarSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  textSecondary: string;
  indicator?: string;
  children: React.ReactNode;
}

function SidebarSection({ title, isExpanded, onToggle, textSecondary, indicator, children }: SidebarSectionProps) {
  return (
    <Box mb={0.5}>
      <HStack
        px={2}
        py={0.5}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ opacity: 0.8 }}
        spacing={1}
      >
        <Box color={textSecondary} transform={isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'} transition="transform 0.15s">
          <ChevronDownIcon className="w-2.5 h-2.5" />
        </Box>
        {indicator && (
          <Box w="6px" h="6px" borderRadius="full" bg={indicator} />
        )}
        <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="0.02em">
          {title}
        </Text>
      </HStack>
      <Collapse in={isExpanded}>
        <VStack spacing={0} align="stretch" pl={1}>
          {children}
        </VStack>
      </Collapse>
    </Box>
  );
}

// Sidebar Item Component
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  bgHover: string;
  bgSelected: string;
  textPrimary: string;
  textSecondary: string;
  textOnSelected: string;
  iconColor?: string;
}

function SidebarItem({
  icon,
  label,
  count,
  isActive,
  onClick,
  bgHover,
  bgSelected,
  textPrimary,
  textSecondary,
  textOnSelected,
  iconColor,
}: SidebarItemProps) {
  return (
    <HStack
      px={2}
      py={1}
      mx={0.5}
      cursor="pointer"
      bg={isActive ? bgSelected : 'transparent'}
      borderRadius="3px"
      _hover={{ bg: isActive ? bgSelected : bgHover }}
      onClick={onClick}
      transition="background 0.1s"
      spacing={1.5}
    >
      <Box color={isActive ? textOnSelected : (iconColor || textSecondary)} flexShrink={0}>
        {icon}
      </Box>
      <Text
        flex={1}
        fontSize="12px"
        fontWeight={isActive ? '500' : '400'}
        color={isActive ? textOnSelected : textPrimary}
        noOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <Text fontSize="10px" color={isActive ? textOnSelected : textSecondary}>
          {count}
        </Text>
      )}
    </HStack>
  );
}
