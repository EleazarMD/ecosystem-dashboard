/**
 * Child Parental Controls Editor Page
 * 
 * Configure parental controls for a child account
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  IconButton,
  useToast,
  Spinner,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Checkbox,
  CheckboxGroup,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Alert,
  AlertIcon,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiSave,
  FiShield,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiLock,
  FiEye,
  FiBell,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withParent } from '@/lib/auth/withParent';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { SAFETY_PRESETS, SAFETY_CATEGORY_DEFINITIONS, getSafetyCategoriesForLevel, type SafetyCategoryCode } from '@/lib/platform/safety-presets';
import type { ContentFilterLevel } from '@/lib/platform/child-account-types';

interface ParentalControls {
  contentFilterLevel: string;
  safetyCategories: SafetyCategoryCode[];
  blockedTopics: string[];
  allowedTopics: string[];
  maxConversationLength: number;
  dailyUsageLimitMinutes: number;
  dailyImageGenerationLimit?: number;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  allowedDays: string[];
  allowedServices: string[];
  blockedServices: string[];
  requireApprovalForNewConversations: boolean;
  requireApprovalForImageGeneration: boolean;
  requireApprovalForExternalLinks: boolean;
  requireApprovalForDataExport: boolean;
  logAllConversations: boolean;
  sendDailyActivityReport: boolean;
  alertOnBlockedContent: boolean;
  parentCanViewConversations: boolean;
  isActive: boolean;
}

const AVAILABLE_SERVICES = [
  { id: 'workspace', name: 'Workspace' },
  { id: 'goosemind-chat', name: 'AI Chat' },
  { id: 'read-aloud', name: 'Read Aloud (TTS)', description: 'Text-to-speech for books and content' },
  { id: 'books', name: 'Books Library', description: 'Access to digital books' },
  { id: 'research-lab', name: 'Research Lab' },
  { id: 'email-client', name: 'Email Client' },
  { id: 'code-assistant', name: 'Code Assistant' },
  { id: 'image-generator', name: 'Image Generator' },
];

const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Mon' },
  { id: 'tuesday', name: 'Tue' },
  { id: 'wednesday', name: 'Wed' },
  { id: 'thursday', name: 'Thu' },
  { id: 'friday', name: 'Fri' },
  { id: 'saturday', name: 'Sat' },
  { id: 'sunday', name: 'Sun' },
];

function ControlsEditorPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { setActiveTab, setCustomData } = useRightPanel();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childName, setChildName] = useState('');
  const [controls, setControls] = useState<ParentalControls>({
    contentFilterLevel: 'strict',
    safetyCategories: ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'],
    blockedTopics: [],
    allowedTopics: [],
    maxConversationLength: 50,
    dailyUsageLimitMinutes: 120,
    dailyImageGenerationLimit: 10,
    allowedHoursStart: '08:00',
    allowedHoursEnd: '21:00',
    allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    allowedServices: [],
    blockedServices: [],
    requireApprovalForNewConversations: false,
    requireApprovalForImageGeneration: true,
    requireApprovalForExternalLinks: true,
    requireApprovalForDataExport: true,
    logAllConversations: true,
    sendDailyActivityReport: true,
    alertOnBlockedContent: true,
    parentCanViewConversations: true,
    isActive: true,
  });

  // Set the right panel to show the "controls" tab and pass child ID
  useEffect(() => {
    if (childId) {
      setActiveTab('controls');
      setCustomData({ selectedChildId: childId });
    }
  }, [childId, setActiveTab, setCustomData]);

  const fetchControls = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child name
      const childRes = await fetch(`/api/family/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
      }

      // Get controls
      const res = await fetch(`/api/family/children/${childId}/controls`);
      const data = await res.json();
      
      if (res.ok && data.controls) {
        setControls(data.controls);
      }
    } catch (error) {
      toast({ title: 'Failed to fetch controls', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
  }, [childId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/family/children/${childId}/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(controls),
      });

      if (res.ok) {
        toast({ title: 'Controls saved successfully', status: 'success' });
      } else {
        const data = await res.json();
        toast({ title: data.error || 'Failed to save', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to save controls', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (serviceId: string, type: 'allowed' | 'blocked') => {
    if (type === 'allowed') {
      const isAllowed = controls.allowedServices.includes(serviceId);
      setControls({
        ...controls,
        allowedServices: isAllowed
          ? controls.allowedServices.filter(s => s !== serviceId)
          : [...controls.allowedServices, serviceId],
        blockedServices: controls.blockedServices.filter(s => s !== serviceId),
      });
    } else {
      const isBlocked = controls.blockedServices.includes(serviceId);
      setControls({
        ...controls,
        blockedServices: isBlocked
          ? controls.blockedServices.filter(s => s !== serviceId)
          : [...controls.blockedServices, serviceId],
        allowedServices: controls.allowedServices.filter(s => s !== serviceId),
      });
    }
  };

  const toggleDay = (dayId: string) => {
    const isAllowed = controls.allowedDays.includes(dayId);
    setControls({
      ...controls,
      allowedDays: isAllowed
        ? controls.allowedDays.filter(d => d !== dayId)
        : [...controls.allowedDays, dayId],
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color={textSecondary}>Loading controls...</Text>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href={`/family/${childId}`}>{childName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Controls</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <IconButton
                as={NextLink}
                href={`/family/${childId}`}
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
              />
              <VStack align="start" spacing={0}>
                <Heading size="lg">Parental Controls</Heading>
                <Text color={textSecondary}>Configure safety settings for {childName}</Text>
              </VStack>
            </HStack>
            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              onClick={handleSave}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </HStack>

          {/* Master Switch */}
          <GlassPanel variant="light" p={5}>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Icon as={FiLock} boxSize={6} color={controls.isActive ? 'green.500' : 'gray.400'} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">Parental Controls Active</Text>
                  <Text fontSize="sm" color={textSecondary}>
                    {controls.isActive ? 'All restrictions are being enforced' : 'Controls are disabled'}
                  </Text>
                </VStack>
              </HStack>
              <Switch
                size="lg"
                isChecked={controls.isActive}
                onChange={(e) => setControls({ ...controls, isActive: e.target.checked })}
                colorScheme="green"
              />
            </HStack>
          </GlassPanel>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Content Filtering */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiShield} color="blue.500" />
                  <Heading size="sm">Content Filtering</Heading>
                </HStack>
                <Divider />

                <FormControl>
                  <FormLabel>Safety Preset</FormLabel>
                  <Select
                    value={controls.contentFilterLevel}
                    onChange={(e) => {
                      const newLevel = e.target.value as ContentFilterLevel;
                      const newCategories = getSafetyCategoriesForLevel(newLevel);
                      setControls({ 
                        ...controls, 
                        contentFilterLevel: newLevel,
                        safetyCategories: newCategories 
                      });
                    }}
                  >
                    {SAFETY_PRESETS.map(preset => (
                      <option key={preset.level} value={preset.level}>
                        {preset.name} - {preset.description}
                      </option>
                    ))}
                  </Select>
                  <FormHelperText>
                    {SAFETY_PRESETS.find(p => p.level === controls.contentFilterLevel)?.explanation}
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>
                    Safety Categories
                    <Text as="span" fontSize="xs" color={textSecondary} ml={2}>
                      (Granular Control)
                    </Text>
                  </FormLabel>
                  <VStack align="stretch" spacing={2} mt={2}>
                    {Object.entries(SAFETY_CATEGORY_DEFINITIONS).map(([code, def]) => {
                      const isEnabled = controls.safetyCategories.includes(code as SafetyCategoryCode);
                      const isRecommended = def.recommendedForChildren || def.recommendedForTeens;
                      
                      return (
                        <HStack
                          key={code}
                          p={2}
                          borderRadius="md"
                          bg={isEnabled ? 'blue.50' : 'transparent'}
                          borderWidth="1px"
                          borderColor={isEnabled ? 'blue.200' : 'gray.200'}
                          _dark={{
                            bg: isEnabled ? 'blue.900' : 'transparent',
                            borderColor: isEnabled ? 'blue.700' : 'gray.700',
                          }}
                        >
                          <Checkbox
                            isChecked={isEnabled}
                            onChange={(e) => {
                              const newCategories = e.target.checked
                                ? [...controls.safetyCategories, code as SafetyCategoryCode]
                                : controls.safetyCategories.filter(c => c !== code);
                              setControls({ ...controls, safetyCategories: newCategories });
                            }}
                            colorScheme="blue"
                          />
                          <VStack align="start" spacing={0} flex={1}>
                            <HStack>
                              <Text fontWeight="medium" fontSize="sm">
                                {code}: {def.name}
                              </Text>
                              {isRecommended && (
                                <Tag size="sm" colorScheme="green" variant="subtle">
                                  Recommended
                                </Tag>
                              )}
                              {def.severity === 'critical' && (
                                <Tag size="sm" colorScheme="red" variant="subtle">
                                  Critical
                                </Tag>
                              )}
                            </HStack>
                            <Text fontSize="xs" color={textSecondary}>
                              {def.description}
                            </Text>
                          </VStack>
                        </HStack>
                      );
                    })}
                  </VStack>
                  <FormHelperText mt={3}>
                    <Alert status="info" variant="left-accent" size="sm">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">Note: S8 (Intellectual Property) is intentionally excluded</Text>
                        <Text fontSize="xs">
                          This allows children to create art with copyrighted characters like Sonic, Mario, Godzilla, etc.
                          Safety focuses on violence, sexual content, hate speech, and harmful behavior.
                        </Text>
                      </VStack>
                    </Alert>
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Max Conversation Length</FormLabel>
                  <Slider
                    value={controls.maxConversationLength}
                    onChange={(val) => setControls({ ...controls, maxConversationLength: val })}
                    min={10}
                    max={100}
                    step={5}
                  >
                    <SliderMark value={25} mt={2} fontSize="xs">25</SliderMark>
                    <SliderMark value={50} mt={2} fontSize="xs">50</SliderMark>
                    <SliderMark value={75} mt={2} fontSize="xs">75</SliderMark>
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <FormHelperText mt={6}>{controls.maxConversationLength} messages per conversation</FormHelperText>
                </FormControl>
              </VStack>
            </GlassPanel>

            {/* Time Limits */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiClock} color="purple.500" />
                  <Heading size="sm">Time Limits</Heading>
                </HStack>
                <Divider />

                <FormControl>
                  <FormLabel>Daily Usage Limit</FormLabel>
                  <Slider
                    value={controls.dailyUsageLimitMinutes}
                    onChange={(val) => setControls({ ...controls, dailyUsageLimitMinutes: val })}
                    min={15}
                    max={480}
                    step={15}
                  >
                    <SliderMark value={60} mt={2} fontSize="xs">1h</SliderMark>
                    <SliderMark value={120} mt={2} fontSize="xs">2h</SliderMark>
                    <SliderMark value={240} mt={2} fontSize="xs">4h</SliderMark>
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <FormHelperText mt={6}>
                    {Math.floor(controls.dailyUsageLimitMinutes / 60)}h {controls.dailyUsageLimitMinutes % 60}m per day
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Daily Image Generation Limit</FormLabel>
                  <Slider
                    value={controls.dailyImageGenerationLimit || 10}
                    onChange={(val) => setControls({ ...controls, dailyImageGenerationLimit: val })}
                    min={0}
                    max={50}
                    step={1}
                  >
                    <SliderMark value={0} mt={2} fontSize="xs">0</SliderMark>
                    <SliderMark value={10} mt={2} fontSize="xs">10</SliderMark>
                    <SliderMark value={25} mt={2} fontSize="xs">25</SliderMark>
                    <SliderMark value={50} mt={2} fontSize="xs">50</SliderMark>
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <FormHelperText mt={6}>
                    {controls.dailyImageGenerationLimit || 10} images per day (set to 0 to disable)
                  </FormHelperText>
                </FormControl>

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>Start Time</FormLabel>
                    <Input
                      type="time"
                      value={controls.allowedHoursStart}
                      onChange={(e) => setControls({ ...controls, allowedHoursStart: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>End Time</FormLabel>
                    <Input
                      type="time"
                      value={controls.allowedHoursEnd}
                      onChange={(e) => setControls({ ...controls, allowedHoursEnd: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Allowed Days</FormLabel>
                  <HStack spacing={2} wrap="wrap">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.id}
                        size="sm"
                        variant={controls.allowedDays.includes(day.id) ? 'solid' : 'outline'}
                        colorScheme={controls.allowedDays.includes(day.id) ? 'green' : 'gray'}
                        onClick={() => toggleDay(day.id)}
                      >
                        {day.name}
                      </Button>
                    ))}
                  </HStack>
                </FormControl>
              </VStack>
            </GlassPanel>

            {/* Service Access */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Heading size="sm">Service Access</Heading>
                </HStack>
                <Divider />

                {AVAILABLE_SERVICES.map((service) => {
                  const isAllowed = controls.allowedServices.includes(service.id);
                  const isBlocked = controls.blockedServices.includes(service.id);
                  
                  return (
                    <HStack key={service.id} justify="space-between">
                      <Text>{service.name}</Text>
                      <HStack spacing={2}>
                        <Button
                          size="xs"
                          variant={isAllowed ? 'solid' : 'outline'}
                          colorScheme="green"
                          onClick={() => toggleService(service.id, 'allowed')}
                        >
                          Allow
                        </Button>
                        <Button
                          size="xs"
                          variant={isBlocked ? 'solid' : 'outline'}
                          colorScheme="red"
                          onClick={() => toggleService(service.id, 'blocked')}
                        >
                          Block
                        </Button>
                      </HStack>
                    </HStack>
                  );
                })}
              </VStack>
            </GlassPanel>

            {/* Approval Requirements */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiAlertTriangle} color="orange.500" />
                  <Heading size="sm">Approval Requirements</Heading>
                </HStack>
                <Divider />

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb={0}>New Conversations</FormLabel>
                  <Switch
                    isChecked={controls.requireApprovalForNewConversations}
                    onChange={(e) => setControls({ ...controls, requireApprovalForNewConversations: e.target.checked })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb={0}>Image Generation</FormLabel>
                  <Switch
                    isChecked={controls.requireApprovalForImageGeneration}
                    onChange={(e) => setControls({ ...controls, requireApprovalForImageGeneration: e.target.checked })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb={0}>External Links</FormLabel>
                  <Switch
                    isChecked={controls.requireApprovalForExternalLinks}
                    onChange={(e) => setControls({ ...controls, requireApprovalForExternalLinks: e.target.checked })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb={0}>Data Export</FormLabel>
                  <Switch
                    isChecked={controls.requireApprovalForDataExport}
                    onChange={(e) => setControls({ ...controls, requireApprovalForDataExport: e.target.checked })}
                  />
                </FormControl>
              </VStack>
            </GlassPanel>

            {/* Monitoring & Notifications */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiEye} color="cyan.500" />
                  <Heading size="sm">Monitoring</Heading>
                </HStack>
                <Divider />

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <VStack align="start" spacing={0}>
                    <FormLabel mb={0}>Log All Conversations</FormLabel>
                    <Text fontSize="xs" color={textSecondary}>Save conversation history for review</Text>
                  </VStack>
                  <Switch
                    isChecked={controls.logAllConversations}
                    onChange={(e) => setControls({ ...controls, logAllConversations: e.target.checked })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <VStack align="start" spacing={0}>
                    <FormLabel mb={0}>View Conversations</FormLabel>
                    <Text fontSize="xs" color={textSecondary}>Allow parent to read message content</Text>
                  </VStack>
                  <Switch
                    isChecked={controls.parentCanViewConversations}
                    onChange={(e) => setControls({ ...controls, parentCanViewConversations: e.target.checked })}
                  />
                </FormControl>
              </VStack>
            </GlassPanel>

            {/* Notifications */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiBell} color="yellow.500" />
                  <Heading size="sm">Notifications</Heading>
                </HStack>
                <Divider />

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <VStack align="start" spacing={0}>
                    <FormLabel mb={0}>Daily Activity Report</FormLabel>
                    <Text fontSize="xs" color={textSecondary}>Receive daily email summary</Text>
                  </VStack>
                  <Switch
                    isChecked={controls.sendDailyActivityReport}
                    onChange={(e) => setControls({ ...controls, sendDailyActivityReport: e.target.checked })}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <VStack align="start" spacing={0}>
                    <FormLabel mb={0}>Blocked Content Alerts</FormLabel>
                    <Text fontSize="xs" color={textSecondary}>Get notified when content is blocked</Text>
                  </VStack>
                  <Switch
                    isChecked={controls.alertOnBlockedContent}
                    onChange={(e) => setControls({ ...controls, alertOnBlockedContent: e.target.checked })}
                  />
                </FormControl>
              </VStack>
            </GlassPanel>
          </SimpleGrid>

          {/* Save Button (bottom) */}
          <HStack justify="flex-end">
            <Button variant="outline" as={NextLink} href={`/family/${childId}`}>
              Cancel
            </Button>
            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              onClick={handleSave}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </HStack>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export default withParent(ControlsEditorPage);
