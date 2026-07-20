/**
 * Child Inbox Component
 *
 * Kid-friendly email inbox that:
 * - Lists recent emails from CIG
 * - Shows sender, subject, date, read/unread state
 * - Opens email reader with sanitized HTML body
 * - Content-filtered and sender-restricted via /api/child/inbox
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Badge,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  useToast,
} from '@chakra-ui/react';
import {
  FiInbox,
  FiMail,
  FiArrowLeft,
  FiRefreshCw,
  FiSearch,
  FiPaperclip,
} from 'react-icons/fi';

interface InboxEmail {
  id: string;
  subject: string;
  from: string;
  from_name?: string;
  date: string;
  snippet?: string;
  body_html?: string;
  body_text?: string;
  is_read: boolean;
  has_attachments: boolean;
}

interface ChildInboxProps {
  childId?: string;
}

export function ChildInbox({ }: ChildInboxProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/child/inbox?limit=30');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else if (res.status === 403) {
        toast({
          title: 'Inbox not available',
          description: 'Your iCloud email needs to be set up by a parent first.',
          status: 'info',
          duration: 5000,
        });
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleOpenEmail = async (email: InboxEmail) => {
    setSelectedEmail(email);
    setLoadingEmail(true);
    try {
      const res = await fetch(`/api/child/inbox?emailId=${encodeURIComponent(email.id)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data.email);
        // Update read state in list
        setEmails((prev) =>
          prev.map((e) =>
            e.id === email.id ? { ...e, is_read: true } : e,
          ),
        );
      }
    } catch {
      // Keep the snippet version
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleRefresh = () => {
    setSelectedEmail(null);
    fetchInbox();
  };

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.from_name || e.from).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const unreadCount = emails.filter((e) => !e.is_read).length;

  // ─── Email Reader View ─────────────────────────────────────────────────
  if (selectedEmail) {
    return (
      <Box bg="white" borderRadius="2xl" p={6} boxShadow="xl" minH="500px">
        {loadingEmail ? (
          <VStack py={12} spacing={4}>
            <Spinner size="lg" color="green.400" />
            <Text color="gray.500">Loading email...</Text>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={4}>
            {/* Top bar */}
            <HStack justify="space-between">
              <Button
                leftIcon={<FiArrowLeft />}
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                borderRadius="full"
              >
                Back to Inbox
              </Button>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                borderRadius="full"
              >
                Refresh
              </Button>
            </HStack>

            <Divider />

            {/* Email header */}
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold" fontSize="lg">
                {selectedEmail.subject}
              </Text>
              <HStack spacing={3}>
                <Box
                  w={10}
                  h={10}
                  borderRadius="full"
                  bg="green.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Text fontWeight="bold" color="green.600" fontSize="sm">
                    {(selectedEmail.from_name || selectedEmail.from || '?')[0]?.toUpperCase()}
                  </Text>
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium" fontSize="sm">
                    {selectedEmail.from_name || selectedEmail.from}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDate(selectedEmail.date)}
                  </Text>
                </VStack>
                {selectedEmail.has_attachments && (
                  <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                    <HStack spacing={1}>
                      <FiPaperclip />
                      <Text>Attachments</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </VStack>

            <Divider />

            {/* Email body */}
            <Box
              p={4}
              bg="gray.50"
              borderRadius="xl"
              minH="300px"
              overflowY="auto"
              maxH="500px"
            >
              {selectedEmail.body_html ? (
                <Box
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.body_html,
                  }}
                  sx={{
                    '*': { maxWidth: '100%' },
                    'img': { maxWidth: '100%', height: 'auto', borderRadius: 'md' },
                    'a': { color: 'blue.500', textDecoration: 'underline' },
                    'p': { marginBottom: '0.75rem', lineHeight: '1.6' },
                  }}
                />
              ) : selectedEmail.body_text ? (
                <Text whiteSpace="pre-wrap" lineHeight="tall">
                  {selectedEmail.body_text}
                </Text>
              ) : selectedEmail.snippet ? (
                <Text whiteSpace="pre-wrap" lineHeight="tall" color="gray.600">
                  {selectedEmail.snippet}
                </Text>
              ) : (
                <Text color="gray.400" textAlign="center" py={8}>
                  This email has no readable content.
                </Text>
              )}
            </Box>
          </VStack>
        )}
      </Box>
    );
  }

  // ─── Inbox List View ───────────────────────────────────────────────────
  return (
    <Box bg="white" borderRadius="2xl" p={6} boxShadow="xl">
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={3}>
            <FiInbox size={24} />
            <Text fontWeight="bold" fontSize="lg">My Inbox</Text>
            {unreadCount > 0 && (
              <Badge colorScheme="green" borderRadius="full" px={2}>
                {unreadCount} new
              </Badge>
            )}
          </HStack>
          <IconButton
            aria-label="Refresh inbox"
            icon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            isLoading={loading}
            borderRadius="full"
          />
        </HStack>

        {/* Search */}
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            borderRadius="full"
            bg="gray.50"
          />
        </InputGroup>

        <Divider />

        {/* Email List */}
        {loading ? (
          <VStack py={12} spacing={4}>
            <Spinner size="lg" color="green.400" />
            <Text color="gray.500">Loading your emails...</Text>
          </VStack>
        ) : filteredEmails.length === 0 ? (
          <VStack py={12} spacing={4} color="gray.400">
            <FiMail size={48} />
            <Text textAlign="center" fontWeight="medium">
              {emails.length === 0
                ? 'No emails yet!\nYour inbox will show up here once you receive messages.'
                : 'No emails match your search.'}
            </Text>
            {emails.length === 0 && (
              <Text fontSize="sm" color="gray.400">
                Make sure your iCloud email is connected by a parent.
              </Text>
            )}
          </VStack>
        ) : (
          <VStack spacing={0} align="stretch" divider={<Divider />} maxH="500px" overflowY="auto">
            {filteredEmails.map((email) => (
              <Box
                key={email.id}
                p={3}
                cursor="pointer"
                transition="all 0.15s"
                _hover={{ bg: 'green.50' }}
                onClick={() => handleOpenEmail(email)}
                borderRadius="lg"
              >
                <HStack spacing={3} align="start">
                  {/* Read/unread icon */}
                  <Box mt={1} flexShrink={0}>
                    {email.is_read ? (
                      <FiMail color="gray.400" />
                    ) : (
                      <FiMail color="green.500" />
                    )}
                  </Box>

                  {/* Content */}
                  <VStack align="start" spacing={1} flex={1} overflow="hidden">
                    <HStack justify="space-between" w="full">
                      <Text
                        fontWeight={email.is_read ? 'normal' : 'bold'}
                        fontSize="sm"
                        noOfLines={1}
                      >
                        {email.from_name || email.from}
                      </Text>
                      <Text fontSize="xs" color="gray.400" flexShrink={0}>
                        {formatRelativeDate(email.date)}
                      </Text>
                    </HStack>
                    <Text
                      fontWeight={email.is_read ? 'normal' : 'semibold'}
                      fontSize="sm"
                      noOfLines={1}
                    >
                      {email.subject}
                    </Text>
                    {email.snippet && (
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {email.snippet}
                      </Text>
                    )}
                  </VStack>

                  {/* Attachments badge */}
                  {email.has_attachments && (
                    <Box mt={1} flexShrink={0}>
                      <FiPaperclip color="gray.400" size={14} />
                    </Box>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default ChildInbox;
