/**
 * useGooseFeatures Hook
 * Provides feature configuration and availability for Goose UI components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GooseFeatureId,
  GooseFeatureConfig,
  GoosePresetId,
  GOOSE_FEATURES,
  GOOSE_PRESETS,
  createFeatureConfig,
  hasFeature,
  checkFeatureAvailability,
  getPresetFeatures,
} from '@/lib/goose/features';

export interface UseGooseFeaturesOptions {
  preset: GoosePresetId;
  enable?: GooseFeatureId[];
  disable?: GooseFeatureId[];
  backendUrl?: string;
  model?: string;
  checkAvailability?: boolean;
}

export interface UseGooseFeaturesResult {
  config: GooseFeatureConfig;
  has: (featureId: GooseFeatureId) => boolean;
  availability: Record<GooseFeatureId, boolean>;
  loading: boolean;
  
  // Feature category checks
  hasVoice: boolean;
  hasStreaming: boolean;
  hasTools: boolean;
  hasIntegrations: boolean;
  
  // Dynamic feature toggling
  enable: (featureId: GooseFeatureId) => void;
  disable: (featureId: GooseFeatureId) => void;
  
  // Preset switching
  switchPreset: (presetId: GoosePresetId) => void;
}

export function useGooseFeatures(options: UseGooseFeaturesOptions): UseGooseFeaturesResult {
  const [config, setConfig] = useState<GooseFeatureConfig>(() =>
    createFeatureConfig(options.preset, {
      enable: options.enable,
      disable: options.disable,
      backendUrl: options.backendUrl,
      model: options.model,
    })
  );
  
  const [availability, setAvailability] = useState<Record<GooseFeatureId, boolean>>({} as any);
  const [loading, setLoading] = useState(options.checkAvailability ?? false);
  
  // Check feature availability on mount
  useEffect(() => {
    if (!options.checkAvailability) return;
    
    const checkAll = async () => {
      setLoading(true);
      const features = getPresetFeatures(config.preset);
      const results: Record<string, boolean> = {};
      
      await Promise.all(
        features.map(async (feature) => {
          results[feature.id] = await checkFeatureAvailability(feature);
        })
      );
      
      setAvailability(results as Record<GooseFeatureId, boolean>);
      setLoading(false);
    };
    
    checkAll();
  }, [config.preset, options.checkAvailability]);
  
  // Feature check helper
  const has = useCallback(
    (featureId: GooseFeatureId) => hasFeature(config, featureId),
    [config]
  );
  
  // Category checks
  const hasVoice = useMemo(
    () => has('voice-input') || has('voice-output'),
    [has]
  );
  
  const hasStreaming = useMemo(
    () => has('streaming'),
    [has]
  );
  
  const hasTools = useMemo(
    () => has('tool-execution') || has('mcp-servers'),
    [has]
  );
  
  const hasIntegrations = useMemo(
    () =>
      has('calendar-integration') ||
      has('email-integration') ||
      has('workspace-integration') ||
      has('knowledge-graph'),
    [has]
  );
  
  // Dynamic feature toggling
  const enable = useCallback((featureId: GooseFeatureId) => {
    setConfig((prev) => ({
      ...prev,
      enabledFeatures: new Set([...Array.from(prev.enabledFeatures), featureId]),
      disabledFeatures: new Set(Array.from(prev.disabledFeatures).filter((f) => f !== featureId)),
    }));
  }, []);
  
  const disable = useCallback((featureId: GooseFeatureId) => {
    setConfig((prev) => ({
      ...prev,
      enabledFeatures: new Set(Array.from(prev.enabledFeatures).filter((f) => f !== featureId)),
      disabledFeatures: new Set([...Array.from(prev.disabledFeatures), featureId]),
    }));
  }, []);
  
  // Preset switching
  const switchPreset = useCallback((presetId: GoosePresetId) => {
    const newConfig = createFeatureConfig(presetId, {
      backendUrl: options.backendUrl,
      model: options.model,
    });
    setConfig(newConfig);
  }, [options.backendUrl, options.model]);
  
  return {
    config,
    has,
    availability,
    loading,
    hasVoice,
    hasStreaming,
    hasTools,
    hasIntegrations,
    enable,
    disable,
    switchPreset,
  };
}

/**
 * Get the backend URL for a specific feature
 */
export function getFeatureBackendUrl(featureId: GooseFeatureId): string | undefined {
  return GOOSE_FEATURES[featureId]?.requiresBackend;
}

/**
 * Get preset info
 */
export function getPresetInfo(presetId: GoosePresetId) {
  return GOOSE_PRESETS[presetId];
}
