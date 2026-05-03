/**
 * ApprovalSettings Component
 * 
 * Mobile-optimized settings panel for configuring approval preferences.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Select,
  Button,
  Divider,
  Icon,
  Badge,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  FormControl,
  FormLabel,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import {
  FiShield,
  FiBell,
  FiClock,
  FiZap,
  FiCalendar,
  FiMail,
  FiUser,
  FiSettings,
  FiSave,
} from 'react-icons/fi';
import { useApproval } from '@/contexts/ApprovalContext';
import type { ApprovalSettings as ApprovalSettingsType, ApprovalActionType } from '@/types/approval';
import { ACTION_TYPE_LABELS } from '@/types/approval';

interface ApprovalSettingsProps {
  onClose?: () => void;
}

export function ApprovalSettings({ onClose }: ApprovalSettingsProps) {
  const { settings, updateSettings } = useApproval();
  const toast = useToast();
  const [localSettings, setLocalSettings] = useState<Partial<ApprovalSettingsType>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize local settings from context
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);
  
  const handleChange = <K extends keyof ApprovalSettingsType>(
    key: K,
    value: ApprovalSettingsType[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };
  
  const handleActionSettingChange = (
    actionType: ApprovalActionType,
    key: string,
    value: any
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      action_settings: {
        ...prev.action_settings,
        [actionType]: {
          ...(prev.action_settings?.[actionType] || {}),
          [key]: value,
        },
      },
    }));
    setIsDirty(true);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateSettings(localSettings);
      if (success) {
        toast({
          title: 'Settings saved',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        setIsDirty(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const actionGroups = {
    calendar: ['calendar_event_create', 'calendar_event_update', 'calendar_event_delete', 'calendar_invite_send'],
    email: ['email_draft_create', 'email_send', 'email_reply', 'email_forward'],
    contacts: ['contact_create', 'contact_update'],
    tasks: ['reminder_create', 'task_create'],
    system: ['document_share', 'file_delete', 'workspace_page_delete', 'automation_trigger', 'external_api_call', 'system_setting_change'],
  };
  
  return (
    <Box h="100%" display="flex" flexDirection="column" bg="bgPrimary">
      {/* Header */}
      <Box
        px={4}
        py={3}
        bg="bgSecondary"
        borderBottomWidth="1px"
        borderColor="borderDefault"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={FiSettings} boxSize={5} color="brand.500" />
            <Text fontWeight="bold" fontSize="lg" color="textPrimary">
              Approval Settings
            </Text>
          </HStack>
          <Button
            colorScheme="brand"
            size="sm"
            leftIcon={<FiSave />}
            onClick={handleSave}
            isLoading={isSaving}
            isDisabled={!isDirty}
          >
            Save
          </Button>
        </HStack>
      </Box>
      
      {/* Content */}
      <Box flex={1} overflowY="auto" px={4} py={4}>
        <VStack spacing={6} align="stretch">
          {/* Global Settings */}
          <Box
            bg="bgSecondary"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="borderDefault"
          >
            <HStack mb={4}>
              <Icon as={FiShield} color="brand.500" />
              <Text fontWeight="semibold" color="textPrimary">
                Global Settings
              </Text>
            </HStack>
            
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  Enable approval system
                </FormLabel>
                <Switch
                  isChecked={localSettings.enabled ?? true}
                  onChange={e => handleChange('enabled', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              
              <Divider />
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <VStack align="start" spacing={0}>
                  <FormLabel mb={0} fontSize="sm">
                    Auto-approve low risk
                  </FormLabel>
                  <Text fontSize="xs" color="textMuted">
                    Skip approval for low-risk actions
                  </Text>
                </VStack>
                <Switch
                  isChecked={localSettings.auto_approve_low_risk ?? false}
                  onChange={e => handleChange('auto_approve_low_risk', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              
              <Divider />
              
              <FormControl>
                <FormLabel fontSize="sm">Auto-approve threshold</FormLabel>
                <Select
                  size="sm"
                  value={localSettings.auto_approve_risk_threshold ?? 'none'}
                  onChange={e => handleChange('auto_approve_risk_threshold', e.target.value as any)}
                >
                  <option value="none">Never auto-approve</option>
                  <option value="low">Low risk only</option>
                  <option value="medium">Medium risk and below</option>
                </Select>
              </FormControl>
              
              <Divider />
              
              <FormControl>
                <FormLabel fontSize="sm">
                  Approval expiry (hours): {localSettings.expiry_hours ?? 24}
                </FormLabel>
                <Slider
                  value={localSettings.expiry_hours ?? 24}
                  min={1}
                  max={72}
                  step={1}
                  onChange={v => handleChange('expiry_hours', v)}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="brand.500" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            </VStack>
          </Box>
          
          {/* Notification Settings */}
          <Box
            bg="bgSecondary"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="borderDefault"
          >
            <HStack mb={4}>
              <Icon as={FiBell} color="brand.500" />
              <Text fontWeight="semibold" color="textPrimary">
                Notifications
              </Text>
            </HStack>
            
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  Push notifications
                </FormLabel>
                <Switch
                  isChecked={localSettings.push_notifications ?? true}
                  onChange={e => handleChange('push_notifications', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  Email notifications
                </FormLabel>
                <Switch
                  isChecked={localSettings.email_notifications ?? false}
                  onChange={e => handleChange('email_notifications', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  SMS notifications
                </FormLabel>
                <Switch
                  isChecked={localSettings.sms_notifications ?? false}
                  onChange={e => handleChange('sms_notifications', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              
              <Divider />
              
              <FormControl>
                <FormLabel fontSize="sm">Quiet hours</FormLabel>
                <HStack>
                  <Input
                    type="time"
                    size="sm"
                    value={localSettings.quiet_hours_start ?? '22:00'}
                    onChange={e => handleChange('quiet_hours_start', e.target.value)}
                    placeholder="Start"
                  />
                  <Text>to</Text>
                  <Input
                    type="time"
                    size="sm"
                    value={localSettings.quiet_hours_end ?? '08:00'}
                    onChange={e => handleChange('quiet_hours_end', e.target.value)}
                    placeholder="End"
                  />
                </HStack>
              </FormControl>
            </VStack>
          </Box>
          
          {/* Per-Action Settings */}
          <Box
            bg="bgSecondary"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="borderDefault"
            overflow="hidden"
          >
            <HStack p={4} pb={2}>
              <Icon as={FiZap} color="brand.500" />
              <Text fontWeight="semibold" color="textPrimary">
                Action Settings
              </Text>
            </HStack>
            
            <Accordion allowMultiple>
              {/* Calendar Actions */}
              <AccordionItem border="none">
                <AccordionButton py={3}>
                  <HStack flex={1}>
                    <Icon as={FiCalendar} color="blue.500" />
                    <Text fontSize="sm" fontWeight="medium">Calendar Actions</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {actionGroups.calendar.map(action => (
                      <ActionSettingRow
                        key={action}
                        actionType={action as ApprovalActionType}
                        settings={localSettings.action_settings?.[action as ApprovalActionType]}
                        onChange={(key, value) => handleActionSettingChange(action as ApprovalActionType, key, value)}
                      />
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
              
              {/* Email Actions */}
              <AccordionItem border="none">
                <AccordionButton py={3}>
                  <HStack flex={1}>
                    <Icon as={FiMail} color="green.500" />
                    <Text fontSize="sm" fontWeight="medium">Email Actions</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {actionGroups.email.map(action => (
                      <ActionSettingRow
                        key={action}
                        actionType={action as ApprovalActionType}
                        settings={localSettings.action_settings?.[action as ApprovalActionType]}
                        onChange={(key, value) => handleActionSettingChange(action as ApprovalActionType, key, value)}
                      />
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
              
              {/* Contacts */}
              <AccordionItem border="none">
                <AccordionButton py={3}>
                  <HStack flex={1}>
                    <Icon as={FiUser} color="purple.500" />
                    <Text fontSize="sm" fontWeight="medium">Contacts & Tasks</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {[...actionGroups.contacts, ...actionGroups.tasks].map(action => (
                      <ActionSettingRow
                        key={action}
                        actionType={action as ApprovalActionType}
                        settings={localSettings.action_settings?.[action as ApprovalActionType]}
                        onChange={(key, value) => handleActionSettingChange(action as ApprovalActionType, key, value)}
                      />
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
              
              {/* System Actions */}
              <AccordionItem border="none">
                <AccordionButton py={3}>
                  <HStack flex={1}>
                    <Icon as={FiSettings} color="orange.500" />
                    <Text fontSize="sm" fontWeight="medium">System Actions</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {actionGroups.system.map(action => (
                      <ActionSettingRow
                        key={action}
                        actionType={action as ApprovalActionType}
                        settings={localSettings.action_settings?.[action as ApprovalActionType]}
                        onChange={(key, value) => handleActionSettingChange(action as ApprovalActionType, key, value)}
                      />
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}

// Individual action setting row
interface ActionSettingRowProps {
  actionType: ApprovalActionType;
  settings?: {
    enabled?: boolean;
    auto_approve?: boolean;
    notify_channels?: string[];
  };
  onChange: (key: string, value: any) => void;
}

function ActionSettingRow({ actionType, settings, onChange }: ActionSettingRowProps) {
  return (
    <Box
      p={3}
      bg="bgTertiary"
      borderRadius="md"
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="medium" color="textPrimary">
          {ACTION_TYPE_LABELS[actionType]}
        </Text>
        <Switch
          size="sm"
          isChecked={settings?.enabled ?? true}
          onChange={e => onChange('enabled', e.target.checked)}
          colorScheme="brand"
        />
      </HStack>
      
      {(settings?.enabled ?? true) && (
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="textSecondary">
            Auto-approve
          </Text>
          <Switch
            size="sm"
            isChecked={settings?.auto_approve ?? false}
            onChange={e => onChange('auto_approve', e.target.checked)}
            colorScheme="green"
          />
        </HStack>
      )}
    </Box>
  );
}

export default ApprovalSettings;
