/**
 * Insights Settings Panel
 * Right panel for Email Insights configuration
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
  Divider,
  Badge,
  Button,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import {
  Cog6ToothIcon,
  ClockIcon,
  BellIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use Next.js proxy for Hermes Core API
const HERMES_API = '/api/hermes-proxy';

interface InsightsSettings {
  autoGenerateBriefing: boolean;
  briefingTime: string;
  defaultPeriod: number;
  includeWeekends: boolean;
  notifyOnUrgent: boolean;
  minEmailsForBriefing: number;
  includeAudioByDefault: boolean;
}

const DEFAULT_SETTINGS: InsightsSettings = {
  autoGenerateBriefing: false,
  briefingTime: '07:00',
  defaultPeriod: 24,
  includeWeekends: true,
  notifyOnUrgent: true,
  minEmailsForBriefing: 5,
  includeAudioByDefault: true,
};

export default function InsightsSettingsPanel() {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');

  const [settings, setSettings] = useState<InsightsSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings from backend API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${HERMES_API}?path=v1/intelligence/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        }
      } catch (e) {
        console.error('Failed to load insights settings:', e);
        // Fall back to localStorage
        const saved = localStorage.getItem('email-insights-settings');
        if (saved) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
          } catch (parseError) {
            console.error('Failed to parse localStorage settings:', parseError);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Save settings to backend API
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${HERMES_API}?path=v1/intelligence/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        // Also save to localStorage as backup
        localStorage.setItem('email-insights-settings', JSON.stringify(settings));
        toast({
          title: 'Settings Saved',
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (e) {
      toast({
        title: 'Save Failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        status: 'error',
        duration: 2000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof InsightsSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Box p={3} h="full" overflowY="auto">
      <VStack align="stretch" spacing={3}>
        {/* Header - Compact */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Cog6ToothIcon style={{ width: '16px', height: '16px', color: 'var(--chakra-colors-blue-500)' }} />
            <Text fontWeight="600" color={textColor} fontSize="sm">Insights Settings</Text>
          </HStack>
          <Badge colorScheme="blue" fontSize="2xs">Config</Badge>
        </HStack>

        <Divider borderColor={borderColor} />

        {/* Briefing Schedule */}
        <Box>
          <HStack spacing={2} mb={2}>
            <ClockIcon style={{ width: '14px', height: '14px', color: textSecondary }} />
            <Text fontSize="xs" fontWeight="500" color={textSecondary}>
              Briefing Schedule
            </Text>
          </HStack>

          <VStack align="stretch" spacing={3}>
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Auto-generate daily
              </FormLabel>
              <Switch
                isChecked={settings.autoGenerateBriefing}
                onChange={(e) => handleChange('autoGenerateBriefing', e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Generation time
              </FormLabel>
              <Select
                size="sm"
                value={settings.briefingTime}
                onChange={(e) => handleChange('briefingTime', e.target.value)}
              >
                <option value="06:00">6:00 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Default period
              </FormLabel>
              <Select
                size="sm"
                value={settings.defaultPeriod}
                onChange={(e) => handleChange('defaultPeriod', parseInt(e.target.value))}
              >
                <option value={24}>Last 24 hours</option>
                <option value={48}>Last 48 hours</option>
                <option value={168}>Last 7 days</option>
              </Select>
            </FormControl>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Content Settings */}
        <Box>
          <HStack spacing={2} mb={2}>
            <ChartBarIcon style={{ width: '14px', height: '14px', color: textSecondary }} />
            <Text fontSize="xs" fontWeight="500" color={textSecondary}>
              Content Settings
            </Text>
          </HStack>

          <VStack align="stretch" spacing={3}>
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Include weekends
              </FormLabel>
              <Switch
                isChecked={settings.includeWeekends}
                onChange={(e) => handleChange('includeWeekends', e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb={0} fontSize="sm" color={textSecondary}>
                Include audio by default
              </FormLabel>
              <Switch
                isChecked={settings.includeAudioByDefault}
                onChange={(e) => handleChange('includeAudioByDefault', e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Min emails for briefing
              </FormLabel>
              <NumberInput
                size="sm"
                min={1}
                max={50}
                value={settings.minEmailsForBriefing}
                onChange={(_, val) => handleChange('minEmailsForBriefing', val)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Notifications */}
        <Box>
          <HStack spacing={2} mb={2}>
            <BellIcon style={{ width: '14px', height: '14px', color: textSecondary }} />
            <Text fontSize="xs" fontWeight="500" color={textSecondary}>
              Notifications
            </Text>
          </HStack>

          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel mb={0} fontSize="sm" color={textSecondary}>
              Notify on urgent items
            </FormLabel>
            <Switch
              isChecked={settings.notifyOnUrgent}
              onChange={(e) => handleChange('notifyOnUrgent', e.target.checked)}
              colorScheme="blue"
            />
          </FormControl>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Save Button */}
        <Button
          colorScheme="blue"
          size="sm"
          onClick={handleSave}
          isLoading={saving}
          w="full"
        >
          Save Settings
        </Button>
      </VStack>
    </Box>
  );
}

export { InsightsSettingsPanel };
