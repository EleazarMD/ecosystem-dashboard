/**
 * Email Client - Properly Engineered Version
 * 
 * Key optimizations:
 * - Memoized email list items to prevent unnecessary re-renders
 * - Separate read state tracking to avoid full list updates
 * - Static layout with no conditional mounting/unmounting
 * - Optimized callbacks with proper dependencies
 * 
 * @module pages/email
 * @version 9.0.0
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
  Button,
  Spinner,
  useToast,
  Tooltip,
  Collapse,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
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
  ArrowPathIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  NewspaperIcon,
  ChartBarIcon,
  SparklesIcon,
  PaperClipIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, FlagIcon as FlagSolidIcon } from '@heroicons/react/24/solid';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useEmailToolsMenu } from '@/components/email-agent/EmailToolsMenu';
import { ContextMenuEngine } from '@/lib/context-menu';
import EmailDraftStudio from '@/components/email-agent/EmailDraftStudio';

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8780';

/**
 * Escape HTML-special characters and auto-linkify URLs and bare email
 * addresses in a plain-text body. Used only for emails that lack a
 * body_html part — we inject the result via dangerouslySetInnerHTML so
 * URLs remain clickable instead of rendering as static text.
 *
 * Safe against XSS because we HTML-escape every character before the
 * linkification regex runs; the only tags we emit are our own `<a>`s.
 */
