/**
 * Email Settings Panel
 * Right panel component for email client settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Badge,
  Button,
  useToast,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

interface WatcherStatus {
  enabled: boolean;
  paused_reason?: string;
  last_heartbeat?: string;
}

export default function EmailSettingsPanel() {
  console.log('[EmailSettingsPanel] Component rendering');
  
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');

  // Settings state
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [aiDrafts, setAiDrafts] = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Fetch watcher status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${GRAPHRAG_URL}/watcher/status`);
        if (res.ok) {
          const data = await res.json();
          setWatcherStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch watcher status:', error);
      }
    };
    fetchStatus();
  }, []);

  const toggleWatcher = async () => {
    if (!watcherStatus) return;
    setLoading(true);
    try {
      const endpoint = watcherStatus.enabled ? '/watcher/pause' : '/watcher/resume';
      const res = await fetch(`${GRAPHRAG_URL}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        setWatcherStatus(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
        toast({
          title: watcherStatus.enabled ? 'Watcher Paused' : 'Watcher Resumed',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: String(error),
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEmails = async () => {
    setSyncing(true);
    try {
      // Refresh email list from Hermes Core
      const res = await fetch('/api/graphrag?path=v1/emails/recent&folder=inbox&limit=50');
      
      if (res.ok) {
        toast({
          title: 'Emails Refreshed',
          description: 'Email list updated from server',
          status: 'success',
          duration: 2000,
        });
        // Trigger a refresh event for email list components
        window.dispatchEvent(new CustomEvent('emails-refresh'));
      } else {
        toast({
          title: 'Refresh Failed',
          description: 'Could not fetch emails from server',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Refresh Error',
        description: error instanceof Error ? error.message : 'Cannot connect to server',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Watcher Status */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="600" color={textColor}>Email Watcher</Text>
            <Badge colorScheme={watcherStatus?.enabled ? 'green' : 'gray'}>
              {watcherStatus?.enabled ? 'Active' : 'Paused'}
            </Badge>
          </HStack>
          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme={watcherStatus?.enabled ? 'orange' : 'green'}
              onClick={toggleWatcher}
              isLoading={loading}
              flex={1}
            >
              {watcherStatus?.enabled ? 'Pause' : 'Resume'}
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleSyncEmails}
              isLoading={syncing}
              loadingText="Refreshing"
              flex={1}
            >
              Refresh
            </Button>
          </HStack>
          {watcherStatus?.last_heartbeat && (
            <Text fontSize="xs" color={textSecondary} mt={1}>
              Last heartbeat: {new Date(watcherStatus.last_heartbeat).toLocaleTimeString()}
            </Text>
          )}
        </Box>

        <Divider borderColor={borderColor} />

        {/* Processing Settings */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>Processing</Text>
          <VStack align="stretch" spacing={3}>
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Auto-process new emails
              </FormLabel>
              <Switch
                isChecked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Notify on new emails
              </FormLabel>
              <Switch
                isChecked={notifyOnNew}
                onChange={(e) => setNotifyOnNew(e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* AI Features */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>AI Features</Text>
          <VStack align="stretch" spacing={3}>
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                AI Draft Generation
              </FormLabel>
              <Switch
                isChecked={aiDrafts}
                onChange={(e) => setAiDrafts(e.target.checked)}
                colorScheme="purple"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Sentiment Analysis
              </FormLabel>
              <Switch
                isChecked={sentimentAnalysis}
                onChange={(e) => setSentimentAnalysis(e.target.checked)}
                colorScheme="purple"
              />
            </FormControl>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Default Actions */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>Defaults</Text>
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>Default Folder</FormLabel>
              <Select size="sm" defaultValue="inbox">
                <option value="inbox">Inbox</option>
                <option value="sent">Sent</option>
                <option value="drafts">Drafts</option>
              </Select>
            </FormControl>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
