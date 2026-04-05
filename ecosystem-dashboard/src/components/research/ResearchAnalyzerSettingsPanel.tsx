/**
 * Research Analyzer Settings Panel
 * Right context panel for controlling the Research Analyzer:
 * - Follow-up research model selection
 * - Context inclusion toggle
 * - Analysis model info
 * - Quick actions
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Switch,
  Select,
  Divider,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiCpu,
  FiTarget,
  FiAlertTriangle,
  FiZap,
  FiRefreshCw,
  FiSettings,
  FiDollarSign,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface AnalyzerSettings {
  followUpModel: string;
  includeContext: boolean;
  analysisModel: string;
}

export default function ResearchAnalyzerSettingsPanel() {
  const { customData, setCustomData } = useRightPanel();
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  // Read settings from customData
  const settings: AnalyzerSettings = customData?.analyzerSettings || {
    followUpModel: 'sonar-deep-research',
    includeContext: true,
    analysisModel: 'qwen3-32b',
  };

  const analysis = customData?.analysis || null;

  const updateSettings = (partial: Partial<AnalyzerSettings>) => {
    setCustomData({
      ...customData,
      analyzerSettings: { ...settings, ...partial },
    });
  };

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack spacing={5} align="stretch">
        {/* Analysis Stats */}
        {analysis && (
          <>
            <Box>
              <HStack mb={3}>
                <Icon as={FiTarget} color="purple.400" />
                <Text fontSize="sm" fontWeight="700" color={textColor}>Analysis Summary</Text>
              </HStack>
              <SimpleGrid columns={2} spacing={3}>
                <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <Stat size="sm">
                    <StatLabel fontSize="2xs">Topics</StatLabel>
                    <StatNumber fontSize="lg">{analysis.topics?.length || 0}</StatNumber>
                  </Stat>
                </Box>
                <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <Stat size="sm">
                    <StatLabel fontSize="2xs">Gaps</StatLabel>
                    <StatNumber fontSize="lg" color="orange.400">{analysis.gaps?.length || 0}</StatNumber>
                  </Stat>
                </Box>
                <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <Stat size="sm">
                    <StatLabel fontSize="2xs">Deep</StatLabel>
                    <StatNumber fontSize="lg" color="green.400">
                      {analysis.topics?.filter((t: any) => t.depth === 'deep').length || 0}
                    </StatNumber>
                  </Stat>
                </Box>
                <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <Stat size="sm">
                    <StatLabel fontSize="2xs">Shallow</StatLabel>
                    <StatNumber fontSize="lg" color="red.400">
                      {analysis.topics?.filter((t: any) => t.depth === 'shallow').length || 0}
                    </StatNumber>
                  </Stat>
                </Box>
              </SimpleGrid>
            </Box>
            <Divider />
          </>
        )}

        {/* Analysis Model */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiCpu} color="purple.400" />
            <Text fontSize="sm" fontWeight="700" color={textColor}>Analysis Model</Text>
          </HStack>
          <HStack p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
            <Badge colorScheme="purple" fontSize="xs">Qwen3 32B</Badge>
            <Text fontSize="xs" color={mutedColor}>via AI Gateway</Text>
          </HStack>
          <Text fontSize="2xs" color={mutedColor} mt={1}>
            Used to decompose the report into topics and assess coverage
          </Text>
        </Box>

        <Divider />

        {/* Follow-up Research Settings */}
        <Box>
          <HStack mb={3}>
            <Icon as={FiSettings} color="blue.400" />
            <Text fontSize="sm" fontWeight="700" color={textColor}>Follow-up Research</Text>
          </HStack>

          <VStack spacing={3} align="stretch">
            <Box>
              <Text fontSize="xs" fontWeight="600" color={textColor} mb={1}>
                Deep Research Model
              </Text>
              <Select
                size="sm"
                fontSize="xs"
                value={settings.followUpModel}
                onChange={(e) => updateSettings({ followUpModel: e.target.value })}
              >
                <option value="sonar-deep-research">Perplexity Deep Research</option>
                <option value="sonar-pro">Perplexity Sonar Pro</option>
              </Select>
              <HStack mt={1} spacing={2}>
                <Icon as={FiDollarSign} boxSize={3} color={mutedColor} />
                <Text fontSize="2xs" color={mutedColor}>
                  {settings.followUpModel === 'sonar-deep-research'
                    ? '$2/$8 per M tokens (input/output)'
                    : '$1/$5 per M tokens (input/output)'}
                </Text>
              </HStack>
            </Box>

            <HStack justify="space-between" p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="600" color={textColor}>
                  Include Report Context
                </Text>
                <Text fontSize="2xs" color={mutedColor}>
                  Sends original report summary to avoid overlap
                </Text>
              </VStack>
              <Switch
                size="sm"
                colorScheme="purple"
                isChecked={settings.includeContext}
                onChange={(e) => updateSettings({ includeContext: e.target.checked })}
              />
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* Quick Info */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiZap} color="yellow.400" />
            <Text fontSize="sm" fontWeight="700" color={textColor}>How It Works</Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            <Text fontSize="2xs" color={mutedColor}>
              <strong>1.</strong> Qwen3 analyzes your completed report for topic coverage, depth, and gaps.
            </Text>
            <Text fontSize="2xs" color={mutedColor}>
              <strong>2.</strong> Select topics to expand or gaps to fill in the Analyzer tab.
            </Text>
            <Text fontSize="2xs" color={mutedColor}>
              <strong>3.</strong> Click "Deep Research on Selected" to send a focused query to Perplexity with the original report as context, avoiding duplicate coverage.
            </Text>
            <Text fontSize="2xs" color={mutedColor}>
              <strong>4.</strong> Or use "Ask Qwen3" for quick follow-up questions without web search.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
