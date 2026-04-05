/**
 * Email GraphRAG Settings Form
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Divider,
  Icon,
  Badge,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import {
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ServerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EmailSettings {
  user_name: string;
  user_email: string;
  user_role: string;
  user_department: string;
  llm_model: string;
  embedding_model: string;
  drafts_enabled: boolean;
  auto_classify: boolean;
  auto_summarize: boolean;
}

interface ServiceStatus {
  graphrag: boolean;
  neo4j: boolean;
  ai_gateway: boolean;
}

interface SettingsFormProps {
  graphragUrl?: string;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  graphragUrl = 'http://localhost:8780',
}) => {
  const [settings, setSettings] = useState<EmailSettings>({
    user_name: '',
    user_email: '',
    user_role: '',
    user_department: '',
    llm_model: 'gpt-4o-mini',
    embedding_model: 'text-embedding-3-small',
    drafts_enabled: true,
    auto_classify: true,
    auto_summarize: true,
  });
  const [status, setStatus] = useState<ServiceStatus>({
    graphrag: false,
    neo4j: false,
    ai_gateway: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.subtle');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');

  // Check service status
  const checkStatus = async () => {
    try {
      const response = await fetch(`${graphragUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        setStatus({
          graphrag: data.status === 'healthy',
          neo4j: true, // If graphrag is healthy, neo4j is connected
          ai_gateway: true,
        });
      }
    } catch (error) {
      setStatus({ graphrag: false, neo4j: false, ai_gateway: false });
    }
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
    // Load settings from localStorage
    const saved = localStorage.getItem('email_graphrag_settings');
    if (saved) {
      setSettings({ ...settings, ...JSON.parse(saved) });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('email_graphrag_settings', JSON.stringify(settings));
      
      // TODO: Send to backend when API endpoint is ready
      
      toast({
        title: 'Settings saved',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const StatusBadge: React.FC<{ connected: boolean; label: string }> = ({ connected, label }) => (
    <HStack>
      <Icon
        as={connected ? CheckCircleIcon : ExclamationCircleIcon}
        color={connected ? successColor : errorColor}
        boxSize={4}
      />
      <Text fontSize="sm" color={textSecondary}>{label}</Text>
      <Badge colorScheme={connected ? 'green' : 'red'} variant="subtle">
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
    </HStack>
  );

  if (loading) {
    return (
      <GlassPanel p={6}>
        <VStack py={8}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading settings...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Service Status */}
      <GlassPanel p={6}>
        <Text fontWeight="semibold" fontSize="lg" mb={4} color={textPrimary}>
          Service Status
        </Text>
        <VStack align="stretch" spacing={3}>
          <StatusBadge connected={status.graphrag} label="Email GraphRAG" />
          <StatusBadge connected={status.neo4j} label="Neo4j Graph Database" />
          <StatusBadge connected={status.ai_gateway} label="AI Gateway" />
        </VStack>
        {!status.graphrag && (
          <Alert status="warning" mt={4} borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Email GraphRAG service is not running. Start it with: <code>./start.sh</code>
            </Text>
          </Alert>
        )}
      </GlassPanel>

      {/* User Profile */}
      <GlassPanel p={6}>
        <HStack mb={4}>
          <Icon as={UserIcon} color={textSecondary} />
          <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
            User Profile
          </Text>
        </HStack>
        <Text fontSize="sm" color={textTertiary} mb={4}>
          This information helps AI generate personalized replies in your style.
        </Text>
        
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">Full Name</FormLabel>
            <Input
              value={settings.user_name}
              onChange={(e) => setSettings({ ...settings, user_name: e.target.value })}
              placeholder="Dr. Eleazar Flores"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Email Address</FormLabel>
            <Input
              value={settings.user_email}
              onChange={(e) => setSettings({ ...settings, user_email: e.target.value })}
              placeholder="eflores2@houstonmethodist.org"
              type="email"
            />
          </FormControl>

          <HStack spacing={4}>
            <FormControl flex={1}>
              <FormLabel fontSize="sm">Role / Title</FormLabel>
              <Input
                value={settings.user_role}
                onChange={(e) => setSettings({ ...settings, user_role: e.target.value })}
                placeholder="Research Scientist"
              />
            </FormControl>

            <FormControl flex={1}>
              <FormLabel fontSize="sm">Department</FormLabel>
              <Input
                value={settings.user_department}
                onChange={(e) => setSettings({ ...settings, user_department: e.target.value })}
                placeholder="Research Institute"
              />
            </FormControl>
          </HStack>
        </VStack>
      </GlassPanel>

      {/* AI Models */}
      <GlassPanel p={6}>
        <HStack mb={4}>
          <Icon as={CpuChipIcon} color={textSecondary} />
          <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
            AI Models
          </Text>
        </HStack>
        
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">LLM Model (for reply generation)</FormLabel>
            <Select
              value={settings.llm_model}
              onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
              <option value="gpt-4o">GPT-4o (Best)</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="llama3.1:8b">Llama 3.1 8B (Local)</option>
            </Select>
            <FormHelperText>Model used for generating email replies</FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Embedding Model</FormLabel>
            <Select
              value={settings.embedding_model}
              onChange={(e) => setSettings({ ...settings, embedding_model: e.target.value })}
            >
              <option value="text-embedding-3-small">OpenAI text-embedding-3-small</option>
              <option value="text-embedding-3-large">OpenAI text-embedding-3-large</option>
              <option value="nomic-embed-text">Nomic Embed (Local)</option>
            </Select>
            <FormHelperText>Model used for semantic search in RAG</FormHelperText>
          </FormControl>
        </VStack>
      </GlassPanel>

      {/* Features */}
      <GlassPanel p={6}>
        <HStack mb={4}>
          <Icon as={ServerIcon} color={textSecondary} />
          <Text fontWeight="semibold" fontSize="lg" color={textPrimary}>
            Features
          </Text>
        </HStack>
        
        <VStack spacing={4} align="stretch">
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <FormLabel mb={0} fontSize="sm">Create Drafts in Apple Mail</FormLabel>
              <FormHelperText mt={1}>
                Automatically create drafts for approved AI replies
              </FormHelperText>
            </Box>
            <Switch
              isChecked={settings.drafts_enabled}
              onChange={(e) => setSettings({ ...settings, drafts_enabled: e.target.checked })}
              colorScheme="purple"
            />
          </FormControl>

          <Divider />

          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <FormLabel mb={0} fontSize="sm">Auto-Classify Emails</FormLabel>
              <FormHelperText mt={1}>
                Automatically categorize incoming emails
              </FormHelperText>
            </Box>
            <Switch
              isChecked={settings.auto_classify}
              onChange={(e) => setSettings({ ...settings, auto_classify: e.target.checked })}
              colorScheme="purple"
            />
          </FormControl>

          <Divider />

          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <FormLabel mb={0} fontSize="sm">Auto-Summarize Emails</FormLabel>
              <FormHelperText mt={1}>
                Generate brief summaries for each email
              </FormHelperText>
            </Box>
            <Switch
              isChecked={settings.auto_summarize}
              onChange={(e) => setSettings({ ...settings, auto_summarize: e.target.checked })}
              colorScheme="purple"
            />
          </FormControl>
        </VStack>
      </GlassPanel>

      {/* Save Button */}
      <Button
        colorScheme="purple"
        size="lg"
        onClick={handleSave}
        isLoading={saving}
      >
        Save Settings
      </Button>
    </VStack>
  );
};

export default SettingsForm;
