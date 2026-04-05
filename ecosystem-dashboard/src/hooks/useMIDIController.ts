/**
 * React Hook for MIDI Controller Integration
 * Use in Podcast Mixer components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PodcastMixerMIDI, type MIDIMapping } from '../lib/midi-controller';

interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
}

interface UseMIDIControllerReturn {
  // Connection state
  isConnected: boolean;
  isReady: boolean;
  currentDevice: { id: string; name: string } | null;
  availableDevices: MIDIDevice[];
  
  // Actions
  initialize: () => Promise<boolean>;
  connectToDevice: (deviceId: string) => Promise<boolean>;
  disconnect: () => void;
  
  // MIDI Learn
  isLearning: boolean;
  startLearning: (callback: (cc: number) => void) => void;
  stopLearning: () => void;
  
  // Mappings
  getMappings: () => Map<number, MIDIMapping>;
  setMapping: (cc: number, mapping: MIDIMapping) => void;
}

export function useMIDIController(
  onFaderChange?: (channel: number, value: number) => void,
  onKnobChange?: (knob: number, value: number) => void,
  onButtonPress?: (button: number) => void,
  onButtonRelease?: (button: number) => void
): UseMIDIControllerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<{ id: string; name: string } | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MIDIDevice[]>([]);
  
  const controllerRef = useRef<PodcastMixerMIDI | null>(null);

  // Initialize MIDI controller
  const initialize = useCallback(async () => {
    // Prevent MIDI errors from breaking the entire application
    try {
      // Check if already initialized
      if (controllerRef.current) {
        console.log('⚠️ MIDI controller already initialized, skipping');
        return controllerRef.current.isReady();
      }

      const controller = new PodcastMixerMIDI({
        onFaderChange,
        onKnobChange,
        onButtonPress,
        onButtonRelease
      });

      const success = await controller.initialize();
      
      if (success) {
        controllerRef.current = controller;
        setIsConnected(true);
        setIsReady(controller.isReady());
        setCurrentDevice(controller.getCurrentDevice());
        setAvailableDevices(controller.getDevices());
        console.log('✅ MIDI controller initialized');
        return true;
      }
      
      // No devices found, but MIDI system is ready
      controllerRef.current = controller;
      setAvailableDevices(controller.getDevices());
      console.log('⚠️ MIDI system ready but no devices connected');
      return false;
    } catch (error) {
      console.error('❌ MIDI initialization error (non-critical):', error);
      // Ensure state is safe even on error
      setIsConnected(false);
      setIsReady(false);
      setCurrentDevice(null);
      setAvailableDevices([]);
      return false;
    }
  }, []);

  // Connect to specific device
  const connectToDevice = useCallback(async (deviceId: string) => {
    if (!controllerRef.current) {
      await initialize();
    }
    
    if (controllerRef.current) {
      const success = await controllerRef.current.connectToDevice(deviceId);
      
      if (success) {
        setIsConnected(true);
        setIsReady(true);
        const device = controllerRef.current.getCurrentDevice();
        setCurrentDevice(device);
        
        // Auto-load Hercules profile if detected
        if (device && device.name.toLowerCase().includes('hercules')) {
          console.log('🎛️ Hercules controller detected, loading profile...');
          const HerculesProfile = await import('../lib/midi-profiles/hercules-mix-ultra');
          controllerRef.current.loadProfile(HerculesProfile.HerculesMixUltraProfile.mappings);
        }
        
        return true;
      }
    }
    
    return false;
  }, [initialize]);

  // Disconnect from device
  const disconnect = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.disconnect();
      setIsConnected(false);
      setIsReady(false);
      setCurrentDevice(null);
    }
  }, []);

  // Start MIDI learn mode
  const startLearning = useCallback((callback: (cc: number) => void) => {
    if (controllerRef.current) {
      controllerRef.current.enterLearnMode(callback);
      setIsLearning(true);
    }
  }, []);

  // Stop MIDI learn mode
  const stopLearning = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.exitLearnMode();
      setIsLearning(false);
    }
  }, []);

  // Get current mappings
  const getMappings = useCallback(() => {
    if (controllerRef.current) {
      return controllerRef.current.getMappings();
    }
    return new Map();
  }, []);

  // Set custom mapping
  const setMapping = useCallback((cc: number, mapping: MIDIMapping) => {
    if (controllerRef.current) {
      controllerRef.current.setMapping(cc, mapping);
    }
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    isReady,
    currentDevice,
    availableDevices,
    initialize,
    connectToDevice,
    disconnect,
    isLearning,
    startLearning,
    stopLearning,
    getMappings,
    setMapping
  };
}
