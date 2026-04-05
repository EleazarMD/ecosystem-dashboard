/**
 * Security Settings Page
 * 
 * Comprehensive security configuration for the AI Homelab ecosystem.
 * Controls for content filtering, tool policies, rate limiting, anomaly detection,
 * alerting, and MFA settings.
 */

import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Select,
  Input,
  Button,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  FormControl,
  FormLabel,
  FormHelperText,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiShield,
  FiFilter,
  FiTool,
  FiClock,
  FiAlertTriangle,
  FiBell,
  FiLock,
  FiSave,
  FiRefreshCw,
  FiInfo,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SecurityConfig {
  contentFilter: {
    enabled: boolean;
    strictMode: boolean;
    blockThreshold: number;
    logAllAttempts: boolean;
  };
  toolPolicy: {
    enabled: boolean;
    defaultRequiresApproval: boolean;
    sandboxByDefault: boolean;
    blockedPatterns: string[];
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    perUserLimits: boolean;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivityLevel: 'low' | 'medium' | 'high';
    alertThreshold: number;
    learningMode: boolean;
  };
  alerting: {
    enabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  mfa: {
    required: boolean;
    allowedMethods: string[];
    sessionDuration: number;
  };
}

const defaultConfig: SecurityConfig = {
  contentFilter: {
    enabled: true,
    strictMode: false,
    blockThreshold: 0.7,
    logAllAttempts: true,
  },
  toolPolicy: {
    enabled: true,
    defaultRequiresApproval: false,
    sandboxByDefault: true,
    blockedPatterns: ['rm -rf', 'sudo', 'chmod 777', 'mkfs', 'dd if='],
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    burstLimit: 10,
    perUserLimits: true,
  },
  anomalyDetection: {
    enabled: true,
    sensitivityLevel: 'medium',
    alertThreshold: 0.7,
    learningMode: false,
  },
  alerting: {
    enabled: true,
    emailNotifications: true,
    pushNotifications: true,
    webhookEnabled: false,
    webhookUrl: '',
  },
  mfa: {
    required: false,
    allowedMethods: ['totp', 'email'],
    sessionDuration: 30,
  },
};

export default function SecuritySettingsPage() {
  const [config, setConfig] = useState<SecurityConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/security/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch security config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/security/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Security configuration updated successfully',
          status: 'success',
          duration: 3000,
        });
        setHasChanges(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save security settings',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  }

  function updateConfig<K extends keyof SecurityConfig>(
    section: K,
    key: keyof SecurityConfig[K],
    value: any
  ) {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  }

  return (
    <SecurityLayout>
      <Head>
        <title>Security Settings | AI Homelab</title>
        <meta name="description" content="Configure security settings for your AI Homelab" />
      </Head>

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
            <HStack justify="space-between" wrap="wrap" gap={4}>
              <VStack align="start" spacing={1}>
                <HStack>
                  <Icon as={FiShield} boxSize={6} />
                  <Heading size="lg">Security Settings</Heading>
                </HStack>
                <Text color={textSecondary}>
                  Configure security controls for your AI Homelab ecosystem
                </Text>
              </VStack>
              <HStack>
                <Button
                  leftIcon={<FiRefreshCw />}
                  variant="outline"
                  onClick={fetchConfig}
                  isLoading={loading}
                >
                  Refresh
                </Button>
                <Button
                  leftIcon={<FiSave />}
                  colorScheme="blue"
                  onClick={saveConfig}
                  isLoading={saving}
                  isDisabled={!hasChanges}
                >
                  Save Changes
                </Button>
              </HStack>
            </HStack>

            {hasChanges && (
              <Alert status="warning" borderRadius="md" mt={4}>
                <AlertIcon />
                You have unsaved changes
              </Alert>
            )}
          </GlassPanel>

          {/* Settings Tabs */}
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList flexWrap="wrap">
              <Tab><Icon as={FiFilter} mr={2} />Content Filter</Tab>
              <Tab><Icon as={FiTool} mr={2} />Tool Policies</Tab>
              <Tab><Icon as={FiClock} mr={2} />Rate Limiting</Tab>
              <Tab><Icon as={FiAlertTriangle} mr={2} />Anomaly Detection</Tab>
              <Tab><Icon as={FiBell} mr={2} />Alerting</Tab>
              <Tab><Icon as={FiLock} mr={2} />MFA</Tab>
            </TabList>

            <TabPanels>
              {/* Content Filter Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Content Filter</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Protect against prompt injection and malicious content
                        </Text>
                      </Box>
                      <Switch
                        isChecked={config.contentFilter.enabled}
                        onChange={(e) => updateConfig('contentFilter', 'enabled', e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>
                          <HStack>
                            <Text>Strict Mode</Text>
                            <Tooltip label="Block content at lower confidence thresholds">
                              <Icon as={FiInfo} color="gray.400" />
                            </Tooltip>
                          </HStack>
                        </FormLabel>
                        <Switch
                          isChecked={config.contentFilter.strictMode}
                          onChange={(e) => updateConfig('contentFilter', 'strictMode', e.target.checked)}
                          isDisabled={!config.contentFilter.enabled}
                        />
                        <FormHelperText>
                          More aggressive filtering, may have false positives
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Block Threshold</FormLabel>
                        <Slider
                          value={config.contentFilter.blockThreshold * 100}
                          onChange={(v) => updateConfig('contentFilter', 'blockThreshold', v / 100)}
                          min={30}
                          max={95}
                          isDisabled={!config.contentFilter.enabled}
                        >
                          <SliderMark value={30} mt={2} fontSize="xs">30%</SliderMark>
                          <SliderMark value={70} mt={2} fontSize="xs">70%</SliderMark>
                          <SliderMark value={95} mt={2} fontSize="xs">95%</SliderMark>
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <FormHelperText mt={6}>
                          Current: {(config.contentFilter.blockThreshold * 100).toFixed(0)}% confidence
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Log All Attempts</FormLabel>
                        <Switch
                          isChecked={config.contentFilter.logAllAttempts}
                          onChange={(e) => updateConfig('contentFilter', 'logAllAttempts', e.target.checked)}
                          isDisabled={!config.contentFilter.enabled}
                        />
                        <FormHelperText>
                          Log all filter checks, not just blocks
                        </FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Tool Policies Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Tool Execution Policies</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Control which tools agents can execute and how
                        </Text>
                      </Box>
                      <Switch
                        isChecked={config.toolPolicy.enabled}
                        onChange={(e) => updateConfig('toolPolicy', 'enabled', e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>Default Requires Approval</FormLabel>
                        <Switch
                          isChecked={config.toolPolicy.defaultRequiresApproval}
                          onChange={(e) => updateConfig('toolPolicy', 'defaultRequiresApproval', e.target.checked)}
                          isDisabled={!config.toolPolicy.enabled}
                        />
                        <FormHelperText>
                          Require approval for all tool executions by default
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Sandbox by Default</FormLabel>
                        <Switch
                          isChecked={config.toolPolicy.sandboxByDefault}
                          onChange={(e) => updateConfig('toolPolicy', 'sandboxByDefault', e.target.checked)}
                          isDisabled={!config.toolPolicy.enabled}
                        />
                        <FormHelperText>
                          Run code execution in isolated containers
                        </FormHelperText>
                      </FormControl>
                    </SimpleGrid>

                    <FormControl>
                      <FormLabel>Blocked Patterns</FormLabel>
                      <HStack flexWrap="wrap" gap={2}>
                        {config.toolPolicy.blockedPatterns.map((pattern, i) => (
                          <Badge key={i} colorScheme="red" px={2} py={1}>
                            {pattern}
                          </Badge>
                        ))}
                      </HStack>
                      <FormHelperText>
                        Commands matching these patterns are always blocked
                      </FormHelperText>
                    </FormControl>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Rate Limiting Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Rate Limiting</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Protect against abuse and ensure fair resource usage
                        </Text>
                      </Box>
                      <Switch
                        isChecked={config.rateLimiting.enabled}
                        onChange={(e) => updateConfig('rateLimiting', 'enabled', e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>Requests per Minute</FormLabel>
                        <Slider
                          value={config.rateLimiting.requestsPerMinute}
                          onChange={(v) => updateConfig('rateLimiting', 'requestsPerMinute', v)}
                          min={10}
                          max={200}
                          isDisabled={!config.rateLimiting.enabled}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <FormHelperText>
                          Current: {config.rateLimiting.requestsPerMinute} req/min
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Burst Limit</FormLabel>
                        <Slider
                          value={config.rateLimiting.burstLimit}
                          onChange={(v) => updateConfig('rateLimiting', 'burstLimit', v)}
                          min={5}
                          max={50}
                          isDisabled={!config.rateLimiting.enabled}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <FormHelperText>
                          Current: {config.rateLimiting.burstLimit} requests
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Per-User Limits</FormLabel>
                        <Switch
                          isChecked={config.rateLimiting.perUserLimits}
                          onChange={(e) => updateConfig('rateLimiting', 'perUserLimits', e.target.checked)}
                          isDisabled={!config.rateLimiting.enabled}
                        />
                        <FormHelperText>
                          Track limits per user instead of globally
                        </FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Anomaly Detection Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Anomaly Detection</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Detect unusual behavior patterns automatically
                        </Text>
                      </Box>
                      <Switch
                        isChecked={config.anomalyDetection.enabled}
                        onChange={(e) => updateConfig('anomalyDetection', 'enabled', e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>Sensitivity Level</FormLabel>
                        <Select
                          value={config.anomalyDetection.sensitivityLevel}
                          onChange={(e) => updateConfig('anomalyDetection', 'sensitivityLevel', e.target.value)}
                          isDisabled={!config.anomalyDetection.enabled}
                        >
                          <option value="low">Low - Fewer alerts, may miss some anomalies</option>
                          <option value="medium">Medium - Balanced detection</option>
                          <option value="high">High - More alerts, may have false positives</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Alert Threshold</FormLabel>
                        <Slider
                          value={config.anomalyDetection.alertThreshold * 100}
                          onChange={(v) => updateConfig('anomalyDetection', 'alertThreshold', v / 100)}
                          min={50}
                          max={95}
                          isDisabled={!config.anomalyDetection.enabled}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <FormHelperText>
                          Current: {(config.anomalyDetection.alertThreshold * 100).toFixed(0)}%
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Learning Mode</FormLabel>
                        <Switch
                          isChecked={config.anomalyDetection.learningMode}
                          onChange={(e) => updateConfig('anomalyDetection', 'learningMode', e.target.checked)}
                          isDisabled={!config.anomalyDetection.enabled}
                        />
                        <FormHelperText>
                          Log anomalies but don't trigger alerts (for baseline building)
                        </FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* Alerting Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Alerting & Notifications</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Configure how you receive security alerts
                        </Text>
                      </Box>
                      <Switch
                        isChecked={config.alerting.enabled}
                        onChange={(e) => updateConfig('alerting', 'enabled', e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>Email Notifications</FormLabel>
                        <Switch
                          isChecked={config.alerting.emailNotifications}
                          onChange={(e) => updateConfig('alerting', 'emailNotifications', e.target.checked)}
                          isDisabled={!config.alerting.enabled}
                        />
                        <FormHelperText>
                          Send alerts to your email address
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Push Notifications</FormLabel>
                        <Switch
                          isChecked={config.alerting.pushNotifications}
                          onChange={(e) => updateConfig('alerting', 'pushNotifications', e.target.checked)}
                          isDisabled={!config.alerting.enabled}
                        />
                        <FormHelperText>
                          Send alerts to your mobile devices
                        </FormHelperText>
                      </FormControl>

                      <FormControl gridColumn={{ md: 'span 2' }}>
                        <FormLabel>
                          <HStack>
                            <Text>Webhook Integration</Text>
                            <Switch
                              isChecked={config.alerting.webhookEnabled}
                              onChange={(e) => updateConfig('alerting', 'webhookEnabled', e.target.checked)}
                              isDisabled={!config.alerting.enabled}
                              size="sm"
                            />
                          </HStack>
                        </FormLabel>
                        <Input
                          placeholder="https://your-webhook-url.com/alerts"
                          value={config.alerting.webhookUrl}
                          onChange={(e) => updateConfig('alerting', 'webhookUrl', e.target.value)}
                          isDisabled={!config.alerting.enabled || !config.alerting.webhookEnabled}
                        />
                        <FormHelperText>
                          Send alerts to external services (Slack, Discord, PagerDuty, etc.)
                        </FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              {/* MFA Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={6} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="sm">Multi-Factor Authentication</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Require additional verification for sensitive actions
                        </Text>
                      </Box>
                      <Badge colorScheme={config.mfa.required ? 'green' : 'gray'}>
                        {config.mfa.required ? 'Required' : 'Optional'}
                      </Badge>
                    </HStack>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl>
                        <FormLabel>Require MFA</FormLabel>
                        <Switch
                          isChecked={config.mfa.required}
                          onChange={(e) => updateConfig('mfa', 'required', e.target.checked)}
                        />
                        <FormHelperText>
                          Require MFA for all users
                        </FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Session Duration (minutes)</FormLabel>
                        <Select
                          value={config.mfa.sessionDuration}
                          onChange={(e) => updateConfig('mfa', 'sessionDuration', parseInt(e.target.value))}
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={480}>8 hours</option>
                        </Select>
                        <FormHelperText>
                          How long MFA verification remains valid
                        </FormHelperText>
                      </FormControl>

                      <FormControl gridColumn={{ md: 'span 2' }}>
                        <FormLabel>Allowed Methods</FormLabel>
                        <HStack spacing={4}>
                          <Badge
                            colorScheme={config.mfa.allowedMethods.includes('totp') ? 'green' : 'gray'}
                            px={3}
                            py={1}
                            cursor="pointer"
                          >
                            TOTP (Authenticator App)
                          </Badge>
                          <Badge
                            colorScheme={config.mfa.allowedMethods.includes('email') ? 'green' : 'gray'}
                            px={3}
                            py={1}
                            cursor="pointer"
                          >
                            Email Code
                          </Badge>
                          <Badge
                            colorScheme={config.mfa.allowedMethods.includes('sms') ? 'green' : 'gray'}
                            px={3}
                            py={1}
                            cursor="pointer"
                          >
                            SMS (Coming Soon)
                          </Badge>
                        </HStack>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </GlassPanel>
              </TabPanel>
            </TabPanels>
          </Tabs>
      </VStack>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/settings',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
