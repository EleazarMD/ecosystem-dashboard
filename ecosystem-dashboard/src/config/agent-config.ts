/**
 * AI Homelab Dashboard Agent Configuration
 * 
 * Central configuration for the AI agent system including Google ADK,
 * AIHDS Client SDK, and Ollama integration settings.
 */

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  confidence_threshold: number;
}

export interface AgentPersonality {
  name: string;
  role: string;
  traits: {
    helpfulness: number;
    proactivity: number;
    technical_depth: number;
    friendliness: number;
    confidence_threshold: number;
  };
  communication_style: {
    formality: 'formal' | 'professional_casual' | 'casual';
    verbosity: 'minimal' | 'moderate' | 'detailed';
    use_emojis: boolean;
    code_examples: boolean;
    response_format: 'conversational' | 'structured' | 'technical';
  };
}

export interface VoiceSettings {
  enabled: boolean;
  wake_word: string;
  language: string;
  voice_name?: string;
  speech_rate: number;
  speech_pitch: number;
  speech_volume: number;
  silence_threshold: number;
  continuous_listening: boolean;
}

export interface MonitoringThresholds {
  system_health: {
    critical: number;
    warning: number;
    healthy: number;
  };
  service_availability: {
    critical: number;
    warning: number;
    healthy: number;
  };
  response_time: {
    critical: number;
    warning: number;
    optimal: number;
  };
  resource_usage: {
    cpu_critical: number;
    cpu_warning: number;
    memory_critical: number;
    memory_warning: number;
    disk_critical: number;
    disk_warning: number;
  };
}

export interface AgentConfiguration {
  // Core Agent Settings
  agent: {
    id: string;
    version: string;
    environment: 'development' | 'staging' | 'production' | 'test';
    debug_mode: boolean;
  };

  // Google ADK Configuration
  google_adk: {
    enabled: boolean;
    project_id: string;
    agent_id: string;
    location: string;
    credentials_path?: string;
    session_timeout: number;
  };

  // AIHDS Client SDK Configuration
  aihds: {
    enabled: boolean;
    gateway_url: string;
    api_key: string;
    knowledge_graph_url: string;
    timeout: number;
    retry_attempts: number;
  };

  // Ollama Configuration
  ollama: {
    enabled: boolean;
    base_url: string;
    model: string;
    timeout: number;
    max_tokens: number;
    temperature: number;
  };

  // Agent Capabilities
  capabilities: AgentCapability[];

  // Agent Personality
  personality: AgentPersonality;

  // Voice Interface Settings
  voice: VoiceSettings;

  // Monitoring Configuration
  monitoring: MonitoringThresholds;

  // Proactive Features
  proactive: {
    enabled: boolean;
    scan_interval: number;
    alert_threshold: number;
    auto_resolution_enabled: boolean;
    learning_enabled: boolean;
  };

  // UI/UX Settings
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animations_enabled: boolean;
    sound_enabled: boolean;
    notifications_enabled: boolean;
    compact_mode: boolean;
  };
}

