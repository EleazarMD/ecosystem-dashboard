/**
 * Monitoring Right Panel
 * Settings and alerts panel for RTX Workstation monitoring dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
  Divider,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Alert,
  AlertIcon,
  Button,
  useColorMode,
} from '@chakra-ui/react';
import {
  AlertTriangle,
  Thermometer,
  Zap,
  HardDrive,
  Fan,
  Bell,
  Eye,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { GlassPanel } from '@/components/ui';

interface MonitoringSettings {
  refreshInterval: number;
  showCPU: boolean;
  showProcesses: boolean;
  showPowerBar: boolean;
  compactMode: boolean;
  tempWarningThreshold: number;
  tempCriticalThreshold: number;
  vramWarningThreshold: number;
  powerWarningThreshold: number;
  enableAlerts: boolean;
  enableSoundAlerts: boolean;
}

interface ThermalAlert {
  id: string;
  type: 'warning' | 'critical';
  component: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

const DEFAULT_SETTINGS: MonitoringSettings = {
  refreshInterval: 5,
  showCPU: true,
  showProcesses: true,
  showPowerBar: true,
  compactMode: false,
  tempWarningThreshold: 75,
  tempCriticalThreshold: 85,
  vramWarningThreshold: 90,
  powerWarningThreshold: 95,
  enableAlerts: true,
  enableSoundAlerts: false,
};

export const MonitoringRightPanel: React.FC = () => {
  const { activeTab } = useRightPanel();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const [settings, setSettings] = useState<MonitoringSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monitoring-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    }
    return DEFAULT_SETTINGS;
  });

  const [alerts, setAlerts] = useState<ThermalAlert[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitoring-settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('monitoring-settings-changed', { detail: settings }));
    }
  }, [settings]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/monitoring/gpu-stats');
        const data = await response.json();
        if (data.success) {
          const newAlerts: ThermalAlert[] = [];
          
          data.gpus?.forEach((gpu: any) => {
            if (gpu.temperature >= settings.tempCriticalThreshold) {
              newAlerts.push({
                id: `gpu-${gpu.id}-temp-critical`,
                type: 'critical',
                component: `GPU ${gpu.id}`,
                message: `Temperature critical`,
                value: gpu.temperature,
                threshold: settings.tempCriticalThreshold,
                timestamp: new Date(),
              });
            } else if (gpu.temperature >= settings.tempWarningThreshold) {
              newAlerts.push({
                id: `gpu-${gpu.id}-temp-warning`,
                type: 'warning',
                component: `GPU ${gpu.id}`,
                message: `Temperature elevated`,
                value: gpu.temperature,
                threshold: settings.tempWarningThreshold,
                timestamp: new Date(),
              });
            }
            
            const vramPercent = (gpu.memoryUsedMB / gpu.memoryTotalMB) * 100;
            if (vramPercent >= settings.vramWarningThreshold) {
              newAlerts.push({
                id: `gpu-${gpu.id}-vram`,
                type: 'warning',
                component: `GPU ${gpu.id}`,
                message: `VRAM usage high`,
                value: Math.round(vramPercent),
                threshold: settings.vramWarningThreshold,
                timestamp: new Date(),
              });
            }
          });
          
          if (data.cpu?.temperature >= 80) {
            newAlerts.push({
              id: 'cpu-temp',
              type: data.cpu.temperature >= 90 ? 'critical' : 'warning',
              component: 'CPU',
              message: `Temperature ${data.cpu.temperature >= 90 ? 'critical' : 'elevated'}`,
              value: data.cpu.temperature,
              threshold: 80,
              timestamp: new Date(),
            });
          }
          
          setAlerts(newAlerts);
        }
      } catch (e) {
        console.error('Failed to fetch alerts:', e);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, settings.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.refreshInterval, settings.tempWarningThreshold, settings.tempCriticalThreshold, settings.vramWarningThreshold]);

  const updateSetting = <K extends keyof MonitoringSettings>(key: K, value: MonitoringSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderAlertsTab = () => (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <HStack>
          <Bell size={18} />
          <Text fontWeight="semibold">Active Alerts</Text>
        </HStack>
        <Badge colorScheme={alerts.length > 0 ? 'red' : 'green'}>
          {alerts.length}
        </Badge>
      </HStack>

      {alerts.length === 0 ? (
        <Alert status="success" borderRadius="md" size="sm">
          <AlertIcon />
          <Text fontSize="sm">All systems operating normally</Text>
        </Alert>
      ) : (
        <VStack align="stretch" spacing={2}>
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              status={alert.type === 'critical' ? 'error' : 'warning'}
              borderRadius="md"
              size="sm"
            >
              <AlertIcon />
              <Box flex="1">
                <Text fontWeight="semibold" fontSize="sm">{alert.component}</Text>
                <Text fontSize="xs">{alert.message}: {alert.value}°C (threshold: {alert.threshold}°C)</Text>
              </Box>
            </Alert>
          ))}
        </VStack>
      )}

      <Divider />

      <Text fontWeight="semibold" fontSize="sm">Alert Settings</Text>

      <HStack justify="space-between">
        <Text fontSize="sm">Enable Alerts</Text>
        <Switch
          isChecked={settings.enableAlerts}
          onChange={(e) => updateSetting('enableAlerts', e.target.checked)}
          colorScheme="blue"
          size="sm"
        />
      </HStack>

      <HStack justify="space-between">
        <Text fontSize="sm">Sound Alerts</Text>
        <Switch
          isChecked={settings.enableSoundAlerts}
          onChange={(e) => updateSetting('enableSoundAlerts', e.target.checked)}
          colorScheme="blue"
          size="sm"
          isDisabled={!settings.enableAlerts}
        />
      </HStack>
    </VStack>
  );

  const renderGPUSettingsTab = () => (
    <VStack align="stretch" spacing={4}>
      <HStack>
        <Cpu size={18} />
        <Text fontWeight="semibold">Threshold Settings</Text>
      </HStack>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Thermometer size={14} />
            <Text fontSize="sm">Temp Warning</Text>
          </HStack>
          <Badge colorScheme="yellow">{settings.tempWarningThreshold}°C</Badge>
        </HStack>
        <Slider
          value={settings.tempWarningThreshold}
          min={50}
          max={90}
          step={5}
          onChange={(v) => updateSetting('tempWarningThreshold', v)}
          colorScheme="yellow"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Thermometer size={14} />
            <Text fontSize="sm">Temp Critical</Text>
          </HStack>
          <Badge colorScheme="red">{settings.tempCriticalThreshold}°C</Badge>
        </HStack>
        <Slider
          value={settings.tempCriticalThreshold}
          min={70}
          max={100}
          step={5}
          onChange={(v) => updateSetting('tempCriticalThreshold', v)}
          colorScheme="red"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <HardDrive size={14} />
            <Text fontSize="sm">VRAM Warning</Text>
          </HStack>
          <Badge colorScheme="orange">{settings.vramWarningThreshold}%</Badge>
        </HStack>
        <Slider
          value={settings.vramWarningThreshold}
          min={70}
          max={99}
          step={5}
          onChange={(v) => updateSetting('vramWarningThreshold', v)}
          colorScheme="orange"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Zap size={14} />
            <Text fontSize="sm">Power Warning</Text>
          </HStack>
          <Badge colorScheme="purple">{settings.powerWarningThreshold}%</Badge>
        </HStack>
        <Slider
          value={settings.powerWarningThreshold}
          min={80}
          max={100}
          step={5}
          onChange={(v) => updateSetting('powerWarningThreshold', v)}
          colorScheme="purple"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <Divider />

      <Button
        size="sm"
        variant="outline"
        onClick={() => setSettings(DEFAULT_SETTINGS)}
      >
        Reset to Defaults
      </Button>
    </VStack>
  );

  const renderDisplaySettingsTab = () => (
    <VStack align="stretch" spacing={4}>
      <HStack>
        <Eye size={18} />
        <Text fontWeight="semibold">Display Options</Text>
      </HStack>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <RefreshCw size={14} />
            <Text fontSize="sm">Refresh Interval</Text>
          </HStack>
          <Badge colorScheme="blue">{settings.refreshInterval}s</Badge>
        </HStack>
        <Select
          size="sm"
          value={settings.refreshInterval}
          onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
        >
          <option value={1}>1 second</option>
          <option value={2}>2 seconds</option>
          <option value={5}>5 seconds</option>
          <option value={10}>10 seconds</option>
          <option value={30}>30 seconds</option>
        </Select>
      </Box>

      <Divider />

      <Text fontWeight="semibold" fontSize="sm">Visibility</Text>

      <HStack justify="space-between">
        <HStack>
          <Cpu size={14} />
          <Text fontSize="sm">Show CPU Stats</Text>
        </HStack>
        <Switch
          isChecked={settings.showCPU}
          onChange={(e) => updateSetting('showCPU', e.target.checked)}
          colorScheme="blue"
          size="sm"
        />
      </HStack>

      <HStack justify="space-between">
        <Text fontSize="sm">Show Processes</Text>
        <Switch
          isChecked={settings.showProcesses}
          onChange={(e) => updateSetting('showProcesses', e.target.checked)}
          colorScheme="blue"
          size="sm"
        />
      </HStack>

      <HStack justify="space-between">
        <HStack>
          <Zap size={14} />
          <Text fontSize="sm">Show Power Bar</Text>
        </HStack>
        <Switch
          isChecked={settings.showPowerBar}
          onChange={(e) => updateSetting('showPowerBar', e.target.checked)}
          colorScheme="blue"
          size="sm"
        />
      </HStack>

      <HStack justify="space-between">
        <Text fontSize="sm">Compact Mode</Text>
        <Switch
          isChecked={settings.compactMode}
          onChange={(e) => updateSetting('compactMode', e.target.checked)}
          colorScheme="blue"
          size="sm"
        />
      </HStack>
    </VStack>
  );

  return (
    <Box p={4}>
      {activeTab === 'alerts' && renderAlertsTab()}
      {activeTab === 'gpu-settings' && renderGPUSettingsTab()}
      {activeTab === 'display-settings' && renderDisplaySettingsTab()}
    </Box>
  );
};

export default MonitoringRightPanel;
