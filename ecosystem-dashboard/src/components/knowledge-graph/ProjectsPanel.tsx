import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
import { FiDatabase, FiFolder, FiRefreshCw } from 'react-icons/fi';
import RetractablePanel from '../layout/RetractablePanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Project {
  project: string;
  description?: string;
  document_count: number;
  file_count: number;
}

interface ProjectsPanelProps {
  selectedProject?: string;
  onSelectProject: (projectName: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: () => void;
  onWidthChange?: (width: number) => void;
}

export default function ProjectsPanel({
  selectedProject,
  onSelectProject,
  isCollapsed = false,
  onToggleCollapse,
  onWidthChange,
}: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [width, setWidth] = useState(380);

  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const iconActiveColor = 'blue.500';
  const iconInactiveColor = useSemanticToken('text.tertiary');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setProjects([]); // Reset to empty while loading

    try {
      // Use Documentation Agent (port 41243) to list indexed projects
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('http://localhost:41243/a2a/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'list_projects',
          payload: {},
          requestId: `list-projects-${Date.now()}`,
          sender: 'dashboard-ui'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.result?.success && data.result.projects) {
          setProjects(data.result.projects);
          setLoading(false);
          return; // Success - exit early
        }
      }
    } catch (error) {
      console.log('Documentation Agent not available, trying KG API fallback...');
    }

    // Fallback: Try Knowledge Graph API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const kgResponse = await fetch('http://localhost:8765/api/projects', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (kgResponse.ok) {
        const kgData = await kgResponse.json();
        setProjects(kgData.projects || []);
      }
    } catch (error) {
      console.log('Knowledge Graph API not available');
    }

    // Both failed - projects remain empty
    console.log('No Knowledge Graph services available. Start services with: cd /Users/eleazar/Projects/AIHomelab/core/knowledge-graph && ./scripts/start-kg-complete.sh');
    setLoading(false);
  };

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  const filteredProjects = projects.filter(p =>
    p.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const headerActions = (
    <Tooltip
      label="Refresh"
      bg={useSemanticToken('surface.popover')}
      color={useSemanticToken('text.primary')}
    >
      <IconButton
        aria-label="Refresh"
        icon={<FiRefreshCw />}
        size="sm"
        variant="solid"
        bg={useSemanticToken('surface.raised')}
        color={useSemanticToken('text.primary')}
        borderColor={useSemanticToken('border.subtle')}
        borderWidth="1px"
        _hover={{ bg: useSemanticToken('surface.hover') }}
        onClick={loadProjects}
        isLoading={loading}
      />
    </Tooltip>
  );

  return (
    <RetractablePanel
      title="Projects"
      icon={FiDatabase}
      iconColor={iconActiveColor}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      width={width}
      onWidthChange={handleWidthChange}
      side="left"
      minWidth={300}
      maxWidth={600}
      headerActions={headerActions}
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Search */}
        <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color={useSemanticToken('text.tertiary')} />
            </InputLeftElement>
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
            />
          </InputGroup>
          <HStack mt={2} justify="space-between">
            <Text fontSize="xs" color={mutedColor}>
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </Text>
            <Badge colorScheme="blue" fontSize="10px">
              {projects.length} total
            </Badge>
          </HStack>
        </Box>

        {/* Project List */}
        <VStack
          flex={1}
          spacing={0}
          align="stretch"
          overflowY="auto"
        >
          {loading ? (
            <Box p={8} textAlign="center">
              <Spinner size="md" color="blue.500" />
              <Text mt={2} fontSize="sm" color={mutedColor}>
                Loading projects...
              </Text>
            </Box>
          ) : filteredProjects.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text color={mutedColor} fontSize="sm">
                {searchQuery ? 'No projects found' : 'No projects indexed yet'}
              </Text>
              <Text mt={2} fontSize="xs" color={mutedColor}>
                {!searchQuery && 'Start indexing documentation to see projects here'}
              </Text>
            </Box>
          ) : (
            filteredProjects.map((project) => (
              <Box
                key={project.project}
                px={4}
                py={3}
                cursor="pointer"
                bg={selectedProject === project.project ? selectedBg : 'transparent'}
                _hover={{ bg: selectedProject === project.project ? selectedBg : hoverBg }}
                borderBottom="1px solid"
                borderColor={borderColor}
                onClick={() => onSelectProject(project.project)}
                transition="all 0.2s"
              >
                <HStack spacing={3} align="start">
                  <Box pt={1}>
                    <FiFolder
                      size={16}
                      color={selectedProject === project.project
                        ? iconActiveColor
                        : iconInactiveColor
                      }
                    />
                  </Box>
                  <VStack align="start" spacing={1} flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight={selectedProject === project.project ? 'semibold' : 'medium'}
                      color={textColor}
                      noOfLines={1}
                    >
                      {project.project}
                    </Text>
                    {project.description && (
                      <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                        {project.description}
                      </Text>
                    )}
                    <HStack spacing={2}>
                      <Badge size="sm" colorScheme="blue" fontSize="10px">
                        {project.document_count} docs
                      </Badge>
                      <Badge size="sm" colorScheme="green" fontSize="10px">
                        {project.file_count} files
                      </Badge>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))
          )}
        </VStack>

        {/* Footer Actions */}
        <Box px={4} py={3} borderTop="1px solid" borderColor={borderColor}>
          <Button
            size="sm"
            leftIcon={<AddIcon />}
            variant="ghost"
            width="full"
            justifyContent="flex-start"
          >
            Index New Project
          </Button>
        </Box>
      </VStack>
    </RetractablePanel>
  );
}
