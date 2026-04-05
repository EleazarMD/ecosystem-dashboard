/**
 * ML Training & Fine-tuning Dashboard
 * Central hub for model training, fine-tuning, pipeline design, and compute resource management
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';
import {
  Box,
  Flex,
  Container,
  Spinner,
  VStack,
  Text,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Dynamic imports for components
const MLTrainingNavigation = dynamic(
  () => import('@/components/ml-training/MLTrainingNavigation'),
  { ssr: false }
);

const TrainingOverviewDashboard = dynamic(
  () => import('@/components/ml-training/TrainingOverviewDashboard'),
  {
    ssr: false,
    loading: () => (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text color="gray.500">Loading overview...</Text>
      </VStack>
    ),
  }
);

const TrainingProgressChart = dynamic(
  () => import("@/components/ml-training/TrainingProgressChart"),
  { ssr: false }
);

const TrainingJobsPanel = dynamic(
  () => import('@/components/ml-training/TrainingJobsPanel'),
  { ssr: false }
);

const ComputeResourcesPanel = dynamic(
  () => import('@/components/ml-training/ComputeResourcesPanel'),
  { ssr: false }
);

const FineTuningPanel = dynamic(
  () => import('@/components/ml-training/FineTuningPanel'),
  { ssr: false }
);

const PipelineDesigner = dynamic(
  () => import('@/components/ml-training/PipelineDesigner'),
  { ssr: false }
);

const ClinicalFeedbackPanel = dynamic(
  () => import('@/components/ml-training/ClinicalFeedbackPanel'),
  { ssr: false }
);

const ClinicalEvidenceExperiments = dynamic(
  () => import('@/components/ml-training/ClinicalEvidenceExperiments'),
  { ssr: false }
);

const MultiAgentEvaluatorPanel = dynamic(
  () => import("@/components/ml-training/MultiAgentEvaluatorPanel"),
  { ssr: false }
);

const UISynthesisTestsPanel = dynamic(
  () => import('@/components/ml-training/UISynthesisTestsPanel'),
  { ssr: false }
);

const RLStagingApprovalPanel = dynamic(
  () => import("@/components/ml-training/RLStagingApprovalPanel"),
  { ssr: false }
);

const RLCycleControlPanel = dynamic(
  () => import("@/components/ml-training/RLCycleControlPanel"),
  { ssr: false }
);

function MLTrainingPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState('overview');
  const [activeJobs, setActiveJobs] = useState(2);
  const [connectedMachines, setConnectedMachines] = useState(2);

  const bgPrimary = useSemanticToken('surface.base');
  const borderSubtle = useSemanticToken('border.subtle');
  const textSecondary = useSemanticToken('text.secondary');

  // Read section from URL query parameter
  useEffect(() => {
    if (router.isReady && router.query.section) {
      setSelectedSection(router.query.section as string);
    }
  }, [router.isReady, router.query.section]);

  // Update URL when section changes
  const handleSectionChange = (sectionId: string) => {
    if (sectionId === selectedSection) return; // Prevent navigating to same URL
    setSelectedSection(sectionId);
    router.push(`/ml-training?section=${sectionId}`, undefined, { shallow: true });
  };

  // Render main content based on selected section
  const renderMainContent = () => {
    switch (selectedSection) {
      case 'overview':
        return <TrainingOverviewDashboard />;

      case 'live-progress':
        return <TrainingProgressChart />;

      case 'training-jobs':
        return <TrainingJobsPanel />;

      case 'compute-resources':
        return <ComputeResourcesPanel />;

      case 'fine-tuning':
        return <FineTuningPanel />;

      case 'pipeline-designer':
        return <PipelineDesigner />;

      case 'model-registry':
        return (
          <VStack h="300px" justify="center" align="center">
            <Text fontSize="xl" fontWeight="bold" color={textSecondary}>
              Model Registry
            </Text>
            <Text color={textSecondary}>
              Browse and manage your trained models
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              Coming soon...
            </Text>
          </VStack>
        );

      case 'clinical-feedback':
        return <ClinicalFeedbackPanel />;

      case 'experiments':
        return <ClinicalEvidenceExperiments />;

      case 'multi-agent-evaluator':
        return <MultiAgentEvaluatorPanel />;

      case 'ui-synthesis-tests':
        return <UISynthesisTestsPanel />;

      case 'rl-staging-approval':
        return <RLStagingApprovalPanel />;

      case 'rl-cycle-control':
        return <RLCycleControlPanel />;

      case 'datasets':
        return (
          <VStack h="300px" justify="center" align="center">
            <Text fontSize="xl" fontWeight="bold" color={textSecondary}>
              Dataset Management
            </Text>
            <Text color={textSecondary}>
              Manage training and evaluation datasets
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              Coming soon...
            </Text>
          </VStack>
        );

      case 'robotics':
        return (
          <VStack h="300px" justify="center" align="center">
            <Text fontSize="xl" fontWeight="bold" color={textSecondary}>
              Robotics Training
            </Text>
            <Text color={textSecondary}>
              Reinforcement learning and simulation environments
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              Isaac Sim integration coming soon...
            </Text>
          </VStack>
        );

      case 'hyperparameters':
        return (
          <VStack h="300px" justify="center" align="center">
            <Text fontSize="xl" fontWeight="bold" color={textSecondary}>
              Hyperparameter Tuning
            </Text>
            <Text color={textSecondary}>
              AutoML sweeps and optimization
            </Text>
            <Text fontSize="sm" color={textSecondary}>
              Optuna integration coming soon...
            </Text>
          </VStack>
        );

      default:
        return <TrainingOverviewDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <Box minH="calc(100vh - 100px)" bg={bgPrimary}>
        <Flex h="full">
          {/* Left Sidebar - Navigation */}
          <Box
            w="280px"
            minH="calc(100vh - 100px)"
            position="sticky"
            top={0}
            flexShrink={0}
          >
            <SimpleGlassPanel
              variant="heavy"
              h="full"
              borderRadius="none"
              borderRight="1px solid"
              borderColor={borderSubtle}
            >
              <MLTrainingNavigation
                selectedSection={selectedSection}
                onSectionChange={handleSectionChange}
                activeJobs={activeJobs}
                connectedMachines={connectedMachines}
              />
            </SimpleGlassPanel>
          </Box>

          {/* Main Content Area */}
          <Box flex={1} overflow="auto" p={6}>
            <Container maxW="container.xl">
              {renderMainContent()}
            </Container>
          </Box>
        </Flex>
      </Box>
    </DashboardLayout>
  );
}

export default withFeatureGuard(MLTrainingPage, 'ml-training');
