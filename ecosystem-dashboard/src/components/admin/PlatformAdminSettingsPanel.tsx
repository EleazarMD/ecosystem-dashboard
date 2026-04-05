/**
 * Platform Admin Settings Panel
 * Configure platform-wide settings and preferences
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  Button,
  useToast,
  Input,
  Select,
} from '@chakra-ui/react';
import { FiSave, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PlatformSettings {
  allowNewTenants: boolean;
  requireEmailVerification: boolean;
  defaultTier: string;
  maintenanceMode: boolean;
  maxTenantsPerUser: number;
  apiRateLimit: number;
}

export default function PlatformAdminSettingsPanel() {
  const [settings, setSettings] = React.useState<PlatformSettings>({
    allowNewTenants: true,
    requireEmailVerification: true,
    defaultTier: 'free',
    maintenanceMode: false,
    maxTenantsPerUser: 5,
    apiRateLimit: 1000,
  });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/admin/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/platform/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Settings saved',
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={4} overflowY="auto" h="100%">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">Platform Settings</Text>
          <HStack>
            <Button
              size="sm"
              leftIcon={<FiRefreshCw />}
              variant="ghost"
              onClick={loadSettings}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<FiSave />}
              colorScheme="blue"
              onClick={saveSettings}
              isLoading={saving}
            >
              Save
            </Button>
          </HStack>
        </HStack>

        <Divider />

        <Text fontSize="md" fontWeight="semibold">Tenant Management</Text>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="allow-new-tenants" mb="0" flex={1}>
            Allow New Tenants
            <FormHelperText mt={1} color={textSecondary}>
              Enable tenant registration
            </FormHelperText>
          </FormLabel>
          <Switch
            id="allow-new-tenants"
            isChecked={settings.allowNewTenants}
            onChange={(e) => setSettings({ ...settings, allowNewTenants: e.target.checked })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Default Tier</FormLabel>
          <Select
            value={settings.defaultTier}
            onChange={(e) => setSettings({ ...settings, defaultTier: e.target.value })}
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          <FormHelperText color={textSecondary}>
            Default subscription tier for new tenants
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Max Tenants Per User</FormLabel>
          <Input
            type="number"
            value={settings.maxTenantsPerUser}
            onChange={(e) => setSettings({ ...settings, maxTenantsPerUser: parseInt(e.target.value) || 1 })}
            min={1}
            max={100}
          />
          <FormHelperText color={textSecondary}>
            Maximum number of tenants a user can create
          </FormHelperText>
        </FormControl>

        <Divider />

        <Text fontSize="md" fontWeight="semibold">Security & Access</Text>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="email-verification" mb="0" flex={1}>
            Require Email Verification
            <FormHelperText mt={1} color={textSecondary}>
              Users must verify email before access
            </FormHelperText>
          </FormLabel>
          <Switch
            id="email-verification"
            isChecked={settings.requireEmailVerification}
            onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>API Rate Limit (requests/hour)</FormLabel>
          <Input
            type="number"
            value={settings.apiRateLimit}
            onChange={(e) => setSettings({ ...settings, apiRateLimit: parseInt(e.target.value) || 100 })}
            min={100}
            max={10000}
          />
          <FormHelperText color={textSecondary}>
            Maximum API requests per hour per tenant
          </FormHelperText>
        </FormControl>

        <Divider />

        <Text fontSize="md" fontWeight="semibold">System</Text>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="maintenance-mode" mb="0" flex={1}>
            Maintenance Mode
            <FormHelperText mt={1} color={textSecondary}>
              Restrict platform access for maintenance
            </FormHelperText>
          </FormLabel>
          <Switch
            id="maintenance-mode"
            colorScheme="red"
            isChecked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
          />
        </FormControl>
      </VStack>
    </Box>
  );
}
