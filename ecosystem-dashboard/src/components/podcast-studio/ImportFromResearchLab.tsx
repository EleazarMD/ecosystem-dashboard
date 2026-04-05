import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  Badge,
  Icon,
  Checkbox,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { FiCheck, FiClock, FiPackage } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchSession {
  session_id: string;
  question: string;
  model: string;
  status: string;
  report?: string;
  created_at: string;
  completed_at?: string;
  actual_cost?: number;
}

interface ImportFromResearchLabProps {
  projectId: string;
  onImportComplete: () => void;
  onSessionSelect?: (sessions: ResearchSession[]) => void;
  onCancel?: () => void;
}

export default function ImportFromResearchLab({
  projectId,
  onImportComplete,
  onSessionSelect,
  onCancel,
}: ImportFromResearchLabProps) {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const selectedBg = useSemanticToken('surface.highlight');

  useEffect(() => {
    loadCompletedSessions();
  }, []);

  const loadCompletedSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/research-lab/sessions');
      if (response.ok) {
        const data = await response.json();
        // Filter only completed sessions with reports
        const completed = data.sessions?.filter(
          (s: ResearchSession) => s.status === 'completed' && s.report
        ) || [];
        setSessions(completed);
      } else {
        console.error('Failed to fetch sessions:', response.status);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
      toast({
        title: 'Failed to load research sessions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      
      // Notify parent of selected sessions
      if (onSessionSelect) {
        const selectedSessionsArray = sessions.filter(s => newSet.has(s.session_id));
        onSessionSelect(selectedSessionsArray);
      }
      
      return newSet;
    });
  };

  const handleImport = async () => {
    if (selectedSessions.size === 0) {
      toast({
        title: 'No sessions selected',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setIsImporting(true);
    try {
      // Auto-create project if needed (temp ID or invalid UUID)
      let actualProjectId = projectId;
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
      
      if (!isValidUUID || projectId === 'temp-import') {
        // Create a new project
        const firstSession = sessions.find(s => s.session_id === Array.from(selectedSessions)[0]);
        const projectTitle = selectedSessions.size === 1 
          ? firstSession?.question || 'Imported Research'
          : `AI Research Import (${selectedSessions.size} sessions)`;
        
        const createResponse = await fetch('/api/podcast-studio/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: projectTitle,
            description: `Auto-imported from AI Research Lab`,
            status: 'draft',
            script_length: 'deep-dive',
            script_tone: 'conversational',
            script_audience: 'general',
            script_style: 'co-host',
            include_stories: true,
            include_examples: true,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          console.error('Project creation failed:', errorData);
          throw new Error(`Failed to create project: ${createResponse.status} - ${errorData}`);
        }

        const newProject = await createResponse.json();
        actualProjectId = newProject.id;
        console.log('✅ Project created:', actualProjectId, projectTitle);
        
        toast({
          title: '📁 Project created',
          description: `Created "${projectTitle}"`,
          status: 'info',
          duration: 2000,
        });
      }

      // Import each selected session
      const promises = Array.from(selectedSessions).map(sessionId => {
        const session = sessions.find(s => s.session_id === sessionId);
        return fetch('/api/research-lab/export-to-podcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            projectId: actualProjectId,
            title: session?.question,
          }),
        });
      });

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length === 0) {
        toast({
          title: `✅ Imported ${selectedSessions.size} research session(s)`,
          description: actualProjectId !== projectId 
            ? '🎙️ New project created - redirecting to Podcast Studio...'
            : 'Added to current project',
          status: 'success',
          duration: 4000,
        });
        setSelectedSessions(new Set());
        
        // Redirect to the project if a new one was created
        if (actualProjectId !== projectId) {
          setTimeout(() => {
            window.location.href = `/podcast-studio?project=${actualProjectId}`;
          }, 1500);
        } else {
          onImportComplete();
        }
      } else {
        toast({
          title: `Imported ${results.length - failed.length} of ${results.length} sessions`,
          description: `${failed.length} failed`,
          status: 'warning',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import research sessions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getModelBadge = (model: string) => {
    if (model.includes('o1-pro')) return { label: 'O1 Pro', color: 'purple' };
    if (model.includes('gpt-5')) return { label: 'GPT-5 Pro', color: 'blue' };
    if (model.includes('o3')) return { label: 'o3', color: 'green' };
    return { label: 'o4-mini', color: 'gray' };
  };

  if (isLoading) {
    return (
      <VStack py={8} spacing={3}>
        <Spinner size="lg" color="purple.500" />
        <Text fontSize="sm" color={mutedColor}>
          Loading research sessions...
        </Text>
      </VStack>
    );
  }

  if (sessions.length === 0) {
    return (
      <VStack py={8} spacing={3}>
        <Icon as={FiPackage} boxSize={12} color={mutedColor} />
        <Text fontSize="sm" color={mutedColor} textAlign="center">
          No completed research sessions found
        </Text>
        <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="300px">
          Create research in AI Research Lab first, then import here
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between" pb={2}>
        <HStack spacing={2}>
          <Text fontSize="xs" fontWeight="600" color={mutedColor}>
            RESEARCH SESSIONS
          </Text>
          {selectedSessions.size > 0 && (
            <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5} borderRadius="full">
              {selectedSessions.size} selected
            </Badge>
          )}
        </HStack>
        <HStack spacing={2}>
          {onCancel && (
            <Button
              size="xs"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            size="xs"
            colorScheme="purple"
            onClick={handleImport}
            isLoading={isImporting}
            isDisabled={selectedSessions.size === 0}
            leftIcon={<Icon as={FiPackage} />}
            fontWeight="600"
          >
            Import {selectedSessions.size > 0 ? `(${selectedSessions.size})` : ''}
          </Button>
        </HStack>
      </HStack>

      <Divider />

      <VStack spacing={1.5} align="stretch" maxH="400px" overflowY="auto" pr={1}>
        {sessions.map(session => {
          const modelBadge = getModelBadge(session.model);
          const isSelected = selectedSessions.has(session.session_id);
          
          return (
            <Box
              key={session.session_id}
              p={2.5}
              bg={isSelected ? selectedBg : 'transparent'}
              borderWidth="1px"
              borderColor={isSelected ? 'purple.500' : borderColor}
              borderRadius="lg"
              cursor="pointer"
              transition="all 0.15s"
              _hover={{ 
                bg: hoverBg,
                borderColor: isSelected ? 'purple.500' : 'purple.300',
                transform: 'translateX(2px)'
              }}
              onClick={() => toggleSession(session.session_id)}
            >
              <HStack spacing={2.5} align="start">
                <Checkbox
                  isChecked={isSelected}
                  onChange={() => toggleSession(session.session_id)}
                  colorScheme="purple"
                  size="sm"
                  mt={0.5}
                />
                
                <VStack align="start" spacing={1} flex={1} minW={0}>
                  <Text 
                    fontSize="sm" 
                    fontWeight="600" 
                    color={textColor} 
                    noOfLines={2}
                    lineHeight="1.4"
                    wordBreak="break-word"
                  >
                    {session.question}
                  </Text>
                  
                  <HStack spacing={1.5} fontSize="2xs" color={mutedColor} flexWrap="wrap">
                    <Badge 
                      colorScheme={modelBadge.color} 
                      fontSize="2xs"
                      px={1.5}
                      py={0.5}
                      borderRadius="md"
                      fontWeight="600"
                    >
                      {modelBadge.label}
                    </Badge>
                    <Text>•</Text>
                    <Text fontWeight="500">{formatDate(session.completed_at || session.created_at)}</Text>
                    {session.actual_cost && (
                      <>
                        <Text>•</Text>
                        <Text fontWeight="600">${Number(session.actual_cost).toFixed(2)}</Text>
                      </>
                    )}
                  </HStack>
                </VStack>
                
                {isSelected && (
                  <Icon as={FiCheck} color="purple.500" boxSize={3.5} flexShrink={0} />
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </VStack>
  );
}
