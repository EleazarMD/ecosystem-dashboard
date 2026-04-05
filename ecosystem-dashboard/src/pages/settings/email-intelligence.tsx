/**
 * Email Intelligence Settings
 * 
 * Configure AI-powered email intelligence features with enable/disable toggles.
 * All sensitive operations go through the approval queue for security.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Badge,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  EnvelopeIcon,
  BellAlertIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CogIcon,
  SparklesIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// ============================================================================
// TYPES
// ============================================================================

interface IntelligenceFeature {
  id: string;
  name: string;
  description: string;
  category: 'proactive' | 'calendar' | 'learning' | 'security' | 'automation';
  enabled: boolean;
  requiresApproval: boolean;
  config?: Record<string, unknown>;
}

interface IntelligenceSettings {
  features: IntelligenceFeature[];
  globalSettings: {
    hermesUrl: string;
    defaultAccount: 'all' | 'icloud' | 'work';
    approvalRequired: boolean;
    rateLimits: {
      requestsPerMinute: number;
      draftsPerHour: number;
    };
  };
  lastUpdated: string;
}

// Default feature definitions
const DEFAULT_FEATURES: IntelligenceFeature[] = [
  // Proactive Intelligence
  {
    id: 'deadline_detection',
    name: 'Deadline Detection',
    description: 'Automatically detect dates and deadlines mentioned in emails and alert before they pass.',
    category: 'proactive',
    enabled: true,
    requiresApproval: false,
    config: { alertHoursBefore: 24 },
  },
  {
    id: 'followup_reminders',
    name: 'Follow-up Reminders',
    description: 'Track emails awaiting response and remind you to follow up after a configurable period.',
    category: 'proactive',
    enabled: true,
    requiresApproval: false,
    config: { defaultDays: 3, vipDays: 1 },
  },
  {
    id: 'anomaly_detection',
    name: 'Anomaly Detection',
    description: 'Detect unusual patterns like volume spikes, new sender surges, or unread accumulation.',
    category: 'proactive',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'smart_notifications',
    name: 'Smart Notifications',
    description: 'Push important alerts to OpenClaw agent (unanswered VIP emails, urgent items).',
    category: 'proactive',
    enabled: false,
    requiresApproval: false,
    config: { channels: ['openclaw'] },
  },
  // Calendar Integration
  {
    id: 'meeting_prep',
    name: 'Meeting Prep Briefings',
    description: 'Before meetings, generate briefings with recent email context from attendees.',
    category: 'calendar',
    enabled: true,
    requiresApproval: false,
    config: { minutesBefore: 30 },
  },
  {
    id: 'conflict_detection',
    name: 'Schedule Conflict Detection',
    description: 'When emails request meetings, check calendar for conflicts and suggest alternatives.',
    category: 'calendar',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'auto_suggest_times',
    name: 'Auto-Suggest Meeting Times',
    description: 'When drafting "let\'s meet" emails, suggest available time slots from your calendar.',
    category: 'calendar',
    enabled: false,
    requiresApproval: true,
  },
  {
    id: 'post_meeting_followup',
    name: 'Post-Meeting Follow-up',
    description: 'After meetings end, prompt to draft follow-up emails to attendees.',
    category: 'calendar',
    enabled: false,
    requiresApproval: true,
  },
  // Learning & Personalization
  {
    id: 'style_learning',
    name: 'Writing Style Learning',
    description: 'Learn from your draft edits to improve future AI-generated replies.',
    category: 'learning',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'contact_preferences',
    name: 'Per-Contact Preferences',
    description: 'Remember tone, greeting, and sign-off preferences for each contact.',
    category: 'learning',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'priority_learning',
    name: 'Priority Learning',
    description: 'Learn which senders and topics you prioritize based on your behavior.',
    category: 'learning',
    enabled: true,
    requiresApproval: false,
  },
  // Security
  {
    id: 'link_scanning',
    name: 'Link Security Scanning',
    description: 'Automatically scan links in emails for phishing and malware threats.',
    category: 'security',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'sender_verification',
    name: 'Sender Verification',
    description: 'Flag emails from new senders impersonating known contacts.',
    category: 'security',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'phi_detection',
    name: 'PHI/PII Detection',
    description: 'Detect and optionally redact sensitive personal or health information.',
    category: 'security',
    enabled: true,
    requiresApproval: false,
  },
  // Automation (All require approval)
  {
    id: 'auto_draft_replies',
    name: 'Auto-Draft Replies',
    description: 'Automatically generate draft replies for emails requiring response. Drafts go to approval queue.',
    category: 'automation',
    enabled: false,
    requiresApproval: true,
  },
  {
    id: 'auto_categorize',
    name: 'Auto-Categorize',
    description: 'Automatically categorize incoming emails based on learned patterns.',
    category: 'automation',
    enabled: true,
    requiresApproval: false,
  },
  {
    id: 'scheduled_cleanup',
    name: 'Scheduled Cleanup',
    description: 'Periodically archive old newsletters and promotional emails. Actions go to approval queue.',
    category: 'automation',
    enabled: false,
    requiresApproval: true,
    config: { archiveAfterDays: 30, categories: ['newsletter', 'promotional'] },
  },
  {
    id: 'task_extraction',
    name: 'Task Extraction',
    description: 'Extract action items from emails and optionally sync to task manager.',
    category: 'automation',
    enabled: true,
    requiresApproval: true,
    config: { syncTo: 'none' },
  },
];

const CATEGORY_INFO: Record<string, { label: string; icon: typeof EnvelopeIcon; color: string }> = {
  proactive: { label: 'Proactive Intelligence', icon: BellAlertIcon, color: 'blue' },
  calendar: { label: 'Calendar Integration', icon: CalendarIcon, color: 'purple' },
  learning: { label: 'Learning & Personalization', icon: SparklesIcon, color: 'green' },
  security: { label: 'Security', icon: ShieldCheckIcon, color: 'red' },
  automation: { label: 'Automation', icon: CogIcon, color: 'orange' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function EmailIntelligenceSettingsPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<IntelligenceSettings>({
    features: DEFAULT_FEATURES,
    globalSettings: {
      hermesUrl: 'http://100.108.41.22:8780',
      defaultAccount: 'all',
      approvalRequired: true,
      rateLimits: {
        requestsPerMinute: 30,
        draftsPerHour: 10,
      },
    },
    lastUpdated: new Date().toISOString(),
  });
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [hermesStatus, setHermesStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Load settings from localStorage and check Hermes status
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load from localStorage
        const saved = localStorage.getItem('emailIntelligenceSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            features: DEFAULT_FEATURES.map(def => {
              const saved = parsed.features?.find((f: IntelligenceFeature) => f.id === def.id);
              return saved ? { ...def, enabled: saved.enabled, config: saved.config } : def;
            }),
          }));
        }

        // Check Hermes status
        setHermesStatus('checking');
        const res = await fetch('/api/hermes-proxy?path=health');
        if (res.ok) {
          setHermesStatus('connected');
          // Get pending approvals count
          const approvalsRes = await fetch('/api/hermes-proxy?path=v1/agent/approvals');
          if (approvalsRes.ok) {
            const data = await approvalsRes.json();
            setPendingApprovals(data.count || 0);
          }
        } else {
          setHermesStatus('disconnected');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setHermesStatus('disconnected');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('emailIntelligenceSettings', JSON.stringify({
        ...settings,
        lastUpdated: new Date().toISOString(),
      }));

      // Also save to Hermes if connected
      if (hermesStatus === 'connected') {
        await fetch('/api/hermes-proxy?path=v1/intelligence/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
      }

      toast({
        title: 'Settings Saved',
        description: 'Your email intelligence settings have been updated.',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: 'Could not save settings. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  }, [settings, hermesStatus, toast]);

  // Toggle feature
  const toggleFeature = useCallback((featureId: string) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.map(f =>
        f.id === featureId ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  }, []);

  // Update feature config
  const updateFeatureConfig = useCallback((featureId: string, config: Record<string, unknown>) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.map(f =>
        f.id === featureId ? { ...f, config: { ...f.config, ...config } } : f
      ),
    }));
  }, []);

  // Group features by category
  const featuresByCategory = settings.features.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, IntelligenceFeature[]>);

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading settings...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="start">
            <Box>
              <HStack spacing={3} mb={2}>
                <Icon as={EnvelopeIcon} boxSize={8} color="blue.500" />
                <Heading size="lg">Email Intelligence Settings</Heading>
              </HStack>
              <Text color={textSecondary}>
                Configure AI-powered email features. Sensitive operations require approval.
              </Text>
            </Box>
            <VStack align="end" spacing={2}>
              <HStack>
                <Badge
                  colorScheme={hermesStatus === 'connected' ? 'green' : hermesStatus === 'checking' ? 'yellow' : 'red'}
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {hermesStatus === 'connected' ? '● Connected' : hermesStatus === 'checking' ? '○ Checking...' : '● Disconnected'}
                </Badge>
                {pendingApprovals > 0 && (
                  <Badge colorScheme="orange" px={3} py={1} borderRadius="full">
                    {pendingApprovals} Pending Approvals
                  </Badge>
                )}
              </HStack>
              <Button
                colorScheme="blue"
                onClick={saveSettings}
                isLoading={saving}
                leftIcon={<Icon as={CheckCircleIcon} />}
              >
                Save Settings
              </Button>
            </VStack>
          </HStack>

          {/* Security Notice */}
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Security First</AlertTitle>
              <AlertDescription>
                Features marked with 🔒 require approval before any action is taken.
                All draft emails, deletions, and automated actions go through the approval queue.
              </AlertDescription>
            </Box>
          </Alert>

          <Divider />

          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              <Tab>Features</Tab>
              <Tab>Global Settings</Tab>
              <Tab>Approval Queue</Tab>
            </TabList>

            <TabPanels mt={6}>
              {/* Features Tab */}
              <TabPanel p={0}>
                <Accordion allowMultiple defaultIndex={[0, 1, 2, 3, 4]}>
                  {Object.entries(CATEGORY_INFO).map(([category, info]) => (
                    <AccordionItem key={category} border="none" mb={4}>
                      <GlassPanel variant="light" p={0}>
                        <AccordionButton p={4} _hover={{ bg: bgElevated }}>
                          <HStack flex="1" spacing={3}>
                            <Icon as={info.icon} boxSize={5} color={`${info.color}.500`} />
                            <Text fontWeight="semibold">{info.label}</Text>
                            <Badge colorScheme={info.color} variant="subtle">
                              {featuresByCategory[category]?.filter(f => f.enabled).length || 0} / {featuresByCategory[category]?.length || 0}
                            </Badge>
                          </HStack>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4}>
                          <VStack spacing={4} align="stretch">
                            {featuresByCategory[category]?.map(feature => (
                              <Box
                                key={feature.id}
                                p={4}
                                bg={bgElevated}
                                borderRadius="lg"
                                borderWidth="1px"
                                borderColor={borderColor}
                              >
                                <HStack justify="space-between" align="start">
                                  <Box flex="1">
                                    <HStack spacing={2} mb={1}>
                                      <Text fontWeight="medium">{feature.name}</Text>
                                      {feature.requiresApproval && (
                                        <Tooltip label="Requires approval before action">
                                          <Badge colorScheme="orange" fontSize="xs">🔒 Approval</Badge>
                                        </Tooltip>
                                      )}
                                    </HStack>
                                    <Text fontSize="sm" color={textSecondary}>
                                      {feature.description}
                                    </Text>
                                    
                                    {/* Feature-specific config */}
                                    {feature.enabled && feature.config && (
                                      <HStack mt={3} spacing={4} flexWrap="wrap">
                                        {feature.id === 'deadline_detection' && (
                                          <FormControl maxW="200px">
                                            <FormLabel fontSize="xs">Alert hours before</FormLabel>
                                            <NumberInput
                                              size="sm"
                                              value={feature.config.alertHoursBefore as number}
                                              min={1}
                                              max={72}
                                              onChange={(_, val) => updateFeatureConfig(feature.id, { alertHoursBefore: val })}
                                            >
                                              <NumberInputField />
                                              <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                              </NumberInputStepper>
                                            </NumberInput>
                                          </FormControl>
                                        )}
                                        {feature.id === 'followup_reminders' && (
                                          <>
                                            <FormControl maxW="150px">
                                              <FormLabel fontSize="xs">Default days</FormLabel>
                                              <NumberInput
                                                size="sm"
                                                value={feature.config.defaultDays as number}
                                                min={1}
                                                max={14}
                                                onChange={(_, val) => updateFeatureConfig(feature.id, { defaultDays: val })}
                                              >
                                                <NumberInputField />
                                                <NumberInputStepper>
                                                  <NumberIncrementStepper />
                                                  <NumberDecrementStepper />
                                                </NumberInputStepper>
                                              </NumberInput>
                                            </FormControl>
                                            <FormControl maxW="150px">
                                              <FormLabel fontSize="xs">VIP days</FormLabel>
                                              <NumberInput
                                                size="sm"
                                                value={feature.config.vipDays as number}
                                                min={1}
                                                max={7}
                                                onChange={(_, val) => updateFeatureConfig(feature.id, { vipDays: val })}
                                              >
                                                <NumberInputField />
                                                <NumberInputStepper>
                                                  <NumberIncrementStepper />
                                                  <NumberDecrementStepper />
                                                </NumberInputStepper>
                                              </NumberInput>
                                            </FormControl>
                                          </>
                                        )}
                                        {feature.id === 'meeting_prep' && (
                                          <FormControl maxW="200px">
                                            <FormLabel fontSize="xs">Minutes before meeting</FormLabel>
                                            <NumberInput
                                              size="sm"
                                              value={feature.config.minutesBefore as number}
                                              min={5}
                                              max={120}
                                              onChange={(_, val) => updateFeatureConfig(feature.id, { minutesBefore: val })}
                                            >
                                              <NumberInputField />
                                              <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                              </NumberInputStepper>
                                            </NumberInput>
                                          </FormControl>
                                        )}
                                        {feature.id === 'scheduled_cleanup' && (
                                          <FormControl maxW="200px">
                                            <FormLabel fontSize="xs">Archive after days</FormLabel>
                                            <NumberInput
                                              size="sm"
                                              value={feature.config.archiveAfterDays as number}
                                              min={7}
                                              max={90}
                                              onChange={(_, val) => updateFeatureConfig(feature.id, { archiveAfterDays: val })}
                                            >
                                              <NumberInputField />
                                              <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                              </NumberInputStepper>
                                            </NumberInput>
                                          </FormControl>
                                        )}
                                        {feature.id === 'task_extraction' && (
                                          <FormControl maxW="200px">
                                            <FormLabel fontSize="xs">Sync to</FormLabel>
                                            <Select
                                              size="sm"
                                              value={feature.config.syncTo as string}
                                              onChange={(e) => updateFeatureConfig(feature.id, { syncTo: e.target.value })}
                                            >
                                              <option value="none">None (view only)</option>
                                              <option value="things">Things 3</option>
                                              <option value="todoist">Todoist</option>
                                              <option value="reminders">Apple Reminders</option>
                                            </Select>
                                          </FormControl>
                                        )}
                                      </HStack>
                                    )}
                                  </Box>
                                  <Switch
                                    isChecked={feature.enabled}
                                    onChange={() => toggleFeature(feature.id)}
                                    colorScheme="blue"
                                    size="lg"
                                  />
                                </HStack>
                              </Box>
                            ))}
                          </VStack>
                        </AccordionPanel>
                      </GlassPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabPanel>

              {/* Global Settings Tab */}
              <TabPanel p={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <Heading size="md">Global Settings</Heading>
                    
                    <FormControl>
                      <FormLabel>Hermes Core URL</FormLabel>
                      <HStack>
                        <Box
                          flex="1"
                          p={3}
                          bg={bgElevated}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={borderColor}
                        >
                          <Text fontFamily="mono" fontSize="sm">
                            {settings.globalSettings.hermesUrl}
                          </Text>
                        </Box>
                        <Badge
                          colorScheme={hermesStatus === 'connected' ? 'green' : 'red'}
                          px={3}
                          py={2}
                        >
                          {hermesStatus === 'connected' ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </HStack>
                      <FormHelperText>
                        Hermes Core API endpoint. Configure via environment variable.
                      </FormHelperText>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Default Account</FormLabel>
                      <Select
                        value={settings.globalSettings.defaultAccount}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          globalSettings: {
                            ...prev.globalSettings,
                            defaultAccount: e.target.value as 'all' | 'icloud' | 'work',
                          },
                        }))}
                      >
                        <option value="all">All Accounts</option>
                        <option value="icloud">iCloud</option>
                        <option value="work">Work</option>
                      </Select>
                      <FormHelperText>
                        Default email account for briefings and analysis.
                      </FormHelperText>
                    </FormControl>

                    <Divider />

                    <Heading size="sm">Rate Limits</Heading>

                    <HStack spacing={6}>
                      <FormControl>
                        <FormLabel>Requests per minute</FormLabel>
                        <NumberInput
                          value={settings.globalSettings.rateLimits.requestsPerMinute}
                          min={10}
                          max={100}
                          onChange={(_, val) => setSettings(prev => ({
                            ...prev,
                            globalSettings: {
                              ...prev.globalSettings,
                              rateLimits: {
                                ...prev.globalSettings.rateLimits,
                                requestsPerMinute: val,
                              },
                            },
                          }))}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Drafts per hour</FormLabel>
                        <NumberInput
                          value={settings.globalSettings.rateLimits.draftsPerHour}
                          min={1}
                          max={50}
                          onChange={(_, val) => setSettings(prev => ({
                            ...prev,
                            globalSettings: {
                              ...prev.globalSettings,
                              rateLimits: {
                                ...prev.globalSettings.rateLimits,
                                draftsPerHour: val,
                              },
                            },
                          }))}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </HStack>

                    <Divider />

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <FormLabel mb={0}>Require Approval for All Actions</FormLabel>
                        <FormHelperText mt={1}>
                          When enabled, all automated actions require explicit approval.
                        </FormHelperText>
                      </Box>
                      <Switch
                        isChecked={settings.globalSettings.approvalRequired}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          globalSettings: {
                            ...prev.globalSettings,
                            approvalRequired: e.target.checked,
                          },
                        }))}
                        colorScheme="blue"
                        size="lg"
                      />
                    </FormControl>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Approval Queue Tab */}
              <TabPanel p={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="md">Approval Queue</Heading>
                      <Button
                        size="sm"
                        leftIcon={<Icon as={ArrowPathIcon} />}
                        onClick={() => window.location.href = '/approvals'}
                      >
                        Open Full Queue
                      </Button>
                    </HStack>
                    
                    {pendingApprovals > 0 ? (
                      <Alert status="warning" borderRadius="lg">
                        <AlertIcon />
                        <Box>
                          <AlertTitle>Pending Actions</AlertTitle>
                          <AlertDescription>
                            You have {pendingApprovals} action(s) waiting for approval.
                            Review them to ensure nothing important is blocked.
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ) : (
                      <Alert status="success" borderRadius="lg">
                        <AlertIcon />
                        <Box>
                          <AlertTitle>All Clear</AlertTitle>
                          <AlertDescription>
                            No pending approvals. All automated actions have been processed.
                          </AlertDescription>
                        </Box>
                      </Alert>
                    )}

                    <Text fontSize="sm" color={textSecondary}>
                      The approval queue ensures you stay in control of all automated actions.
                      Draft emails, bulk deletions, and scheduled cleanups all require your explicit approval.
                    </Text>
                  </VStack>
                </GlassPanel>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
