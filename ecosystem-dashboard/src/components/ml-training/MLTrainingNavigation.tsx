/**
 * ML Training Navigation Component
 * Sidebar navigation for the ML Training & Fine-tuning dashboard
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import {
  CpuChipIcon,
  ChartBarIcon,
  ServerStackIcon,
  BeakerIcon,
  CubeTransparentIcon,
  DocumentChartBarIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  RocketLaunchIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface NavigationSection {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  badgeColor?: string;
  description?: string;
}

interface MLTrainingNavigationProps {
  selectedSection: string;
  onSectionChange: (sectionId: string) => void;
  activeJobs?: number;
  connectedMachines?: number;
}

const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'Training Overview',
    icon: ChartBarIcon,
    description: 'Dashboard & metrics summary',
  },
  {
    id: 'live-progress',
    label: 'Live Training',
    icon: ChartBarIcon,
    badge: 'Live',
    badgeColor: 'red',
    description: 'Real-time training charts',
  },
  {
    id: 'training-jobs',
    label: 'Training Jobs',
    icon: RocketLaunchIcon,
    badge: 'Active',
    badgeColor: 'green',
    description: 'Monitor running jobs',
  },
  {
    id: 'compute-resources',
    label: 'Compute Resources',
    icon: ServerStackIcon,
    description: 'DGX Spark & GPUs',
  },
  {
    id: 'model-registry',
    label: 'Model Registry',
    icon: CircleStackIcon,
    description: 'Trained models catalog',
  },
  {
    id: 'fine-tuning',
    label: 'Fine-tuning',
    icon: WrenchScrewdriverIcon,
    badge: 'LoRA',
    badgeColor: 'purple',
    description: 'LoRA, QLoRA, PEFT',
  },
  {
    id: 'pipeline-designer',
    label: 'Pipeline Designer',
    icon: CubeTransparentIcon,
    badge: 'New',
    badgeColor: 'blue',
    description: 'Visual ML pipelines',
  },
  {
    id: 'ablation-tests',
    label: 'Ablation Tests',
    icon: BeakerIcon,
    badge: 'New',
    badgeColor: 'purple',
    description: 'Pipeline component analysis',
  },
  {
    id: 'multi-agent-evaluator',
    label: 'Multi-Agent Evaluator',
    icon: BeakerIcon,
    badge: 'AI Ops',
    badgeColor: 'purple',
    description: 'Clinical Evidence E2E Pipeline',
  },
  {
    id: 'experiments',
    label: 'Experiments',
    icon: BeakerIcon,
    description: 'Track & compare runs',
  },
  {
    id: 'datasets',
    label: 'Datasets',
    icon: DocumentChartBarIcon,
    description: 'Data management',
  },
  {
    id: 'robotics',
    label: 'Robotics Training',
    icon: CpuChipIcon,
    badge: 'Beta',
    badgeColor: 'orange',
    description: 'RL & simulation',
  },
  {
    id: 'hyperparameters',
    label: 'Hyperparameter Tuning',
    icon: ArrowPathIcon,
    description: 'AutoML & sweeps',
  },
  {
    id: 'clinical-feedback',
    label: 'Clinical Feedback',
    icon: BeakerIcon,
    badge: 'Med42',
    badgeColor: 'green',
    description: 'Feedback & training data',
  },
  {
    id: 'ui-synthesis-tests',
    label: 'UI Synthesis Tests',
    icon: BeakerIcon,
    badge: '39',
    badgeColor: 'purple',
    description: 'Query routing validation',
  },
  {
    id: 'rl-cycle-control',
    label: 'RL Cycle Control',
    icon: ArrowPathIcon,
    badge: 'Ops',
    badgeColor: 'green',
    description: 'Start/stop RL improvement cycles',
  },
  {
    id: 'rl-cycle-control',
    label: 'RL Staging & Promotion',
    icon: BeakerIcon,
    badge: 'New',
    badgeColor: 'purple',
    description: 'Training control & promotion gate',
  },
  {
    id: 'ab-testing',
    label: 'A/B Testing',
    icon: BeakerIcon,
    badge: 'Kids',
    badgeColor: 'pink',
    description: 'Kids portal experiments',
  },
];

export const MLTrainingNavigation: React.FC<MLTrainingNavigationProps> = ({
  selectedSection,
  onSectionChange,
  activeJobs = 0,
  connectedMachines = 0,
}) => {
  const bgHover = useSemanticToken('surface.hover');
  const bgActive = useSemanticToken('surface.active');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const accentColor = useSemanticToken('interactive.primary');

  return (
    <Box h="full" py={4}>
      {/* Header Stats */}
      <Box px={4} mb={4}>
        <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={3}>
          ML Training Hub
        </Text>
        <HStack spacing={4} mb={2}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
              {activeJobs}
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              Active Jobs
            </Text>
          </Box>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="green.400">
              {connectedMachines}
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              Connected
            </Text>
          </Box>
        </HStack>
      </Box>

      <Divider borderColor={borderSubtle} mb={4} />

      {/* Navigation Items */}
      <VStack spacing={1} align="stretch" px={2}>
        {navigationSections.map((section) => {
          const isSelected = selectedSection === section.id;

          return (
            <Box
              key={section.id}
              px={3}
              py={2}
              borderRadius="md"
              cursor="pointer"
              bg={isSelected ? bgActive : 'transparent'}
              color={isSelected ? 'white' : textPrimary}
              _hover={{
                bg: isSelected ? bgActive : bgHover,
              }}
              onClick={() => onSectionChange(section.id)}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon
                    as={section.icon}
                    boxSize={5}
                    color={isSelected ? 'white' : textSecondary}
                  />
                  <Box>
                    <Text fontSize="sm" fontWeight={isSelected ? 'bold' : 'medium'}>
                      {section.label}
                    </Text>
                    {!isSelected && section.description && (
                      <Text fontSize="xs" color={textSecondary}>
                        {section.description}
                      </Text>
                    )}
                  </Box>
                </HStack>
                {section.badge && (
                  <Badge
                    colorScheme={section.badgeColor || 'gray'}
                    variant="solid"
                    fontSize="2xs"
                  >
                    {section.badge}
                  </Badge>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>

      <Divider borderColor={borderSubtle} my={4} />

      {/* Quick Actions */}
      <Box px={4}>
        <Text fontSize="xs" fontWeight="bold" color={textSecondary} mb={2}>
          QUICK ACTIONS
        </Text>
        <VStack spacing={2} align="stretch">
          <HStack
            px={3}
            py={2}
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: bgHover }}
            onClick={() => onSectionChange('training-jobs')}
          >
            <Icon as={RocketLaunchIcon} boxSize={4} color="green.400" />
            <Text fontSize="sm" color={textPrimary}>
              Start New Training
            </Text>
          </HStack>
          <HStack
            px={3}
            py={2}
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: bgHover }}
            onClick={() => onSectionChange('fine-tuning')}
          >
            <Icon as={WrenchScrewdriverIcon} boxSize={4} color="purple.400" />
            <Text fontSize="sm" color={textPrimary}>
              Quick Fine-tune
            </Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

export default MLTrainingNavigation;
