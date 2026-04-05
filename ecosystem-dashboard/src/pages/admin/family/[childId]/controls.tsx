/**
 * Parental Controls Editor Page
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
  FiLock,
  FiUnlock,
  FiPlus,
  FiImage,
  FiUpload,
  FiTrash2,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface DaySchedule {
  start: string;
  end: string;
  minutes: number;
}

interface ParentalControls {
  id: string;
  childUserId: string;
  parentUserId: string;
  allowedServices: string[];
  blockedServices: string[];
  contentFilterLevel: string;
  blockedTopics: string[];
  allowedTopics: string[];
  maxConversationLength: number;
  dailyUsageLimitMinutes: number;
  dailyImageGenerationLimit: number;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  allowedDays: string[];
  allowedHoursByDay?: Record<string, DaySchedule>;
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
  { id: 'workspace', name: 'Workspace AI', description: 'Notes and homework help' },
  { id: 'goosemind-chat', name: 'GooseMind Chat', description: 'AI conversations' },
  { id: 'calendar', name: 'Calendar', description: 'View family calendar' },
  { id: 'email-client', name: 'Email Client', description: 'Email access' },
  { id: 'image-studio', name: 'Image Studio', description: 'Image generation' },
  { id: 'research-lab', name: 'Research Lab', description: 'Document analysis' },
  { id: 'podcast-studio', name: 'Podcast Studio', description: 'Audio generation' },
];

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const DEFAULT_BLOCKED_TOPICS = [
  'violence', 'adult_content', 'gambling', 'drugs', 'weapons', 'self_harm'
];

const DEFAULT_ALLOWED_TOPICS = [
  'education', 'homework', 'creative_writing', 'science', 'math', 'coding', 'art', 'music', 'games'
];

function ParentalControlsPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { setActiveTab, setCustomData } = useRightPanel();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childName, setChildName] = useState('');
  const [controls, setControls] = useState<ParentalControls | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [subscriptionLimit, setSubscriptionLimit] = useState<{ daily: number; monthly: number }>({ daily: 50, monthly: 500 });
  
  // Theme customization state
  const [themeImages, setThemeImages] = useState<Record<string, string[]>>({});
  const [selectedTheme, setSelectedTheme] = useState('pusheen');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Set the right panel to show the "controls" tab and pass child ID and controls data
  useEffect(() => {
    if (childId && controls) {
      setActiveTab('controls');
      setCustomData({ 
        selectedChildId: childId,
        controls: controls,
        onScheduleChange: (schedule: Record<string, DaySchedule>) => {
          updateControl('allowedHoursByDay', schedule);
        }
      });
    }
  }, [childId, controls, setActiveTab, setCustomData]);

  const fetchControls = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child info
      const childRes = await fetch(`/api/admin/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
        
        // Get subscription limits
        if (childData.child.subscriptionTier) {
          const subRes = await fetch(`/api/subscription/limits`);
          if (subRes.ok) {
            const subData = await subRes.json();
            setSubscriptionLimit({
              daily: subData.dailyImageGenerationsLimit || 50,
              monthly: subData.monthlyImageGenerationsLimit || 500
            });
          }
        }
      }

      // Get controls
      const res = await fetch(`/api/admin/children/${childId}/controls`);
      const data = await res.json();
      
      if (res.ok) {
        setControls(data.controls);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch controls', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (childId) {
      fetchControls();
      fetchThemeImages();
    }
  }, [childId]);

  // Fetch theme images
  const fetchThemeImages = async () => {
    try {
      const res = await fetch('/api/admin/theme-images');
      if (res.ok) {
        const data = await res.json();
        setThemeImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch theme images:', error);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('themeId', selectedTheme);
      formData.append('imageType', `background-${Date.now()}`);

      const res = await fetch('/api/admin/upload-theme-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Image uploaded successfully', status: 'success' });
        fetchThemeImages();
      } else {
        toast({ title: data.error || 'Upload failed', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to upload image', status: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle image delete
  const handleDeleteImage = async (imagePath: string) => {
    try {
      const res = await fetch('/api/admin/theme-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath }),
      });

      if (res.ok) {
        toast({ title: 'Image deleted', status: 'success' });
        fetchThemeImages();
      } else {
        toast({ title: 'Failed to delete image', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete image', status: 'error' });
    }
  };

  const handleSave = async () => {
    if (!controls) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/controls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(controls),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Controls saved successfully', status: 'success' });
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to save controls', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateControl = (key: keyof ParentalControls, value: any) => {
    if (!controls) return;
    setControls({ ...controls, [key]: value });
  };

  const toggleService = (serviceId: string, allowed: boolean) => {
    if (!controls) return;
    
    if (allowed) {
      // Add to allowed, remove from blocked
      setControls({
        ...controls,
        allowedServices: [...controls.allowedServices.filter(s => s !== serviceId), serviceId],
        blockedServices: controls.blockedServices.filter(s => s !== serviceId),
      });
    } else {
      // Add to blocked, remove from allowed
      setControls({
        ...controls,
        blockedServices: [...controls.blockedServices.filter(s => s !== serviceId), serviceId],
        allowedServices: controls.allowedServices.filter(s => s !== serviceId),
      });
    }
  };

  const addBlockedTopic = () => {
    if (!controls || !newTopic.trim()) return;
    if (!controls.blockedTopics.includes(newTopic.trim().toLowerCase())) {
      updateControl('blockedTopics', [...controls.blockedTopics, newTopic.trim().toLowerCase()]);
    }
    setNewTopic('');
  };

  const removeBlockedTopic = (topic: string) => {
    if (!controls) return;
    updateControl('blockedTopics', controls.blockedTopics.filter(t => t !== topic));
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

  if (!controls) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <Alert status="error">
            <AlertIcon />
            Parental controls not found
          </Alert>
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
              <BreadcrumbLink as={NextLink} href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/admin/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href={`/admin/family/${childId}`}>{childName}</BreadcrumbLink>
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
                href={`/admin/family/${childId}`}
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
              />
              <VStack align="start" spacing={0}>
                <Heading size="lg">Parental Controls</Heading>
                <Text color={textSecondary}>Configure restrictions for {childName}</Text>
              </VStack>
            </HStack>
            <HStack spacing={3}>
              <FormControl display="flex" alignItems="center" w="auto">
                <FormLabel mb={0} mr={2}>Controls Active</FormLabel>
                <Switch
                  isChecked={controls.isActive}
                  onChange={(e) => updateControl('isActive', e.target.checked)}
                  colorScheme="green"
                  size="lg"
                />
              </FormControl>
              <Button
                leftIcon={<FiSave />}
                colorScheme="blue"
                onClick={handleSave}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </HStack>
          </HStack>

          {!controls.isActive && (
            <Alert status="warning">
              <AlertIcon />
              Parental controls are currently disabled. The child has unrestricted access.
            </Alert>
          )}

          {/* Content Filtering */}
          <GlassPanel variant="light" p={6}>
            <VStack align="stretch" spacing={5}>
              <HStack>
                <Icon as={FiShield} color="blue.500" boxSize={5} />
                <Heading size="md">Content Filtering</Heading>
              </HStack>
              <Divider />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <FormControl>
                  <FormLabel>Filter Level</FormLabel>
                  <Select
                    value={controls.contentFilterLevel}
                    onChange={(e) => updateControl('contentFilterLevel', e.target.value)}
                  >
                    <option value="strict">Strict - Maximum protection (ages 0-10)</option>
                    <option value="moderate">Moderate - Balanced (ages 10-13)</option>
                    <option value="standard">Standard - Light filtering (ages 14-17)</option>
                  </Select>
                  <FormHelperText>
                    Strict blocks most sensitive topics, Standard only blocks critical content
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Max Messages per Conversation</FormLabel>
                  <Input
                    type="number"
                    value={controls.maxConversationLength}
                    onChange={(e) => updateControl('maxConversationLength', parseInt(e.target.value) || 50)}
                    min={10}
                    max={200}
                  />
                  <FormHelperText>Limit conversation length to prevent excessive use</FormHelperText>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Blocked Topics</FormLabel>
                <Wrap spacing={2} mb={2}>
                  {controls.blockedTopics.map((topic) => (
                    <WrapItem key={topic}>
                      <Tag size="md" colorScheme="red" variant="subtle">
                        <TagLabel>{topic.replace('_', ' ')}</TagLabel>
                        <TagCloseButton onClick={() => removeBlockedTopic(topic)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
                <HStack>
                  <Input
                    placeholder="Add topic to block..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBlockedTopic()}
                    size="sm"
                    maxW="300px"
                  />
                  <IconButton
                    icon={<FiPlus />}
                    aria-label="Add topic"
                    size="sm"
                    onClick={addBlockedTopic}
                  />
                </HStack>
              </FormControl>
            </VStack>
          </GlassPanel>

          {/* Time Limits */}
          <GlassPanel variant="light" p={6}>
            <VStack align="stretch" spacing={5}>
              <HStack>
                <Icon as={FiClock} color="purple.500" boxSize={5} />
                <Heading size="md">Time Limits</Heading>
              </HStack>
              <Divider />

              <FormControl>
                <FormLabel>Daily Usage Limit: {controls.dailyUsageLimitMinutes} minutes</FormLabel>
                <Slider
                  value={controls.dailyUsageLimitMinutes}
                  onChange={(val) => updateControl('dailyUsageLimitMinutes', val)}
                  min={15}
                  max={480}
                  step={15}
                >
                  <SliderMark value={60} mt={2} ml={-2} fontSize="xs">1h</SliderMark>
                  <SliderMark value={120} mt={2} ml={-2} fontSize="xs">2h</SliderMark>
                  <SliderMark value={240} mt={2} ml={-2} fontSize="xs">4h</SliderMark>
                  <SliderMark value={360} mt={2} ml={-2} fontSize="xs">6h</SliderMark>
                  <SliderTrack>
                    <SliderFilledTrack bg="purple.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>
                  Daily Image Generation Limit: {controls.dailyImageGenerationLimit || 10} images
                  <Text as="span" fontSize="xs" color="gray.500" ml={2}>
                    (Subscription max: {subscriptionLimit.daily}/day, {subscriptionLimit.monthly}/month)
                  </Text>
                </FormLabel>
                <Slider
                  value={controls.dailyImageGenerationLimit || 10}
                  onChange={(val) => updateControl('dailyImageGenerationLimit', val)}
                  min={0}
                  max={subscriptionLimit.daily}
                  step={1}
                >
                  <SliderMark value={0} mt={2} ml={-2} fontSize="xs">0</SliderMark>
                  <SliderMark value={Math.floor(subscriptionLimit.daily / 4)} mt={2} ml={-2} fontSize="xs">{Math.floor(subscriptionLimit.daily / 4)}</SliderMark>
                  <SliderMark value={Math.floor(subscriptionLimit.daily / 2)} mt={2} ml={-2} fontSize="xs">{Math.floor(subscriptionLimit.daily / 2)}</SliderMark>
                  <SliderMark value={subscriptionLimit.daily} mt={2} ml={-2} fontSize="xs">{subscriptionLimit.daily}</SliderMark>
                  <SliderTrack>
                    <SliderFilledTrack bg="purple.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
                <FormHelperText>
                  Set to 0 to disable image generation. Maximum determined by your subscription tier.
                </FormHelperText>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <FormControl>
                  <FormLabel>Allowed Hours Start</FormLabel>
                  <Input
                    type="time"
                    value={controls.allowedHoursStart}
                    onChange={(e) => updateControl('allowedHoursStart', e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Allowed Hours End</FormLabel>
                  <Input
                    type="time"
                    value={controls.allowedHoursEnd}
                    onChange={(e) => updateControl('allowedHoursEnd', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Allowed Days</FormLabel>
                <CheckboxGroup
                  value={controls.allowedDays}
                  onChange={(val) => updateControl('allowedDays', val)}
                >
                  <HStack spacing={4} wrap="wrap">
                    {DAYS_OF_WEEK.map((day) => (
                      <Checkbox key={day.id} value={day.id}>
                        {day.label}
                      </Checkbox>
                    ))}
                  </HStack>
                </CheckboxGroup>
              </FormControl>
            </VStack>
          </GlassPanel>

          {/* Service Access */}
          <GlassPanel variant="light" p={6}>
            <VStack align="stretch" spacing={5}>
              <HStack>
                <Icon as={FiLock} color="green.500" boxSize={5} />
                <Heading size="md">Service Access</Heading>
              </HStack>
              <Divider />

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {AVAILABLE_SERVICES.map((service) => {
                  const isAllowed = controls.allowedServices.includes(service.id);
                  const isBlocked = controls.blockedServices.includes(service.id);
                  
                  return (
                    <Box
                      key={service.id}
                      p={4}
                      borderRadius="md"
                      border="1px"
                      borderColor={isAllowed ? 'green.200' : isBlocked ? 'red.200' : 'gray.200'}
                      bg={isAllowed ? 'green.50' : isBlocked ? 'red.50' : 'gray.50'}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="medium">{service.name}</Text>
                        <Switch
                          isChecked={isAllowed}
                          onChange={(e) => toggleService(service.id, e.target.checked)}
                          colorScheme="green"
                        />
                      </HStack>
                      <Text fontSize="sm" color={textSecondary}>{service.description}</Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </VStack>
          </GlassPanel>

          {/* Approval Requirements */}
          <GlassPanel variant="light" p={6}>
            <VStack align="stretch" spacing={5}>
              <HStack>
                <Icon as={FiUnlock} color="orange.500" boxSize={5} />
                <Heading size="md">Approval Requirements</Heading>
              </HStack>
              <Divider />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Require Approval for Image Generation</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Child must request permission to generate images</Text>
                  </Box>
                  <Switch
                    isChecked={controls.requireApprovalForImageGeneration}
                    onChange={(e) => updateControl('requireApprovalForImageGeneration', e.target.checked)}
                    colorScheme="orange"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Require Approval for External Links</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Block access to external URLs without approval</Text>
                  </Box>
                  <Switch
                    isChecked={controls.requireApprovalForExternalLinks}
                    onChange={(e) => updateControl('requireApprovalForExternalLinks', e.target.checked)}
                    colorScheme="orange"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Require Approval for Data Export</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Prevent downloading or exporting data</Text>
                  </Box>
                  <Switch
                    isChecked={controls.requireApprovalForDataExport}
                    onChange={(e) => updateControl('requireApprovalForDataExport', e.target.checked)}
                    colorScheme="orange"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Require Approval for New Conversations</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Child must request permission to start new chats</Text>
                  </Box>
                  <Switch
                    isChecked={controls.requireApprovalForNewConversations}
                    onChange={(e) => updateControl('requireApprovalForNewConversations', e.target.checked)}
                    colorScheme="orange"
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </GlassPanel>

          {/* Monitoring Settings */}
          <GlassPanel variant="light" p={6}>
            <VStack align="stretch" spacing={5}>
              <HStack>
                <Icon as={FiShield} color="teal.500" boxSize={5} />
                <Heading size="md">Monitoring & Alerts</Heading>
              </HStack>
              <Divider />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Log All Conversations</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Save all chat messages for review</Text>
                  </Box>
                  <Switch
                    isChecked={controls.logAllConversations}
                    onChange={(e) => updateControl('logAllConversations', e.target.checked)}
                    colorScheme="teal"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Parent Can View Conversations</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Allow viewing full conversation content</Text>
                  </Box>
                  <Switch
                    isChecked={controls.parentCanViewConversations}
                    onChange={(e) => updateControl('parentCanViewConversations', e.target.checked)}
                    colorScheme="teal"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Alert on Blocked Content</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Get notified when content is blocked</Text>
                  </Box>
                  <Switch
                    isChecked={controls.alertOnBlockedContent}
                    onChange={(e) => updateControl('alertOnBlockedContent', e.target.checked)}
                    colorScheme="teal"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <FormLabel mb={0}>Send Daily Activity Report</FormLabel>
                    <Text fontSize="sm" color={textSecondary}>Receive daily summary via email</Text>
                  </Box>
                  <Switch
                    isChecked={controls.sendDailyActivityReport}
                    onChange={(e) => updateControl('sendDailyActivityReport', e.target.checked)}
                    colorScheme="teal"
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </GlassPanel>

          {/* Theme Customization Section */}
          <GlassPanel p={6}>
            <VStack align="stretch" spacing={4}>
              <HStack>
                <Icon as={FiImage} color="purple.500" boxSize={5} />
                <Heading size="md">Dashboard Theme Images</Heading>
              </HStack>
              <Divider />
              
              <Text fontSize="sm" color={textSecondary}>
                Upload background images for child dashboard themes. Images will tile as the background pattern.
              </Text>

              {/* Theme selector and upload */}
              <HStack spacing={4}>
                <FormControl maxW="200px">
                  <FormLabel>Theme</FormLabel>
                  <Select 
                    value={selectedTheme} 
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  >
                    <option value="pusheen">Pusheen (Sofia)</option>
                    <option value="minecraft">Minecraft (Luca)</option>
                    <option value="default">Default</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Upload Image</FormLabel>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    leftIcon={<FiUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={uploading}
                    colorScheme="purple"
                  >
                    Upload Background
                  </Button>
                </FormControl>
              </HStack>

              {/* Display uploaded images */}
              <Box>
                <Text fontWeight="medium" mb={2}>
                  {selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Theme Images:
                </Text>
                {themeImages[selectedTheme]?.length > 0 ? (
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                    {themeImages[selectedTheme].map((imagePath) => (
                      <Box
                        key={imagePath}
                        position="relative"
                        borderRadius="md"
                        overflow="hidden"
                        border="2px solid"
                        borderColor="gray.200"
                      >
                        <Box
                          as="img"
                          src={imagePath}
                          alt="Theme background"
                          w="100%"
                          h="100px"
                          objectFit="cover"
                        />
                        <IconButton
                          aria-label="Delete image"
                          icon={<FiTrash2 />}
                          size="xs"
                          colorScheme="red"
                          position="absolute"
                          top={1}
                          right={1}
                          onClick={() => handleDeleteImage(imagePath)}
                        />
                        <Text fontSize="xs" p={1} bg="blackAlpha.600" color="white" isTruncated>
                          {imagePath.split('/').pop()}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text fontSize="sm" color={textSecondary} fontStyle="italic">
                    No images uploaded for this theme yet.
                  </Text>
                )}
              </Box>
            </VStack>
          </GlassPanel>

          {/* Save Button */}
          <HStack justify="flex-end">
            <Button
              as={NextLink}
              href={`/admin/family/${childId}`}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              size="lg"
              onClick={handleSave}
              isLoading={saving}
            >
              Save All Changes
            </Button>
          </HStack>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export default ParentalControlsPage;

export { familyAdminRouteGuard as getServerSideProps } from '@/lib/auth/admin-route-guard';