// Default Configuration
export const DefaultAgentConfig: AgentConfiguration = {
  agent: {
    id: 'ai-homelab-dashboard-agent',
    version: '1.0.0',
    environment: 'development',
    debug_mode: true,
  },

  google_adk: {
    enabled: false, // Will be enabled when ADK is set up
    project_id: process.env.GOOGLE_ADK_PROJECT_ID || 'ai-homelab-dashboard',
    agent_id: process.env.GOOGLE_ADK_AGENT_ID || 'dashboard-assistant',
    location: process.env.GOOGLE_ADK_LOCATION || 'us-central1',
    credentials_path: process.env.GOOGLE_ADK_CREDENTIALS_PATH,
    session_timeout: 300000, // 5 minutes
  },

  aihds: {
    enabled: false,
    gateway_url: process.env.AIHDS_GATEWAY_URL || 'http://localhost:7777',
    api_key: process.env.AIHDS_API_KEY || '',
    knowledge_graph_url: process.env.AIHDS_KNOWLEDGE_GRAPH_URL || 'http://localhost:8080',
    timeout: 30000,
    retry_attempts: 3,
  },

  ollama: {
    enabled: false, // Will be enabled when Ollama is set up
    base_url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3-multimodal',
    timeout: 60000,
    max_tokens: 4096,
    temperature: 0.7,
  },

  capabilities: [
    {
      id: 'system-monitoring',
      name: 'System Monitoring',
      description: 'Monitor system health and performance metrics',
      enabled: true,
      confidence_threshold: 0.8,
    },
    {
      id: 'service-management',
      name: 'Service Management',
      description: 'Manage and control system services',
      enabled: true,
      confidence_threshold: 0.85,
    },
    {
      id: 'troubleshooting',
      name: 'Troubleshooting',
      description: 'Diagnose and resolve system issues',
      enabled: true,
      confidence_threshold: 0.75,
    },
    {
      id: 'optimization',
      name: 'Performance Optimization',
      description: 'Optimize system performance and resource usage',
      enabled: true,
      confidence_threshold: 0.8,
    },
    {
      id: 'documentation',
      name: 'Documentation Management',
      description: 'Manage knowledge base and documentation',
      enabled: true,
      confidence_threshold: 0.7,
    },
    {
      id: 'predictive-analytics',
      name: 'Predictive Analytics',
      description: 'Predict potential issues and trends',
      enabled: false, // Advanced feature
      confidence_threshold: 0.9,
    },
  ],

  personality: (() => {
    // Try to load from saved Goose config
    try {
      if (typeof window !== 'undefined') {
        const savedConfig = localStorage.getItem('goose-assistant-config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          return {
            name: parsed.identity?.name || 'Morpheus',
            role: parsed.identity?.role || 'Infrastructure Management Specialist',
            traits: {
              helpfulness: 0.95,
              proactivity: 0.85,
              technical_depth: 0.90,
              friendliness: 0.75,
              confidence_threshold: 0.70,
            },
            communication_style: {
              formality: 'professional_casual',
              verbosity: 'moderate',
              use_emojis: parsed.communication?.useEmojis ?? false,
              code_examples: true,
              response_format: 'conversational',
            },
          };
        }
      }
    } catch (e) {
      console.error('Failed to load Goose config:', e);
    }
    
    // Fallback to default
    return {
      name: 'Morpheus',
      role: 'Infrastructure Management Specialist',
      traits: {
        helpfulness: 0.95,
        proactivity: 0.85,
        technical_depth: 0.90,
        friendliness: 0.75,
        confidence_threshold: 0.70,
      },
      communication_style: {
        formality: 'professional_casual',
        verbosity: 'moderate',
        use_emojis: false,
        code_examples: true,
        response_format: 'conversational',
      },
    };
  })(),

  voice: {
    enabled: false, // Will be enabled when voice is set up
    wake_word: 'Hey Assistant',
    language: 'en-US',
    voice_name: 'Samantha', // Preferred voice
    speech_rate: 0.9,
    speech_pitch: 1.0,
    speech_volume: 0.8,
    silence_threshold: 1000,
    continuous_listening: false,
  },

  monitoring: {
    system_health: {
      critical: 70,
      warning: 85,
      healthy: 95,
    },
    service_availability: {
      critical: 80,
      warning: 95,
      healthy: 99,
    },
    response_time: {
      critical: 5000,
      warning: 2000,
      optimal: 500,
    },
    resource_usage: {
      cpu_critical: 90,
      cpu_warning: 80,
      memory_critical: 95,
      memory_warning: 85,
      disk_critical: 95,
      disk_warning: 90,
    },
  },

  proactive: {
    enabled: true,
    scan_interval: 30000, // 30 seconds
    alert_threshold: 2,
    auto_resolution_enabled: true,
    learning_enabled: false, // Advanced feature
  },

  ui: {
    theme: 'auto',
    animations_enabled: true,
    sound_enabled: false,
    notifications_enabled: true,
    compact_mode: false,
  },
};

// Environment-specific overrides
const getEnvironmentConfig = (): Partial<AgentConfiguration> => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        agent: {
          ...DefaultAgentConfig.agent,
          environment: 'production',
          debug_mode: false,
        },
        google_adk: {
          ...DefaultAgentConfig.google_adk,
          enabled: true, // Enable in production
        },
        ollama: {
          ...DefaultAgentConfig.ollama,
          enabled: true, // Enable in production
        },
        voice: {
          ...DefaultAgentConfig.voice,
          enabled: true, // Enable in production
        },
      };

    case 'staging':
      return {
        agent: {
          ...DefaultAgentConfig.agent,
          environment: 'staging',
          debug_mode: true,
        },
        google_adk: {
          ...DefaultAgentConfig.google_adk,
          enabled: true,
        },
        ollama: {
          ...DefaultAgentConfig.ollama,
          enabled: true,
        },
      };

    default: // development
      return {};
  }
};

// Merged configuration with environment overrides
export const AgentConfig: AgentConfiguration = {
  ...DefaultAgentConfig,
  ...getEnvironmentConfig(),
};

// Configuration validation
export const validateAgentConfig = (config: AgentConfiguration): string[] => {
  const errors: string[] = [];

  // Validate required fields
  if (!config.agent.id) {
    errors.push('Agent ID is required');
  }

  if (config.google_adk.enabled && !config.google_adk.project_id) {
    errors.push('Google ADK Project ID is required when ADK is enabled');
  }

  if (config.aihds.enabled && !config.aihds.gateway_url) {
    errors.push('AIHDS Gateway URL is required when AIHDS is enabled');
  }

  if (config.ollama.enabled && !config.ollama.base_url) {
    errors.push('Ollama Base URL is required when Ollama is enabled');
  }

  // Validate thresholds
  Object.entries(config.monitoring).forEach(([category, thresholds]) => {
    if (typeof thresholds === 'object' && 'critical' in thresholds) {
      if (thresholds.critical >= thresholds.warning) {
        errors.push(`${category}: Critical threshold must be less than warning threshold`);
      }
      if (thresholds.warning >= thresholds.healthy) {
        errors.push(`${category}: Warning threshold must be less than healthy threshold`);
      }
    }
  });

  return errors;
};

// Export for use in components
export default AgentConfig;
