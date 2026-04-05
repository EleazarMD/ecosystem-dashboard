import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  SimpleGrid,
  Stat,
  StatNumber,
  StatLabel,
  Flex,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FiArrowRight, FiDatabase, FiLink2, FiBox } from 'react-icons/fi';
import axios from 'axios';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface KGStats {
  nodes: number;
  edges: number;
  components: number;
}

const KnowledgeGraphPreviewWidget: React.FC = () => {
  const [stats, setStats] = useState<KGStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const headingColor = useSemanticToken('text.primary');
  const textColor = useSemanticToken('text.secondary');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with real API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStats({
          nodes: 1247,
          edges: 3891,
          components: 23
        });
        setError(null);
      } catch (err) {
        setError('Failed to load Knowledge Graph stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);


  const renderContent = () => {
    if (loading) {
      return (
        <Flex justify="center" align="center" h="100%">
          <Spinner />
        </Flex>
      );
    }

    if (error || !stats) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error || 'Could not load data.'}
        </Alert>
      );
    }

    return (
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mt={2}>
        <Stat>
          <HStack>
            <Icon as={FiDatabase} boxSize={6} color="blue.400" />
            <Box>
              <StatLabel color={textColor}>Nodes</StatLabel>
              <StatNumber color={headingColor}>{stats.nodes}</StatNumber>
            </Box>
          </HStack>
        </Stat>
        <Stat>
          <HStack>
            <Icon as={FiLink2} boxSize={6} color="green.400" />
            <Box>
              <StatLabel color={textColor}>Edges</StatLabel>
              <StatNumber color={headingColor}>{stats.edges}</StatNumber>
            </Box>
          </HStack>
        </Stat>
        <Stat>
          <HStack>
            <Icon as={FiBox} boxSize={6} color="purple.400" />
            <Box>
              <StatLabel color={textColor}>Components</StatLabel>
              <StatNumber color={headingColor}>{stats.components}</StatNumber>
            </Box>
          </HStack>
        </Stat>
      </SimpleGrid>
    );
  };

  return (
    <Box h="100%">
      {renderContent()}
    </Box>
  );
};

export default KnowledgeGraphPreviewWidget;
