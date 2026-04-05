import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  IconButton,
  Divider,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import { FiRefreshCcw } from 'react-icons/fi';
import { Agent } from '../../hooks/useAgentManagement';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AgentSidebarProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  onAgentSelect: (agent: Agent) => void;
  onRefresh: () => void;
  getStatusColor: (status: Agent['status']) => string;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  selectedAgent,
  isLoading,
  error,
  onAgentSelect,
  onRefresh,
  getStatusColor,
}) => {
  const sidebarBg = useSemanticToken('surface.base');
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  if (isLoading) {
    return (
      <VStack spacing={2} align="stretch" h="full" p={2} bg={sidebarBg}>
        <HStack justify="center">
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="xs">Loading agents...</Text>
        </HStack>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack spacing={2} align="stretch" h="full" p={2} bg={sidebarBg}>
        <Alert status="error" size="sm">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">Error!</AlertTitle>
            <AlertDescription fontSize="xs">{error}</AlertDescription>
          </Box>
        </Alert>
      </VStack>
    );
  }

  return (
    <VStack spacing={2} align="stretch" h="full" p={2} bg={sidebarBg}>
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="bold">Available Agents</Text>
        <Tooltip label="Refresh agents">
          <IconButton
            aria-label="Refresh agents"
            icon={<FiRefreshCcw />}
            size="sm"
            variant="ghost"
            onClick={onRefresh}
          />
        </Tooltip>
      </HStack>

      <Select
        placeholder="Select a project"
        value={selectedAgent?.type || ''}
        onChange={(e) => {
          const projectType = e.target.value;
          const agent = agents.find(a => a.type === projectType);
          if (agent) {
            onAgentSelect(agent);
          }
        }}
        bg={useSemanticToken('surface.elevated')}
      >
        {Array.from(new Set(agents.map(a => a.type))).map((projectType) => (
          <option key={projectType} value={projectType}>
            {projectType.charAt(0).toUpperCase() + projectType.slice(1).replace('-', ' ')} Project
          </option>
        ))}
      </Select>

      <Divider />

      <VStack 
        spacing={1} 
        align="stretch" 
        flex={1} 
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0, 0, 0, 0.3)',
          },
        }}
      >
        {agents.map((agent) => (
          <Card
            key={agent.id}
            size="sm"
            cursor="pointer"
            onClick={() => onAgentSelect(agent)}
            bg={selectedAgent?.id === agent.id ? 'blue.50' : bg}
            borderColor={selectedAgent?.id === agent.id ? 'blue.300' : borderColor}
            borderWidth={selectedAgent?.id === agent.id ? '2px' : '1px'}
            _hover={{ borderColor: 'blue.200' }}
          >
            <CardBody py={2} px={2}>
              <VStack spacing={1} align="start">
                <HStack justify="space-between" w="full">
                  <Text fontSize="xs" fontWeight="medium" noOfLines={1} lineHeight="1.2">
                    {agent.name}
                  </Text>
                  <Badge size="sm" colorScheme={getStatusColor(agent.status)} fontSize="2xs">
                    {agent.status}
                  </Badge>
                </HStack>
                <Text fontSize="2xs" color={useSemanticToken('text.secondary')} noOfLines={1} lineHeight="1.2">
                  {agent.type}
                </Text>
                {agent.port && (
                  <Text fontSize="2xs" color={useSemanticToken('text.tertiary')} lineHeight="1.2">
                    Port: {agent.port}
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </VStack>

      {agents.length === 0 && (
        <Alert status="info" size="sm">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">No agents found</AlertTitle>
            <AlertDescription fontSize="xs">
              Check that ADK agents are running
            </AlertDescription>
          </Box>
        </Alert>
      )}
    </VStack>
  );
};
