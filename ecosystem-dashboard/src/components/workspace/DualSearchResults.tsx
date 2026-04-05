/**
 * Dual-Search Results Component
 * Displays search results from both workspace and web
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Link,
  Badge,
  Icon,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiFileText, FiGlobe, FiExternalLink, FiClock, FiUser } from 'react-icons/fi';
import type { Citation } from '../../../pages/api/workspace-ai/search-dual';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DualSearchResultsProps {
  citations: Citation[];
  metadata: {
    workspaceResultCount: number;
    webResultCount: number;
    totalSources: number;
    executionTimeMs: number;
  };
}

export function DualSearchResults({ citations, metadata }: DualSearchResultsProps) {
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.base');

  const workspaceSources = citations.filter(c => c.type === 'workspace');
  const webSources = citations.filter(c => c.type === 'web');

  return (
    <Box mt={4} p={4} borderWidth={1} borderRadius="lg" borderColor={borderColor}>
      <HStack justify="space-between" mb={3}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Search Results
          </Text>
          <Badge colorScheme="gray" fontSize="xs">
            {metadata.totalSources} sources
          </Badge>
          <Badge colorScheme="blue" fontSize="xs">
            {metadata.executionTimeMs}ms
          </Badge>
        </HStack>
      </HStack>

      <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
        <TabList>
          <Tab>
            <HStack spacing={2}>
              <Text>All</Text>
              <Badge colorScheme="gray">{metadata.totalSources}</Badge>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiFileText} />
              <Text>Workspace</Text>
              <Badge colorScheme="blue">{metadata.workspaceResultCount}</Badge>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiGlobe} />
              <Text>Web</Text>
              <Badge colorScheme="green">{metadata.webResultCount}</Badge>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels mt={3}>
          {/* All Results */}
          <TabPanel p={0}>
            <VStack align="stretch" spacing={2}>
              {citations.map((citation) => (
                <CitationCard key={citation.id} citation={citation} />
              ))}
            </VStack>
          </TabPanel>

          {/* Workspace Only */}
          <TabPanel p={0}>
            <VStack align="stretch" spacing={2}>
              {workspaceSources.length > 0 ? (
                workspaceSources.map((citation) => (
                  <CitationCard key={citation.id} citation={citation} />
                ))
              ) : (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
                  No workspace results found
                </Text>
              )}
            </VStack>
          </TabPanel>

          {/* Web Only */}
          <TabPanel p={0}>
            <VStack align="stretch" spacing={2}>
              {webSources.length > 0 ? (
                webSources.map((citation) => (
                  <CitationCard key={citation.id} citation={citation} />
                ))
              ) : (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
                  No web results found
                </Text>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

function CitationCard({ citation }: { citation: Citation }) {
  const router = useRouter();
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.base');
  const isWorkspace = citation.type === 'workspace';

  return (
    <Link
      href={citation.url}
      isExternal={!isWorkspace}
      _hover={{ textDecoration: 'none' }}
      onClick={(e) => {
        if (isWorkspace) {
          e.preventDefault();
          // Extract page ID from URL like /workspace/page/xxx or /workspace?page=xxx
          const pageIdMatch = citation.url.match(/\/workspace\/page\/([^\/\?]+)/) || 
                              citation.url.match(/[?&]page=([^&]+)/);
          if (pageIdMatch) {
            router.push(`/workspace?page=${pageIdMatch[1]}`, undefined, { shallow: true });
          } else {
            router.push(citation.url, undefined, { shallow: true });
          }
        }
      }}
    >
      <Box
        p={3}
        borderWidth={1}
        borderRadius="md"
        borderColor={borderColor}
        _hover={{ bg: hoverBg, borderColor: isWorkspace ? 'blue.400' : 'green.400' }}
        transition="all 0.2s"
      >
        <HStack justify="space-between" align="start" spacing={3}>
          <HStack align="start" spacing={2} flex={1}>
            <Icon
              as={isWorkspace ? FiFileText : FiGlobe}
              color={isWorkspace ? 'blue.500' : 'green.500'}
              mt={0.5}
            />

            <VStack align="start" spacing={1} flex={1}>
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {citation.title}
                </Text>
                <Badge
                  colorScheme={isWorkspace ? 'blue' : 'green'}
                  fontSize="xs"
                >
                  {isWorkspace ? 'Workspace' : citation.domain}
                </Badge>
              </HStack>

              <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                {citation.snippet}
              </Text>
            </VStack>
          </HStack>

          {!isWorkspace && (
            <Icon as={FiExternalLink} color={useSemanticToken('text.tertiary')} boxSize={3} />
          )}
        </HStack>
      </Box>
    </Link>
  );
}
