import React, { useState, useMemo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  Divider,
  Card,
  CardBody,
  Badge,
  IconButton,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { FiRefreshCcw, FiSettings, FiMic, FiSearch } from 'react-icons/fi';
import { Agent } from './types';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  classifyAgentProject,
  getUniqueProjects,
  filterAgentsByProject,
  getProjectStats
} from '../../utils/agentProjects';

interface AgentListProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentSelect: (agent: Agent) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onShowSettings?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'inactive': return 'gray';
    case 'error': return 'red';
    default: return 'gray';
  }
};

const getSourceColor = (source?: string) => {
  switch (source) {
    case 'goose': return 'purple';
    case 'adk': return 'blue';
    case 'self': return 'green';
    case 'mcp': return 'cyan';
    default: return 'gray';
  }
};

const getSourceLabel = (source?: string) => {
  switch (source) {
    case 'goose': return '🪿 Goose';
    case 'adk': return '🤖 ADK';
    case 'self': return '⚡ Self';
    case 'mcp': return '🔌 MCP';
    default: return 'Unknown';
  }
};

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  isLoading,
  onRefresh,
  onShowSettings,
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(true);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const selectedBg = useSemanticToken('interactive.surfaceHover');
  const selectedBorder = useSemanticToken('interactive.primary');
  const hoverBg = useSemanticToken('surface.hover');

  // Memoized computations for filtering and stats
  const uniqueProjects = useMemo(() => getUniqueProjects(agents), [agents]);
  const projectStats = useMemo(() => getProjectStats(agents), [agents]);

  const filteredAgents = useMemo(() => {
    let filtered = filterAgentsByProject(agents, selectedProject);

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(search) ||
        agent.type.toLowerCase().includes(search) ||
        agent.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [agents, selectedProject, searchTerm]);

  const handleSettingsClick = () => {
    if (selectedAgent && onShowSettings) {
      onShowSettings();
      console.log('Opening settings for:', selectedAgent.name);
    }
  };

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Default refresh behavior - reload the page or fetch agents
      window.location.reload();
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="full" minH={0} overflow="hidden">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">
          Available Agents ({filteredAgents.length})
        </Text>
        <HStack spacing={2}>
          {selectedAgent && (
            <>
              {selectedAgent.capabilities?.includes('voice-interaction') && (
                <Tooltip label="Voice interaction">
                  <IconButton
                    aria-label="Voice interaction"
                    icon={<FiMic />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => {
                      console.log('Voice interaction for:', selectedAgent.name);
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip label="Agent settings">
                <IconButton
                  aria-label="Settings"
                  icon={<FiSettings />}
                  size="sm"
                  variant="ghost"
                  onClick={handleSettingsClick}
                  isDisabled={!onShowSettings}
                />
              </Tooltip>
            </>
          )}
          <Tooltip label="Refresh agents">
            <IconButton
              aria-label="Refresh agents"
              icon={<FiRefreshCcw />}
              size="sm"
              variant="ghost"
              onClick={handleRefreshClick}
              isLoading={isLoading}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {/* Search and Filter Controls */}
      <VStack spacing={3} align="stretch">
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FiSearch color={useSemanticToken('text.tertiary')} />
          </InputLeftElement>
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="all">All Projects ({agents.length})</option>
          {uniqueProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.icon} {project.name} ({projectStats[project.id]?.total || 0})
            </option>
          ))}
        </Select>
      </VStack>

      {/* Project Statistics */}
      {showStats && uniqueProjects.length > 1 && (
        <Box p={3} bg={bg} borderRadius="md" border="1px" borderColor={borderColor}>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="bold">Project Overview</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} cursor="pointer" onClick={() => setShowStats(!showStats)}>
              Hide
            </Text>
          </HStack>
          <SimpleGrid columns={2} spacing={2}>
            {uniqueProjects.slice(0, 4).map(project => {
              const stats = projectStats[project.id] || { total: 0, active: 0, inactive: 0 };
              return (
                <Stat key={project.id} size="sm">
                  <StatLabel fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {project.icon} {project.name}
                  </StatLabel>
                  <StatNumber fontSize="sm">{stats.total}</StatNumber>
                  <StatHelpText fontSize="xs" mb={0}>
                    {stats.active} active, {stats.inactive} inactive
                  </StatHelpText>
                </Stat>
              );
            })}
          </SimpleGrid>
        </Box>
      )}

      <Divider />

      {/* Enhanced Agent Cards */}
      <VStack spacing={2} align="stretch" flex="1" overflowY="auto" minH={0}>
        {filteredAgents.map((agent) => {
          const project = classifyAgentProject(agent);
          const isSelected = selectedAgent?.id === agent.id;

          return (
            <Card
              key={agent.id}
              cursor="pointer"
              bg={isSelected ? selectedBg : bg}
              borderColor={isSelected ? selectedBorder : borderColor}
              borderWidth="1px"
              borderLeftWidth="4px"
              borderLeftColor={project.color}
              onClick={() => onAgentSelect(agent)}
              _hover={{
                bg: isSelected ? selectedBg : hoverBg,
                transform: 'translateY(-1px)',
                shadow: 'md'
              }}
              transition="all 0.2s"
            >
              <CardBody p={3}>
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="bold" color={project.color}>
                        {project.icon}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                        {agent.name}
                      </Text>
                    </HStack>
                    <Badge colorScheme={getStatusColor(agent.status)} size="sm">
                      {agent.status}
                    </Badge>
                  </HStack>

                  <HStack spacing={2} wrap="wrap">
                    {agent.source && (
                      <Badge colorScheme={getSourceColor(agent.source)} variant="solid" size="xs">
                        {getSourceLabel(agent.source)}
                      </Badge>
                    )}
                    <Badge colorScheme={project.badgeColor} variant="subtle" size="xs">
                      {project.name}
                    </Badge>
                    <Badge variant="outline" size="xs">
                      {agent.type}
                    </Badge>
                    {agent.version && (
                      <Badge colorScheme="gray" variant="subtle" size="xs">
                        v{agent.version}
                      </Badge>
                    )}
                  </HStack>

                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                    {agent.description || 'No description available'}
                  </Text>

                  {agent.capabilities && (
                    <HStack spacing={1} wrap="wrap">
                      {(() => {
                        const caps = Array.isArray(agent.capabilities) 
                          ? agent.capabilities 
                          : (typeof agent.capabilities === 'object' 
                              ? Object.keys(agent.capabilities) 
                              : []);
                        if (caps.length === 0) return null;
                        return (
                          <>
                            {caps.slice(0, 3).map((capability, idx) => (
                              <Badge key={idx} size="xs" variant="subtle" colorScheme="purple">
                                {String(capability)}
                              </Badge>
                            ))}
                            {caps.length > 3 && (
                              <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                                +{caps.length - 3} more
                              </Text>
                            )}
                          </>
                        );
                      })()}
                    </HStack>
                  )}
                </VStack>
              </CardBody>
            </Card>
          );
        })}

        {filteredAgents.length === 0 && (
          <Box textAlign="center" py={4} color={useSemanticToken('text.secondary')}>
            <Text fontSize="sm">
              {searchTerm ? 'No agents match your search' : 'No agents found'}
            </Text>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};
