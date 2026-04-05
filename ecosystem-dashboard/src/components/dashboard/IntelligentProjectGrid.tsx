/**
 * Intelligent Project Grid - AI-Driven Project Management
 * Shows active projects with AI-powered insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  Badge,
  Button,
  VStack,
  HStack,
  Flex,
  Icon,
  Progress,
  Avatar,
  AvatarGroup,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  RocketIcon,
  BrainIcon,
  DatabaseIcon,
  CodeIcon,
  TrendingUpIcon,
  ClockIcon,
  UsersIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PauseIcon,
  SettingsIcon
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: 'research' | 'development' | 'experiment' | 'deployment';
  status: 'active' | 'paused' | 'completed' | 'planning';
  progress: number;
  priority: 'high' | 'medium' | 'low';
  aiInsights: {
    recommendation: string;
    confidence: number;
    nextAction: string;
    estimatedCompletion: string;
  };
  resources: {
    gpu?: number;
    cpu?: number;
    memory?: string;
    storage?: string;
  };
  collaborators: string[];
  lastActivity: string;
  metrics?: {
    accuracy?: number;
    performance?: number;
    cost?: number;
  };
}

interface IntelligentProjectGridProps {
  onProjectAction?: (projectId: string, action: string) => void;
}

const MotionBox = motion(Box);

export const IntelligentProjectGrid: React.FC<IntelligentProjectGridProps> = ({ onProjectAction }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.hover');

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      
      // Simulate AI project analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Voice Assistant Enhancement',
          type: 'development',
          status: 'active',
          progress: 85,
          priority: 'high',
          aiInsights: {
            recommendation: 'Ready for production deployment. All tests passing.',
            confidence: 94,
            nextAction: 'Deploy to staging environment',
            estimatedCompletion: '2 days'
          },
          resources: { gpu: 1, cpu: 4, memory: '16GB' },
          collaborators: ['Research Agent', 'Voice Specialist'],
          lastActivity: '15 minutes ago',
          metrics: { accuracy: 94, performance: 89 }
        },
        {
          id: '2',
          name: 'Knowledge Graph Expansion',
          type: 'research',
          status: 'active',
          progress: 60,
          priority: 'high',
          aiInsights: {
            recommendation: 'Consider adding quantum computing papers for better coverage.',
            confidence: 87,
            nextAction: 'Ingest 50 new research papers',
            estimatedCompletion: '1 week'
          },
          resources: { cpu: 8, memory: '32GB', storage: '500GB' },
          collaborators: ['Knowledge Agent', 'Research Bot'],
          lastActivity: '2 hours ago',
          metrics: { accuracy: 91, cost: 120 }
        },
        {
          id: '3',
          name: 'Multi-Modal Learning',
          type: 'experiment',
          status: 'planning',
          progress: 15,
          priority: 'medium',
          aiInsights: {
            recommendation: 'Wait for GPT-4V fine-tuning API availability.',
            confidence: 76,
            nextAction: 'Prepare training dataset',
            estimatedCompletion: '3 weeks'
          },
          resources: { gpu: 2, memory: '64GB' },
          collaborators: ['Vision Agent', 'ML Engineer'],
          lastActivity: '1 day ago'
        },
        {
          id: '4',
          name: 'Performance Optimization',
          type: 'deployment',
          status: 'completed',
          progress: 100,
          priority: 'low',
          aiInsights: {
            recommendation: 'Project completed successfully. 40% performance improvement achieved.',
            confidence: 100,
            nextAction: 'Monitor and maintain',
            estimatedCompletion: 'Complete'
          },
          resources: { cpu: 2, memory: '8GB' },
          collaborators: ['System Agent'],
          lastActivity: '3 days ago',
          metrics: { performance: 140, cost: 85 }
        }
      ];
      
      setProjects(mockProjects);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'research': return BrainIcon;
      case 'development': return CodeIcon;
      case 'experiment': return RocketIcon;
      case 'deployment': return DatabaseIcon;
      default: return RocketIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'orange';
      case 'completed': return 'blue';
      case 'planning': return 'purple';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={0}>
          <Text fontSize="xl" fontWeight="bold">
            Active Projects
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            AI-driven project insights and recommendations
          </Text>
        </VStack>
        <Button size="sm" leftIcon={<Icon as={RocketIcon} />}>
          New Project
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 2 }} spacing={6}>
        {projects.map((project, index) => (
          <MotionBox
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            bg={bg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={6}
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            css={{ transition: 'all 0.2s' }}
          >
            {/* Header */}
            <Flex justify="space-between" align="start" mb={4}>
              <HStack spacing={3}>
                <Box
                  p={2}
                  bg={`${getStatusColor(project.status)}.100`}
                  color={`${getStatusColor(project.status)}.500`}
                  borderRadius="lg"
                >
                  <Icon as={getProjectIcon(project.type)} boxSize={5} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold" fontSize="md">
                    {project.name}
                  </Text>
                  <HStack spacing={2}>
                    <Badge size="sm" colorScheme={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge size="sm" colorScheme={getPriorityColor(project.priority)} variant="outline">
                      {project.priority}
                    </Badge>
                  </HStack>
                </VStack>
              </HStack>

              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={MoreHorizontalIcon} />}
                  variant="ghost"
                  size="sm"
                />
                <MenuList>
                  <MenuItem icon={<Icon as={PlayIcon} boxSize={4} />}>
                    Resume
                  </MenuItem>
                  <MenuItem icon={<Icon as={PauseIcon} boxSize={4} />}>
                    Pause
                  </MenuItem>
                  <MenuItem icon={<Icon as={SettingsIcon} boxSize={4} />}>
                    Settings
                  </MenuItem>
                </MenuList>
              </Menu>
            </Flex>

            {/* Progress */}
            <Box mb={4}>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Progress</Text>
                <Text fontSize="sm" fontWeight="semibold">{project.progress}%</Text>
              </HStack>
              <Progress
                value={project.progress}
                colorScheme={getStatusColor(project.status)}
                borderRadius="full"
                size="sm"
              />
            </Box>

            {/* AI Insights */}
            <Box
              bg={cardBg}
              borderRadius="lg"
              p={4}
              mb={4}
              border="1px solid"
              borderColor="blue.100"
            >
              <HStack mb={2}>
                <Icon as={BrainIcon} color="blue.400" boxSize={4} />
                <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                  AI Recommendation
                </Text>
                <Badge size="xs" colorScheme="blue" variant="subtle">
                  {project.aiInsights.confidence}% confident
                </Badge>
              </HStack>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={2}>
                {project.aiInsights.recommendation}
              </Text>
              <HStack justify="space-between">
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Next: {project.aiInsights.nextAction}
                </Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  ETA: {project.aiInsights.estimatedCompletion}
                </Text>
              </HStack>
            </Box>

            {/* Resources */}
            <HStack justify="space-between" mb={4} fontSize="sm">
              <VStack spacing={1} align="start">
                <Text color={useSemanticToken('text.secondary')}>Resources</Text>
                <HStack spacing={3}>
                  {project.resources.gpu && (
                    <Text fontSize="xs">GPU: {project.resources.gpu}</Text>
                  )}
                  {project.resources.cpu && (
                    <Text fontSize="xs">CPU: {project.resources.cpu}</Text>
                  )}
                  {project.resources.memory && (
                    <Text fontSize="xs">RAM: {project.resources.memory}</Text>
                  )}
                </HStack>
              </VStack>

              <VStack spacing={1} align="end">
                <Text color={useSemanticToken('text.secondary')}>Team</Text>
                <AvatarGroup size="xs" max={3}>
                  {project.collaborators.map((collaborator, idx) => (
                    <Avatar key={idx} name={collaborator} />
                  ))}
                </AvatarGroup>
              </VStack>
            </HStack>

            {/* Metrics */}
            {project.metrics && (
              <HStack spacing={4} fontSize="sm">
                {project.metrics.accuracy && (
                  <HStack>
                    <Icon as={TrendingUpIcon} color="green.400" boxSize={4} />
                    <Text color={useSemanticToken('text.secondary')}>Accuracy: {project.metrics.accuracy}%</Text>
                  </HStack>
                )}
                {project.metrics.performance && (
                  <HStack>
                    <Icon as={RocketIcon} color="blue.400" boxSize={4} />
                    <Text color={useSemanticToken('text.secondary')}>Performance: {project.metrics.performance}%</Text>
                  </HStack>
                )}
              </HStack>
            )}

            {/* Footer */}
            <HStack justify="space-between" mt={4} pt={4} borderTop="1px" borderColor={borderColor}>
              <HStack spacing={1}>
                <Icon as={ClockIcon} color={useSemanticToken('text.tertiary')} boxSize={3} />
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {project.lastActivity}
                </Text>
              </HStack>
              
              {project.status === 'active' && (
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={() => onProjectAction?.(project.id, 'view')}
                >
                  View Details
                </Button>
              )}
            </HStack>
          </MotionBox>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default IntelligentProjectGrid;
