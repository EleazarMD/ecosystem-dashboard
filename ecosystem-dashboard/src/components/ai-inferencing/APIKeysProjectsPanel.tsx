import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Project {
  project_id: string;
  name: string;
  description: string;
  service_count: string;
  key_count: string;
}

interface APIKeysProjectsPanelProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

export default function APIKeysProjectsPanel({
  projects,
  selectedProject,
  onSelectProject,
  onNewProject,
}: APIKeysProjectsPanelProps) {
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surface');
  const selectedBorder = useSemanticToken('interactive.primary');
  const borderColor = useSemanticToken('border.default');

  return (
    <VStack spacing={0} align="stretch" h="full">
      {/* New Project Button */}
      <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
        <Button
          size="sm"
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={onNewProject}
          width="full"
        >
          New Project
        </Button>
      </Box>

      {/* Projects List */}
      <VStack spacing={1} align="stretch" p={2} flex={1} overflowY="auto">
        {projects.map((project) => (
          <Box
            key={project.project_id}
            p={3}
            borderRadius="lg"
            cursor="pointer"
            bg={selectedProject?.project_id === project.project_id ? selectedBg : 'transparent'}
            borderWidth="1px"
            borderColor={selectedProject?.project_id === project.project_id ? selectedBorder : 'transparent'}
            _hover={{ bg: hoverBg }}
            onClick={() => onSelectProject(project)}
            transition="all 0.15s ease"
          >
            <VStack align="start" spacing={1}>
              <Text fontWeight="semibold" fontSize="sm">
                {project.name}
              </Text>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                {project.description}
              </Text>
              <HStack spacing={2} mt={1}>
                <Badge colorScheme="blue" fontSize="xs" borderRadius="full">
                  {project.service_count} services
                </Badge>
                <Badge colorScheme="green" fontSize="xs" borderRadius="full">
                  {project.key_count} keys
                </Badge>
              </HStack>
            </VStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
