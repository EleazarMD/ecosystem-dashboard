/**
 * GooseMind Hints Panel
 * Configure GooseHints for context and behavior customization
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Icon,
  Switch,
  Tooltip,
  useToast,
  Code,
} from '@chakra-ui/react';
import { FiFileText, FiRefreshCw, FiUser, FiMail, FiCalendar, FiEdit3, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use HTTPS via Tailscale
const GOOSE_MIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface HintFile {
  id: string;
  name: string;
  category: string;
  description: string;
  lastModified: string;
  enabled: boolean;
}

export default function GooseMindHintsPanel() {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');
  const borderColor = useSemanticToken('border.subtle');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [hints, setHints] = useState<HintFile[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch hints from the GooseMind API
      const response = await fetch(`${GOOSE_MIND_API}/hints`);
      if (response.ok) {
        const data = await response.json();
        setHints(data.hints || []);
      } else {
        // Fallback to default hints structure
        setHints([
          {
            id: 'persona',
            name: 'Persona',
            category: 'core',
            description: 'Core identity and communication style for GooseMind',
            lastModified: new Date().toISOString(),
            enabled: true,
          },
          {
            id: 'email',
            name: 'Email Guidelines',
            category: 'domain',
            description: 'Email triage, response style, and draft guidelines',
            lastModified: new Date().toISOString(),
            enabled: true,
          },
          {
            id: 'calendar',
            name: 'Calendar Management',
            category: 'domain',
            description: 'Scheduling preferences and conflict resolution',
            lastModified: new Date().toISOString(),
            enabled: true,
          },
          {
            id: 'approval',
            name: 'Approval System',
            category: 'system',
            description: 'Human-in-the-loop approval requirements',
            lastModified: new Date().toISOString(),
            enabled: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching hints:', error);
      // Use fallback hints
      setHints([
        {
          id: 'persona',
          name: 'Persona',
          category: 'core',
          description: 'Core identity and communication style',
          lastModified: new Date().toISOString(),
          enabled: true,
        },
        {
          id: 'email',
          name: 'Email Guidelines',
          category: 'domain',
          description: 'Email triage and response guidelines',
          lastModified: new Date().toISOString(),
          enabled: true,
        },
        {
          id: 'calendar',
          name: 'Calendar Management',
          category: 'domain',
          description: 'Scheduling and conflict resolution',
          lastModified: new Date().toISOString(),
          enabled: true,
        },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'core': FiUser,
      'domain': FiFileText,
      'email': FiMail,
      'calendar': FiCalendar,
      'system': FiCheck,
    };
    return icons[category] || FiFileText;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'core': 'blue',
      'domain': 'green',
      'email': 'purple',
      'calendar': 'orange',
      'system': 'red',
    };
    return colors[category] || 'gray';
  };

  const toggleHint = async (hintId: string, enabled: boolean) => {
    try {
      setHints(prev => prev.map(h => 
        h.id === hintId ? { ...h, enabled } : h
      ));
      toast({ 
        title: `${hintId} hint ${enabled ? 'enabled' : 'disabled'}`, 
        status: 'success', 
        duration: 1500 
      });
    } catch (error) {
      toast({ title: 'Failed to toggle hint', status: 'error', duration: 2000 });
    }
  };

  if (loading) {
    return (
      <VStack py={8} spacing={3}>
        <Spinner size="md" color="green.400" />
        <Text fontSize="sm" color={textSecondary}>Loading hints...</Text>
      </VStack>
    );
  }

  return (
    <Box h="full" overflowY="auto" p={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiFileText} color="green.400" boxSize={4} />
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
              GooseHints
            </Text>
          </HStack>
          <Tooltip label="Refresh">
            <Button size="xs" variant="ghost" onClick={fetchData}>
              <FiRefreshCw />
            </Button>
          </Tooltip>
        </HStack>

        <Text fontSize="xs" color={textSecondary}>
          Hints provide context and guidelines for GooseMind's behavior
        </Text>

        {/* Hints List */}
        <Accordion allowMultiple>
          {hints.map((hint) => (
            <AccordionItem key={hint.id} border="none" mb={2}>
              <AccordionButton
                bg={bgSubtle}
                borderRadius="md"
                _hover={{ bg: 'whiteAlpha.200' }}
                px={3}
                py={2}
              >
                <HStack flex={1} spacing={2}>
                  <Icon 
                    as={getCategoryIcon(hint.category)} 
                    color={`${getCategoryColor(hint.category)}.400`} 
                    boxSize={4} 
                  />
                  <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                    {hint.name}
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Badge 
                    size="sm" 
                    colorScheme={hint.enabled ? getCategoryColor(hint.category) : 'gray'}
                    variant={hint.enabled ? 'solid' : 'outline'}
                  >
                    {hint.category}
                  </Badge>
                  <AccordionIcon />
                </HStack>
              </AccordionButton>
              <AccordionPanel pb={2} px={3}>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="xs" color={textSecondary}>
                    {hint.description}
                  </Text>
                  
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Text fontSize="xs" color={textSecondary}>Enabled</Text>
                      <Switch
                        size="sm"
                        isChecked={hint.enabled}
                        onChange={(e) => toggleHint(hint.id, e.target.checked)}
                        colorScheme="green"
                      />
                    </HStack>
                    <Tooltip label="Edit hint">
                      <Button size="xs" variant="ghost" leftIcon={<FiEdit3 />}>
                        Edit
                      </Button>
                    </Tooltip>
                  </HStack>

                  <Box>
                    <Text fontSize="xs" color={textSecondary} mb={1}>File:</Text>
                    <Code fontSize="xs" p={1} borderRadius="sm">
                      hints/{hint.id}.md
                    </Code>
                  </Box>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Quick Stats */}
        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between">
            <Text fontSize="xs" color={textSecondary}>Active Hints</Text>
            <Badge colorScheme="green">
              {hints.filter(h => h.enabled).length}/{hints.length}
            </Badge>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}