function linkifyPlainText(raw: string): string {
  const esc = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // URL regex: http(s):// ... stopping at whitespace or common sentence
  // terminators. The trailing-punctuation strip below puts any .,;!?) back
  // outside the anchor so "see https://x.com/foo." doesn't include the dot.
  const urlRe = /\bhttps?:\/\/[^\s<>"']+/g;
  let out = esc.replace(urlRe, (m) => {
    let tail = '';
    while (m.length && /[.,;:!?)\]]/.test(m.slice(-1))) {
      tail = m.slice(-1) + tail;
      m = m.slice(0, -1);
    }
    return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>${tail}`;
  });
  // Bare email addresses → mailto: links
  out = out.replace(
    /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    (m) => `<a href="mailto:${m}">${m}</a>`
  );
  return out;
}

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
  attachments?: Array<{ filename: string; content_type: string; size?: number; is_inline?: boolean }>;
  priority_score?: number;
  priority_level?: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  removal_category?: 'spam' | 'marketing' | 'malicious' | 'unwanted_bloat' | 'keep';
  removal_confidence?: number;
  removal_reason?: string;
}

interface Account {
  id: string;
  email: string;
  name: string;
  color: string;
}

// Memoized Email List Item Component
const EmailListItem = memo(({ 
  email, 
  isSelected, 
  onSelect,
  onContextMenu,
  bgSelected,
  bgHover,
  border,
  textPrimary,
  textSecondary,
  textOnSelected,
  unreadDot,
}: {
  email: EmailItem;
  isSelected: boolean;
  onSelect: (email: EmailItem) => void;
  onContextMenu?: (e: React.MouseEvent, email: EmailItem) => void;
  bgSelected: string;
  bgHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textOnSelected: string;
  unreadDot: string;
}) => {
  const handleClick = useCallback(() => {
    onSelect(email);
  }, [email, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    onContextMenu?.(e, email);
  }, [email, onContextMenu]);

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

  const getSenderName = (): string => {
    if (email.from_name) return email.from_name;
    return email.from_email?.split('@')[0] || 'Unknown';
  };

  return (
    <Box
      px={3}
      py={2}
      cursor="pointer"
      bg={isSelected ? bgSelected : 'transparent'}
      _hover={{ bg: isSelected ? bgSelected : bgHover }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      borderBottom="1px solid"
      borderColor={border}
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
            <HStack spacing={1} flex={1} minW={0}>
              <Text
                fontSize="13px"
                fontWeight={email.is_read ? '400' : '600'}
                color={isSelected ? textOnSelected : textPrimary}
                noOfLines={1}
              >
                {getSenderName()}
              </Text>
              {email.priority_level === 'critical' && (
                <Box w="6px" h="6px" borderRadius="full" bg="red.500" flexShrink={0} />
              )}
              {email.priority_level === 'high' && (
                <Box w="6px" h="6px" borderRadius="full" bg="orange.500" flexShrink={0} />
              )}
              {/* Removal detection indicators */}
              {(email.removal_category === 'malicious' || email.removal_category === 'spam') && (
                <Tooltip label={email.removal_reason || 'Spam/Malicious detected'}>
                  <Box w="6px" h="6px" borderRadius="full" bg="red.600" flexShrink={0} />
                </Tooltip>
              )}
              {email.removal_category === 'marketing' && (
                <Tooltip label={email.removal_reason || 'Marketing email with low engagement'}>
                  <Box w="6px" h="6px" borderRadius="full" bg="orange.400" flexShrink={0} />
                </Tooltip>
              )}
              {email.removal_category === 'unwanted_bloat' && (
                <Tooltip label={email.removal_reason || 'Low engagement pattern detected'}>
                  <Box w="6px" h="6px" borderRadius="full" bg="yellow.500" flexShrink={0} />
                </Tooltip>
              )}
              {Array.isArray(email.attachments) && email.attachments.filter(a => !a.is_inline).length > 0 && (
                <Box as={PaperClipIcon} w="14px" h="14px" color={isSelected ? textOnSelected : textSecondary} flexShrink={0} />
              )}
            </HStack>
            <Text
              fontSize="11px"
              color={isSelected ? textOnSelected : textSecondary}
              flexShrink={0}
              ml={2}
            >
              {formatDate(email.date)}
            </Text>
          </HStack>
          
          {/* Subject */}
          <Text
            fontSize="13px"
            fontWeight={email.is_read ? '400' : '600'}
            color={isSelected ? textOnSelected : textPrimary}
            noOfLines={1}
            mb={0.5}
          >
            {email.subject || '(No Subject)'}
          </Text>
          
          {/* Preview */}
          <Text
            fontSize="12px"
            color={isSelected ? 'whiteAlpha.800' : textSecondary}
            noOfLines={2}
            lineHeight="1.4"
          >
            {email.snippet}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders
  return (
    prevProps.email.id === nextProps.email.id &&
    prevProps.email.is_read === nextProps.email.is_read &&
    prevProps.email.is_starred === nextProps.email.is_starred &&
    prevProps.isSelected === nextProps.isSelected &&
    (prevProps.email.attachments?.length || 0) === (nextProps.email.attachments?.length || 0)
  );
});

EmailListItem.displayName = 'EmailListItem';

export default function EmailClient() {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const { setCustomData } = useRightPanel();
  
  
  // Context menu for email actions
  const { isOpen: menuOpen, position: menuPosition, config: menuConfig, close: closeMenu, openForEmail } = useEmailToolsMenu();
  
  // State
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState<string>('inbox');
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterCategories, setFilterCategories] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    smartMailboxes: false,
    insights: true,
    icloud: false,
    work: false,
  });
  
  // Soft-deleted emails - persisted in localStorage so they stay deleted across refreshes
  // These will be synced to Mac Agent by Hermes Core for permanent deletion
  const [deletedEmailIds, setDeletedEmailIds] = useState<Set<string>>(new Set());
  const [deletedIdsLoaded, setDeletedIdsLoaded] = useState(false);
  
  // Blocked domains and senders - persisted in localStorage
  const [blockedDomains, setBlockedDomains] = useState<Set<string>>(new Set());
  const [blockedSenders, setBlockedSenders] = useState<Set<string>>(new Set());
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  
  // Email Draft Studio state
  const [draftStudioOpen, setDraftStudioOpen] = useState(false);
  const [draftStudioEmail, setDraftStudioEmail] = useState<EmailItem | null>(null);
  
  // Load deleted emails from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem('deletedEmailIds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // SAFETY: If deletedEmailIds has grown too large (>1000), clear it
        // This prevents accidental mass-deletion bugs from blocking all emails
        if (Array.isArray(parsed) && parsed.length > 1000) {
          console.warn('[Email] deletedEmailIds too large (' + parsed.length + '), clearing');
          localStorage.removeItem('deletedEmailIds');
        } else {
          setDeletedEmailIds(new Set(parsed));
        }
      } catch (e) {
        console.error('Failed to parse deletedEmailIds from localStorage');
        localStorage.removeItem('deletedEmailIds');
      }
    }
    setDeletedIdsLoaded(true);
  }, []);
  
  // Load blocked domains and senders from localStorage
  useEffect(() => {
    const storedDomains = localStorage.getItem('blockedDomains');
    const storedSenders = localStorage.getItem('blockedSenders');
    if (storedDomains) {
      try {
        const parsed = JSON.parse(storedDomains);
        // SAFETY: Clear if too large
        if (Array.isArray(parsed) && parsed.length > 500) {
          console.warn('[Email] blockedDomains too large, clearing');
          localStorage.removeItem('blockedDomains');
        } else {
          setBlockedDomains(new Set(parsed));
        }
      } catch (e) {
        console.error('Failed to parse blockedDomains from localStorage');
        localStorage.removeItem('blockedDomains');
      }
    }
    if (storedSenders) {
      try {
        const parsed = JSON.parse(storedSenders);
        // SAFETY: Clear if too large
        if (Array.isArray(parsed) && parsed.length > 500) {
          console.warn('[Email] blockedSenders too large, clearing');
          localStorage.removeItem('blockedSenders');
        } else {
          setBlockedSenders(new Set(parsed));
        }
      } catch (e) {
        console.error('Failed to parse blockedSenders from localStorage');
        localStorage.removeItem('blockedSenders');
      }
    }
    setBlockedLoaded(true);
  }, []);
  
  // Persist deleted emails to localStorage when they change
  useEffect(() => {
    if (deletedIdsLoaded) {
      localStorage.setItem('deletedEmailIds', JSON.stringify(Array.from(deletedEmailIds)));
    }
  }, [deletedEmailIds, deletedIdsLoaded]);
  
  // Persist blocked domains and senders to localStorage
  useEffect(() => {
    if (blockedLoaded) {
      localStorage.setItem('blockedDomains', JSON.stringify(Array.from(blockedDomains)));
      localStorage.setItem('blockedSenders', JSON.stringify(Array.from(blockedSenders)));
    }
  }, [blockedDomains, blockedSenders, blockedLoaded]);

  // Accounts
  const accounts: Account[] = useMemo(() => [
    { id: 'icloud', email: 'eleazarf@icloud.com', name: 'iCloud', color: '#007AFF' },
    { id: 'work', email: 'eflores2@houstonmethodist.org', name: 'Houston Methodist', color: '#C41E3A' },
  ], []);

  // Theme tokens
  const bgApp = useSemanticToken('surface.base');
  const bgSidebar = useSemanticToken('surface.elevated');
  const bgContent = useSemanticToken('surface.raised');
  const bgHover = useSemanticToken('surface.hover');
  const bgSelected = useSemanticToken('interactive.primary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textOnSelected = useSemanticToken('text.inverse');
  const border = useSemanticToken('border.default');
  const unreadDot = useSemanticToken('interactive.primary');

  // Get selected email object
  const selectedEmail = useMemo(() => {
    return emails.find(e => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Callback to open Email Draft Studio from the intelligence panel
  const handleOpenDraftStudio = useCallback((email: EmailItem) => {
    setDraftStudioEmail(email);
    setDraftStudioOpen(true);
  }, []);

  // Pass selected email to the dashboard's right panel
  // Use selectedEmailId as primary dependency to ensure updates when selection changes
  useEffect(() => {
    setCustomData({
      type: 'email',
      email: selectedEmail,
      // Include email ID at top level for easier change detection
      emailId: selectedEmailId,
      // Callback for opening draft studio from intelligence panel
      onOpenDraftStudio: handleOpenDraftStudio,
    });
  }, [selectedEmailId, selectedEmail, setCustomData, handleOpenDraftStudio]);

  // Fetch emails
  const fetchEmails = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const folder = activeMailbox === 'sent' ? 'sent' : 'inbox';
      const response = await fetch(
        `/api/hermes-proxy?path=v1/emails/recent&folder=${folder}&limit=500&offset=0&exclude_body=true`
      );
      if (response.ok) {
        const data = await response.json();
        const newEmails = data.emails || [];
        
        // Preserve body content from previously fetched emails
        // This prevents losing email bodies on auto-refresh
        setEmails(prev => {
          const bodyCache = new Map<string, { body?: string; body_html?: string }>();
          prev.forEach(e => {
            if (e.body || e.body_html) {
              bodyCache.set(e.id, { body: e.body, body_html: e.body_html });
            }
          });
          
          return newEmails.map((e: EmailItem) => {
            const cached = bodyCache.get(e.id);
            if (cached) {
              return { ...e, body: cached.body, body_html: cached.body_html };
            }
            return e;
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeMailbox]);

  // Fetch filter categories
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/hermes-proxy?path=v1/email-filters/categories');
        if (response.ok) {
          const data = await response.json();
          setFilterCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch filter categories:', error);
      }
    };
    fetchFilters();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Auto-refresh every 2 minutes (silent background refresh)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      fetchEmails(true);
    }, 120000);
    
    return () => clearInterval(interval);
  }, [fetchEmails, autoRefreshEnabled]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails(false);
    setRefreshing(false);
  };

  // Filter emails
  const filteredEmails = useMemo(() => {
    let filtered = emails;
    
    // Exclude soft-deleted emails (unless viewing trash)
    if (activeMailbox !== 'trash') {
      filtered = filtered.filter(e => !deletedEmailIds.has(e.id));
    } else {
      // Show only deleted emails in trash view
      filtered = filtered.filter(e => deletedEmailIds.has(e.id));
    }
    
    // Exclude blocked domains and senders
    filtered = filtered.filter(e => {
      const domain = e.from_email?.split('@')[1]?.toLowerCase() || '';
      const sender = e.from_email?.toLowerCase() || '';
      return !blockedDomains.has(domain) && !blockedSenders.has(sender);
    });
    
    // Filter by mailbox
    if (activeMailbox === 'sent') {
      filtered = filtered.filter(e => e.is_sent);
    } else if (activeMailbox === 'flagged') {
      filtered = filtered.filter(e => e.is_starred);
    } else if (activeMailbox === 'unread') {
      filtered = filtered.filter(e => !e.is_read);
    } else if (activeMailbox === 'inbox') {
      filtered = filtered.filter(e => !e.is_sent);
    }
    
    // Filter by account
    if (activeAccount !== 'all') {
      const account = accounts.find(a => a.id === activeAccount);
      if (account) {
        const accountDomain = account.email.split('@')[1]?.toLowerCase();
        filtered = filtered.filter(e => {
          // Direct match on to/from email
          if (e.to_email === account.email || e.from_email === account.email) {
            return true;
          }
          // Also match emails from the same domain (for work accounts where to_email may be empty)
          const fromDomain = e.from_email?.split('@')[1]?.toLowerCase();
          if (accountDomain && fromDomain === accountDomain) {
            return true;
          }
          return false;
        });
      }
    }
    
    // Filter by category (Apple Mail style filters)
    if (activeFilter && activeFilter !== 'all') {
      filtered = filtered.filter(e => {
        const category = e.category?.toLowerCase() || '';
        
        // Check if activeFilter is an email address (person filter)
        if (activeFilter.includes('@')) {
          const filterEmail = activeFilter.toLowerCase();
          const fromEmail = e.from_email?.toLowerCase() || '';
          const toEmail = e.to_email?.toLowerCase() || '';
          return fromEmail === filterEmail || toEmail === filterEmail;
        }
        
        if (activeFilter === 'people') {
          // Filter for emails from real people (not automated/marketing/IT)
          const fromEmail = e.from_email?.toLowerCase() || '';
          const fromName = e.from_name?.toLowerCase() || '';
          const subject = e.subject?.toLowerCase() || '';
          
          // Exclude common automated/system sender patterns
          const automatedPatterns = [
            'noreply', 'no-reply', 'donotreply', 'do-not-reply',
            'notifications', 'newsletter', 'marketing', 'promo',
            'alert', 'updates', 'info@', 'support@', 'team@',
            'hello@', 'news@', 'mailer', 'automated', 'system',
            'italert', 'it alert', 'itupdate', 'it update',
            'it information', 'itinformation', 'service desk',
            'helpdesk', 'help desk', 'cme@', 'education@',
            'training@', 'hr@', 'human resources', 'benefits@',
            'payroll@', 'facilities@', 'security@', 'compliance@'
          ];
          
          const isAutomated = automatedPatterns.some(pattern => 
            fromEmail.includes(pattern) || fromName.includes(pattern)
          );
          
          // Check for IT-related subjects
          const itSubjectPatterns = ['it matters', 'it alert', 'it update', 'downtime', 'maintenance'];
          const isITEmail = itSubjectPatterns.some(pattern => subject.includes(pattern));
          
          // Also check category if available
          const isPersonalCategory = category === 'personal' || category === 'work';
          
          return (!isAutomated && !isITEmail) || isPersonalCategory;
        } else if (activeFilter === 'transactions') {
          return category === 'transactional';
        } else if (activeFilter === 'updates') {
          return category === 'newsletter' || category === 'notification';
        } else if (activeFilter === 'promotions') {
          return category === 'marketing' || category === 'promotional';
        }
        return true;
      });
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.subject?.toLowerCase().includes(query) ||
        e.from_email?.toLowerCase().includes(query) ||
        e.from_name?.toLowerCase().includes(query) ||
        e.snippet?.toLowerCase().includes(query)
      );
    }
    
    // Sort emails based on sortBy and sortOrder
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'sender') {
        const senderA = (a.from_name || a.from_email || '').toLowerCase();
        const senderB = (b.from_name || b.from_email || '').toLowerCase();
        comparison = senderA.localeCompare(senderB);
      } else if (sortBy === 'subject') {
        const subjectA = (a.subject || '').toLowerCase();
        const subjectB = (b.subject || '').toLowerCase();
        comparison = subjectA.localeCompare(subjectB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [emails, activeAccount, accounts, searchQuery, activeMailbox, deletedEmailIds, blockedDomains, blockedSenders, sortBy, sortOrder, activeFilter]);

  // Handle email selection - optimized to only update selected ID
  const handleEmailSelect = useCallback(async (email: EmailItem) => {
    // Update selected email ID immediately
    setSelectedEmailId(email.id);
    
    // Fetch full email with body if not already loaded
    if (!email.body_html) {
      try {
        const response = await fetch(`/api/hermes-proxy?path=v1/emails/${encodeURIComponent(email.id)}`);
        if (response.ok) {
          const data = await response.json();
          // API returns {email: {email: {...}, sender: {...}, ...}} - extract the inner email object
          const fullEmail = data?.email?.email || data?.email || data;
          // Update the email in the list with full body content
          setEmails(prev => prev.map(e => 
            e.id === email.id ? { ...e, ...fullEmail, is_read: true } : e
          ));
        }
      } catch (error) {
        console.error('Failed to fetch full email:', error);
      }
    }
    
    // Mark as read in backend if unread
    if (!email.is_read) {
      try {
        await fetch(`/api/hermes-proxy?path=v1/emails/${encodeURIComponent(email.id)}/read&is_read=true`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
        
        // Update the email in the list
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, is_read: true } : e
        ));
      } catch (error) {
        console.error('Failed to mark email as read:', error);
      }
    }
  }, []);

  // Soft-delete an email by ID with auto-select next
  const softDeleteEmail = useCallback((emailId: string) => {
    const currentIndex = filteredEmails.findIndex(e => e.id === emailId);

    // Soft-delete: add to deletedEmailIds set (persisted to localStorage)
    setDeletedEmailIds(prev => new Set(prev).add(emailId));

    // Auto-select next email, or previous if at end of list
    if (selectedEmailId === emailId) {
      if (filteredEmails.length > 1) {
        const nextIndex = currentIndex < filteredEmails.length - 1 ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < filteredEmails.length) {
          setSelectedEmailId(filteredEmails[nextIndex].id);
        } else {
          setSelectedEmailId(null);
        }
      } else {
        setSelectedEmailId(null);
      }
    }

    // Notify Hermes Core to queue for deletion sync
    fetch(`/api/hermes-proxy?path=v1/emails/${encodeURIComponent(emailId)}/trash`, {
      method: 'POST',
    }).catch(err => console.error('Failed to queue email for deletion:', err));
  }, [selectedEmailId, filteredEmails]);

  // Keyboard shortcut: Delete/Backspace to delete selected email
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEmailId) {
        e.preventDefault();
        softDeleteEmail(selectedEmailId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmailId, softDeleteEmail]);

  // Handle right-click context menu
  const handleEmailContextMenu = useCallback((e: React.MouseEvent, email: EmailItem) => {
    openForEmail(e, email, {
      onRefresh: () => fetchEmails(true),
      onDelete: (emailId: string) => {
        softDeleteEmail(emailId);
      },
      onBlockDomain: (domain: string) => {
        // Add domain to blocked set (persisted to localStorage)
        setBlockedDomains(prev => new Set(prev).add(domain));
        // Clear selection if current email is from blocked domain
        if (selectedEmail?.from_email?.split('@')[1]?.toLowerCase() === domain) {
          setSelectedEmailId(null);
        }
      },
      onBlockSender: (sender: string) => {
        // Add sender to blocked set (persisted to localStorage)
        setBlockedSenders(prev => new Set(prev).add(sender));
        // Clear selection if current email is from blocked sender
        if (selectedEmail?.from_email?.toLowerCase() === sender) {
          setSelectedEmailId(null);
        }
      },
      onGenerateReply: () => {
        // Open Email Draft Studio with the selected email
        if (selectedEmail) {
          setDraftStudioEmail(selectedEmail);
          setDraftStudioOpen(true);
        }
      },
      onSaveToWorkspace: () => {
        toast({
          title: 'Saving to workspace...',
          status: 'info',
          duration: 2000,
        });
        // TODO: Integrate with workspace
      },
    });
  }, [openForEmail, fetchEmails, toast, selectedEmailId, selectedEmail, softDeleteEmail]);

  // Email actions
  const handleDelete = useCallback(async (email: EmailItem) => {
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
        if (selectedEmailId === email.id) {
          setSelectedEmailId(null);
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
  }, [selectedEmailId, toast]);

  const handleArchive = useCallback(async (email: EmailItem) => {
    try {
      const response = await fetch('/api/hermes-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/emails/${email.id}/archive`,
          method: 'PUT',
          body: { archived: true }
        })
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (selectedEmailId === email.id) {
          setSelectedEmailId(null);
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
  }, [selectedEmailId, toast]);

  const handleToggleStar = useCallback(async (email: EmailItem) => {
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
  }, [toast]);

  const handleToggleRead = useCallback(async (email: EmailItem) => {
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
        toast({
          title: email.is_read ? 'Marked as unread' : 'Marked as read',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error);
      toast({
        title: 'Failed to update read status',
        status: 'error',
        duration: 3000,
      });
    }
  }, [toast]);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px)" bg={bgApp} overflow="hidden">
        
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
          {/* Intelligence Dashboard - Top of sidebar */}
          <Box px={2} py={2}>
            <HStack
              spacing={2}
              p={2}
              borderRadius="8px"
              cursor="pointer"
              bg="linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))"
              border="1px solid"
              borderColor="rgba(139, 92, 246, 0.3)"
              _hover={{ 
                bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))',
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s"
              onClick={() => router.push('/email-intelligence')}
            >
              <SparklesIcon style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
              <Text fontSize="12px" fontWeight="600" color={textPrimary}>
                Intelligence Dashboard
              </Text>
            </HStack>
          </Box>

          {/* Favorites - Quick access to all accounts */}
          <SidebarSection
            title="Favorites"
            isExpanded={expandedSections.favorites}
            onToggle={() => toggleSection('favorites')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
              label="All Inboxes"
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
              icon={<FlagSolidIcon style={{ width: '14px', height: '14px' }} />}
              label="Flagged"
              isActive={activeMailbox === 'flagged'}
              onClick={() => { setActiveMailbox('flagged'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF9500"
            />
            <SidebarItem
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
              label="All Sent"
              isActive={activeMailbox === 'sent' && activeAccount === 'all'}
              onClick={() => { setActiveMailbox('sent'); setActiveAccount('all'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#34C759"
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
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<FolderIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<ArchiveBoxIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<TrashIcon style={{ width: '14px', height: '14px' }} />}
              label="Trash"
              count={deletedEmailIds.size}
              isActive={activeMailbox === 'trash' && activeAccount === 'icloud'}
              onClick={() => { setActiveMailbox('trash'); setActiveAccount('icloud'); }}
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
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<FolderIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
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
              icon={<TrashIcon style={{ width: '14px', height: '14px' }} />}
              label="Trash"
              count={deletedEmailIds.size}
              isActive={activeMailbox === 'trash' && activeAccount === 'work'}
              onClick={() => { setActiveMailbox('trash'); setActiveAccount('work'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
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
              icon={<EnvelopeIcon style={{ width: '14px', height: '14px' }} />}
              label="Unread"
              count={emails.filter(e => !e.is_read).length}
              isActive={activeMailbox === 'unread'}
              onClick={() => { setActiveMailbox('unread'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#AF52DE"
            />
            <SidebarItem
              icon={<ClockIcon style={{ width: '16px', height: '16px' }} />}
              label="Today"
              isActive={activeMailbox === 'today'}
              onClick={() => { setActiveMailbox('today'); }}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF3B30"
            />
          </SidebarSection>

        </Box>

        {/* Email List */}
        <Box
          w="340px"
          minW="340px"
          h="100%"
          bg={bgSidebar}
          borderRight="1px solid"
          borderColor={border}
          display="flex"
          flexDirection="column"
        >
          {/* Search Bar */}
          <Box p={2}>
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <MagnifyingGlassIcon className="w-4 h-4" style={{ color: textSecondary }} />
              </InputLeftElement>
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg={bgContent}
                border="none"
                borderRadius="6px"
                fontSize="13px"
                _placeholder={{ color: textSecondary }}
                _focus={{ boxShadow: 'none' }}
              />
            </InputGroup>
          </Box>

          {/* Apple Mail Style Filters */}
          {filterCategories.length > 0 && (
            <Box px={2} pb={2}>
              <HStack spacing={1} overflowX="auto" css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}>
                {filterCategories.map((category) => (
                  <Tooltip key={category.id} label={category.name} placement="bottom">
                    <IconButton
                      aria-label={category.name}
                      size="xs"
                      variant={activeFilter === category.id ? 'solid' : 'ghost'}
                      bg={activeFilter === category.id ? bgSelected : 'transparent'}
                      color={activeFilter === category.id ? textOnSelected : textSecondary}
                      _hover={{
                        bg: activeFilter === category.id ? bgSelected : bgHover
                      }}
                      onClick={() => setActiveFilter(category.id)}
                      icon={
                        <Box position="relative">
                          {category.icon === 'user' ? <UserGroupIcon style={{ width: '16px', height: '16px' }} /> :
                           category.icon === 'shopping-cart' ? <ChartBarIcon style={{ width: '16px', height: '16px' }} /> :
                           category.icon === 'file-text' ? <SparklesIcon style={{ width: '16px', height: '16px' }} /> :
                           category.icon === 'megaphone' ? <NewspaperIcon style={{ width: '16px', height: '16px' }} /> :
                           <InboxIcon style={{ width: '16px', height: '16px' }} />}
                          {category.unread_count > 0 && (
                            <Box
                              position="absolute"
                              top="-4px"
                              right="-8px"
                              bg="red.500"
                              color="white"
                              fontSize="8px"
                              fontWeight="700"
                              px={1}
                              py={0}
                              borderRadius="full"
                              minW="14px"
                              h="14px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              {category.unread_count > 99 ? '99+' : category.unread_count}
                            </Box>
                          )}
                        </Box>
                      }
                      h="28px"
                      w="28px"
                      minW="28px"
                      borderRadius="6px"
                      flexShrink={0}
                    />
                  </Tooltip>
                ))}
              </HStack>
            </Box>
          )}

          {/* List Header */}
          <HStack px={3} py={1.5} borderBottom="1px solid" borderColor={border} justify="space-between">
            <Text fontSize="11px" color={textSecondary}>
              {filteredEmails.length} {activeMailbox === 'inbox' ? 'in Inbox' : 
               activeMailbox === 'sent' ? 'Sent' :
               activeMailbox === 'flagged' ? 'Flagged' :
               activeMailbox === 'unread' ? 'Unread' : 'messages'}
            </Text>
            <HStack spacing={1}>
              <Menu>
                <MenuButton
                  as={HStack}
                  spacing={1}
                  cursor="pointer"
                  _hover={{ opacity: 0.7 }}
                >
                  <Text fontSize="11px" color={textSecondary}>
                    {sortBy === 'date' ? 'Date' : sortBy === 'sender' ? 'Sender' : 'Subject'}
                  </Text>
                  <ChevronDownIcon style={{ width: '12px', height: '12px', color: textSecondary }} />
                </MenuButton>
                <MenuList bg={bgSidebar} borderColor={border} minW="100px" py={1} shadow="md" fontSize="12px">
                  <MenuItem 
                    bg={sortBy === 'date' ? bgHover : 'transparent'}
                    _hover={{ bg: bgHover }}
                    onClick={() => { setSortBy('date'); setSortOrder(sortBy === 'date' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  >
                    <HStack spacing={2}>
                      <ClockIcon style={{ width: '14px', height: '14px' }} />
                      <Text>Date</Text>
                    </HStack>
                  </MenuItem>
                  <MenuItem 
                    bg={sortBy === 'sender' ? bgHover : 'transparent'}
                    _hover={{ bg: bgHover }}
                    onClick={() => { setSortBy('sender'); setSortOrder(sortBy === 'sender' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  >
                    <HStack spacing={2}>
                      <EnvelopeIcon style={{ width: '14px', height: '14px' }} />
                      <Text>Sender</Text>
                    </HStack>
                  </MenuItem>
                  <MenuItem 
                    bg={sortBy === 'subject' ? bgHover : 'transparent'}
                    _hover={{ bg: bgHover }}
                    onClick={() => { setSortBy('subject'); setSortOrder(sortBy === 'subject' && sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  >
                    <HStack spacing={2}>
                      <TagIcon style={{ width: '14px', height: '14px' }} />
                      <Text>Subject</Text>
                    </HStack>
                  </MenuItem>
                </MenuList>
              </Menu>
              <Tooltip label="Refresh" placement="bottom">
                <Box 
                  as="button" 
                  onClick={handleRefresh} 
                  color={textSecondary} 
                  _hover={{ opacity: 0.7 }}
                  display="flex"
                  alignItems="center"
                >
                  <ArrowPathIcon style={{ width: '14px', height: '14px' }} />
                </Box>
              </Tooltip>
            </HStack>
          </HStack>

          {/* Email List - Optimized with memoized items */}
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
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  onSelect={handleEmailSelect}
                  onContextMenu={handleEmailContextMenu}
                  bgSelected={bgSelected}
                  bgHover={bgHover}
                  border={border}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textOnSelected={textOnSelected}
                  unreadDot={unreadDot}
                />
              ))
            )}
          </Box>
        </Box>

        {/* Email Content Area */}
        <Box flex={1} h="100%" bg={bgContent} display="flex" flexDirection="row">
          {/* Email Viewer */}
          <Box flex={1} display="flex" flexDirection="column" borderRight="1px solid" borderColor={border}>
          {selectedEmail ? (
            <>
              {/* Email Header - Compact */}
              <Box px={4} py={2} borderBottom="1px solid" borderColor={border}>
                <HStack spacing={3} align="center">
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    bg={bgSelected}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Text color={textOnSelected} fontWeight="600" fontSize="13px">
                      {(selectedEmail.from_name || selectedEmail.from_email || 'U')[0].toUpperCase()}
                    </Text>
                  </Box>
                  <Box flex={1} minW={0}>
                    <HStack spacing={2} align="baseline">
                      <Text fontSize="14px" fontWeight="600" color={textPrimary} isTruncated>
                        {selectedEmail.from_name || selectedEmail.from_email}
                      </Text>
                      <Text fontSize="12px" color={textSecondary} flexShrink={0}>
                        {new Date(selectedEmail.date).toLocaleString()}
                      </Text>
                    </HStack>
                    <Text fontSize="15px" fontWeight="500" color={textPrimary} isTruncated>
                      {selectedEmail.subject || '(No Subject)'}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              {/* Attachments Bar */}
              {Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.filter(a => !a.is_inline).length > 0 && (
                <Box px={4} py={2} borderBottom="1px solid" borderColor={border} bg={bgSidebar}>
                  <HStack spacing={2} mb={1}>
                    <Box as={PaperClipIcon} w="14px" h="14px" color={textSecondary} />
                    <Text fontSize="12px" fontWeight="600" color={textSecondary}>
                      {selectedEmail.attachments.filter(a => !a.is_inline).length} Attachment{selectedEmail.attachments.filter(a => !a.is_inline).length > 1 ? 's' : ''}
                    </Text>
                  </HStack>
                  <Flex gap={2} flexWrap="wrap">
                    {selectedEmail.attachments.filter(a => !a.is_inline).map((att, i) => (
                      <Box
                        key={i}
                        as="a"
                        href={`/api/hermes-proxy?path=v1/attachments/download/${encodeURIComponent(selectedEmail.id)}/${i}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        px={3}
                        py={1.5}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={border}
                        bg={bgContent}
                        _hover={{ bg: bgHover, cursor: 'pointer' }}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        maxW="250px"
                      >
                        <Text fontSize="14px" flexShrink={0}>
                          {att.content_type?.includes('pdf') ? '📄' : att.content_type?.includes('spreadsheet') || att.content_type?.includes('excel') ? '📊' : att.content_type?.includes('presentation') || att.content_type?.includes('powerpoint') ? '📑' : att.content_type?.includes('image') ? '🖼️' : '📎'}
                        </Text>
                        <Text fontSize="12px" color={textPrimary} isTruncated fontWeight="500">
                          {att.filename || 'Attachment'}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* Email Body */}
              <Box flex={1} overflowY="auto" px={6} py={4} minH={0}>
                {selectedEmail.body_html ? (
                  <Box
                    as="iframe"
                    // Sandbox MUST allow popups so links can escape to the
                    // host browser. Without `allow-popups` + the outer
                    // `allow-popups-to-escape-sandbox`, VS Code's webview
                    // silently swallows link clicks and hyperlinks look
                    // "static" — the exact bug reported for SharePoint
                    // links in work email.
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={(() => {
                      let html = selectedEmail.body_html.replace(
                        /cid:([^"'\s>]+)/g,
                        (match: string, contentId: string) => `/api/hermes-proxy?path=v1/attachments/inline/${encodeURIComponent(selectedEmail.id)}/${encodeURIComponent(contentId)}`
                      );
                      // `<base target="_blank">` routes every <a href> click
                      // to a new tab (=> host browser, with its existing M365
                      // session for SharePoint/OneDrive URLs) instead of
                      // trying to navigate the iframe itself, which fails
                      // silently inside a webview.
                      const overrideHead = `<base target="_blank">
                      <style>
                        body { margin: 0; padding: 16px; display: flex; flex-direction: column; align-items: center; }
                        body > * { max-width: 100%; }
                        table { float: none !important; }
                        img { max-width: 100%; height: auto; }
                        a { color: #0A84FF; text-decoration: underline; cursor: pointer; }
                        a:hover { text-decoration: underline; filter: brightness(1.15); }
                      </style>`;
                      if (html.includes('<head>') || html.includes('<head ')) {
                        html = html.replace(/<head([^>]*)>/i, `<head$1><meta charset="utf-8">${overrideHead}`);
                      } else if (html.includes('<html')) {
                        html = html.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8">${overrideHead}</head>`);
                      } else {
                        html = `<!DOCTYPE html><html><head><meta charset="utf-8">${overrideHead}</head><body>${html}</body></html>`;
                      }
                      return html;
                    })()}
                    w="100%"
                    h="100%"
                    border="none"
                  />
                ) : (
                  // Plain-text fallback: auto-linkify URLs so they stay
                  // clickable even when the source email had no HTML part.
                  <Box fontSize="14px" color={textPrimary} whiteSpace="pre-wrap"
                       sx={{ '& a': { color: '#0A84FF', textDecoration: 'underline' } }}
                       dangerouslySetInnerHTML={{
                         __html: linkifyPlainText(selectedEmail.body || selectedEmail.snippet || ''),
                       }}
                  />
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
        </Box>
      </Flex>
      
      {/* Email Tools Context Menu */}
      <ContextMenuEngine
        isOpen={menuOpen}
        onClose={closeMenu}
        position={menuPosition}
        config={menuConfig}
      />
      
      {/* Email Draft Studio Modal */}
      <EmailDraftStudio
        isOpen={draftStudioOpen}
        onClose={() => {
          setDraftStudioOpen(false);
          setDraftStudioEmail(null);
        }}
        originalEmail={draftStudioEmail}
        onSend={async (data) => {
          // Send via Mac Agent
          const response = await fetch('/api/hermes-proxy?path=v1/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: data.to.split(',').map(e => e.trim()),
              cc: data.cc ? data.cc.split(',').map(e => e.trim()) : [],
              subject: data.subject,
              body: data.body,
              in_reply_to: data.inReplyTo,
            }),
          });
          if (!response.ok) {
            throw new Error('Failed to send email');
          }
        }}
      />
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

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  textSecondary,
  indicator,
  children,
}) => {
  return (
    <Box mb={1}>
      <HStack
        px={2}
        py={1}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ opacity: 0.8 }}
      >
        <Box w="12px" h="12px" flexShrink={0}>
          {isExpanded ? (
            <ChevronDownIcon style={{ width: '12px', height: '12px', color: textSecondary }} />
          ) : (
            <ChevronRightIcon style={{ width: '12px', height: '12px', color: textSecondary }} />
          )}
        </Box>
        <Text
          fontSize="11px"
          fontWeight="600"
          color={textSecondary}
          textTransform="uppercase"
          letterSpacing="0.5px"
        >
          {title}
        </Text>
        {indicator && (
          <Box w="8px" h="8px" borderRadius="full" bg={indicator} ml="auto" />
        )}
      </HStack>
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={0} pl={1}>
          {children}
        </VStack>
      </Collapse>
    </Box>
  );
};

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

const SidebarItem: React.FC<SidebarItemProps> = ({
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
}) => {
  return (
    <HStack
      px={2}
      py={1}
      cursor="pointer"
      bg={isActive ? bgSelected : 'transparent'}
      _hover={{ bg: isActive ? bgSelected : bgHover }}
      onClick={onClick}
      borderRadius="4px"
      spacing={1.5}
    >
      <Box color={isActive ? textOnSelected : (iconColor || textSecondary)} flexShrink={0}>
        {icon}
      </Box>
      <Text
        fontSize="12px"
        color={isActive ? textOnSelected : textPrimary}
        flex={1}
        noOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <Text
          fontSize="10px"
          color={isActive ? textOnSelected : textSecondary}
          fontWeight="500"
        >
          {count}
        </Text>
      )}
    </HStack>
  );
};
