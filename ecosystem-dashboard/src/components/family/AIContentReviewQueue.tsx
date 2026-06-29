/**
 * AIContentReviewQueue — Phase 7 parent control-plane component.
 *
 * Surfaces AI-generated content (art, writing, workspace pages, flagged
 * chat messages, book content flags) for parent review. Parents can
 * approve or reject items, with optional notes.
 *
 * Backend: /api/parent/ai-content-review (GET list, POST approve/reject)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, IconButton,
  Card, CardBody, Spinner, Center, useToast, Divider,
  Heading, Tabs, TabList, TabPanels, Tab, TabPanel,
  Input, FormControl, FormLabel, Collapse, Icon,
} from '@chakra-ui/react';
import {
  FiCheck, FiX, FiRefreshCw, FiMessageSquare, FiImage,
  FiEdit3, FiBook, FiFileText, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';

interface ReviewItem {
  id: string;
  childId: string;
  childName: string;
  contentType: 'art' | 'writing' | 'workspace_page' | 'chat_message' | 'book_content';
  title: string;
  excerpt: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

const TYPE_CONFIG: Record<ReviewItem['contentType'], { label: string; icon: React.ElementType; color: string }> = {
  art: { label: 'Art', icon: FiImage, color: 'pink' },
  writing: { label: 'Writing', icon: FiEdit3, color: 'orange' },
  workspace_page: { label: 'Workspace', icon: FiFileText, color: 'blue' },
  chat_message: { label: 'Chat', icon: FiMessageSquare, color: 'purple' },
  book_content: { label: 'Book', icon: FiBook, color: 'green' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ReviewItemCard({ item, onAction }: {
  item: ReviewItem;
  onAction: (itemId: string, action: 'approve' | 'reject', note?: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const cfg = TYPE_CONFIG[item.contentType] || TYPE_CONFIG.chat_message;

  const handleAction = (action: 'approve' | 'reject') => {
    setProcessing(true);
    onAction(item.id, action, note.trim() || undefined);
    setProcessing(false);
    setShowNote(false);
    setNote('');
  };

  return (
    <Card borderWidth="1px" borderRadius="md" size="sm" opacity={item.status !== 'pending' ? 0.6 : 1}>
      <CardBody p={3}>
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={cfg.icon} color={`var(--chakra-colors-${cfg.color}-500)`} />
              <Text fontSize="sm" fontWeight="600">{item.title}</Text>
              <Badge colorScheme={cfg.color} fontSize="2xs">{cfg.label}</Badge>
            </HStack>
            <Badge
              colorScheme={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'orange'}
              fontSize="2xs"
            >
              {item.status}
            </Badge>
          </HStack>

          <Text fontSize="xs" color="gray.600" noOfLines={3}>
            {item.excerpt || 'No content preview available.'}
          </Text>

          <HStack justify="space-between" fontSize="2xs" color="gray.400">
            <Text>{item.childName} • {timeAgo(item.createdAt)}</Text>
            {item.reviewedAt && <Text>Reviewed {timeAgo(item.reviewedAt)}</Text>}
          </HStack>

          {item.status === 'pending' && (
            <>
              <Collapse in={showNote}>
                <Input
                  size="xs"
                  placeholder="Optional note for your records..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Collapse>
              <HStack justify="flex-end" spacing={2}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowNote(!showNote)}
                  rightIcon={showNote ? <FiChevronUp /> : <FiChevronDown />}
                >
                  Note
                </Button>
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="outline"
                  leftIcon={<FiX />}
                  onClick={() => handleAction('reject')}
                  isLoading={processing}
                >
                  Reject
                </Button>
                <Button
                  size="xs"
                  colorScheme="green"
                  leftIcon={<FiCheck />}
                  onClick={() => handleAction('approve')}
                  isLoading={processing}
                >
                  Approve
                </Button>
              </HStack>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default function AIContentReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/ai-content-review');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAction = async (itemId: string, action: 'approve' | 'reject', note?: string) => {
    try {
      const res = await fetch('/api/parent/ai-content-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action, note }),
      });

      if (res.ok) {
        toast({
          title: action === 'approve' ? 'Approved' : 'Rejected',
          status: action === 'approve' ? 'success' : 'info',
          duration: 2000,
        });
        fetchItems();
      } else {
        toast({ title: 'Failed to update', status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Network error', status: 'error', duration: 3000 });
    }
  };

  const pendingItems = items.filter((i) => i.status === 'pending');
  const reviewedItems = items.filter((i) => i.status !== 'pending');

  if (loading) {
    return <Center py={6}><Spinner size="sm" color="purple.500" /></Center>;
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="sm">AI Content Review</Heading>
          <Text fontSize="xs" color="gray.500">
            Review AI-generated content from your children's activities.
          </Text>
        </VStack>
        <HStack>
          {pendingItems.length > 0 && (
            <Badge colorScheme="orange" fontSize="2xs">{pendingItems.length} pending</Badge>
          )}
          <IconButton
            size="xs"
            variant="ghost"
            icon={<FiRefreshCw />}
            aria-label="Refresh"
            onClick={fetchItems}
          />
        </HStack>
      </HStack>

      <Tabs index={activeTab} onChange={setActiveTab} colorScheme="purple" variant="soft-rounded" size="sm">
        <TabList>
          <Tab fontSize="xs">Pending ({pendingItems.length})</Tab>
          <Tab fontSize="xs">Reviewed ({reviewedItems.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            {pendingItems.length === 0 ? (
              <Box p={4} textAlign="center" borderWidth="1px" borderRadius="lg" borderColor="gray.200">
                <Text fontSize="sm" color="gray.500">
                  No items awaiting review. New AI-generated content will appear here.
                </Text>
              </Box>
            ) : (
              <VStack spacing={2} align="stretch">
                {pendingItems.map((item) => (
                  <ReviewItemCard key={item.id} item={item} onAction={handleAction} />
                ))}
              </VStack>
            )}
          </TabPanel>
          <TabPanel px={0}>
            {reviewedItems.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                No reviewed items yet.
              </Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {reviewedItems.map((item) => (
                  <ReviewItemCard key={item.id} item={item} onAction={handleAction} />
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
