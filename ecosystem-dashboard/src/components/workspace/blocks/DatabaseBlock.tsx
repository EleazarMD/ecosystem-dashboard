/**
 * DatabaseBlock - Renders inline databases within the block editor
 * Shows compact view with link to full database page
 */

import React, { useState, useEffect } from 'react';
import { Box, HStack, Text, Button, Badge } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { Database, Block } from '../../../types/workspace';
import { useRouter } from 'next/router';

// Import compact view components
import TableViewCompact from '../DatabaseViews/TableViewCompact';
import GalleryViewCompact from '../DatabaseViews/GalleryViewCompact';
import ListViewCompact from '../DatabaseViews/ListViewCompact';

interface DatabaseBlockProps {
  blockId: string;
  inline?: boolean;
}

export function DatabaseBlock({ blockId, inline = true }: DatabaseBlockProps) {
  const router = useRouter();
  const [database, setDatabase] = useState<Database | null>(null);
  const [pages, setPages] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabasePreview();
  }, [blockId]);

  const loadDatabasePreview = async () => {
    try {
      // Get database from block
      const response = await fetch(`/api/database/by-block/${blockId}`);
      if (response.ok) {
        const data = await response.json();
        setDatabase(data.database);
        setPages(data.pages.slice(0, inline ? 5 : 10)); // Limit preview rows
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading database preview:', error);
      setLoading(false);
    }
  };

  const openFullDatabase = () => {
    if (database) {
      router.push(`/workspace/database/${database.id}`);
    }
  };

  if (loading || !database) {
    return (
      <Box p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
        <Text color={useSemanticToken('text.secondary')}>Loading database...</Text>
      </Box>
    );
  }

  const defaultView = database.views[0] || { type: 'table', name: 'Table' };

  const renderCompactView = () => {
    switch (defaultView.type) {
      case 'gallery':
        return <GalleryViewCompact database={database} pages={pages} />;
      case 'table':
        return <TableViewCompact database={database} pages={pages} />;
      case 'list':
        return <ListViewCompact database={database} pages={pages} />;
      default:
        return <TableViewCompact database={database} pages={pages} />;
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      overflow="hidden"
      my={4}
      bg={useSemanticToken('surface.elevated')}
    >
      {/* Database Header */}
      <HStack
        justify="space-between"
        p={3}
        borderBottomWidth="1px"
        bg={useSemanticToken('surface.base')}
      >
        <HStack spacing={2}>
          <Text fontWeight="bold">
            {database.title?.[0]?.text?.content || 'Untitled Database'}
          </Text>
          <Badge colorScheme="blue">{defaultView.name}</Badge>
          <Badge>{pages.length} pages</Badge>
        </HStack>
        <Button
          size="sm"
          rightIcon={<ExternalLinkIcon />}
          onClick={openFullDatabase}
          variant="ghost"
        >
          Open
        </Button>
      </HStack>

      {/* Compact View */}
      <Box maxH={inline ? '300px' : '500px'} overflow="auto">
        {renderCompactView()}
      </Box>

      {/* Footer */}
      {inline && (
        <Box p={2} bg={useSemanticToken('surface.base')} textAlign="center">
          <Button
            size="xs"
            variant="link"
            onClick={openFullDatabase}
            colorScheme="blue"
          >
            View all {pages.length} pages →
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default DatabaseBlock;
