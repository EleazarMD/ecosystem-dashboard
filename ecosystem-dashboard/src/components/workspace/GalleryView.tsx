/**
 * GalleryView - Notion-style gallery view
 * Card-based layout for database entries with cover images
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Image,
  Badge,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { FiCalendar, FiFileText } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GalleryEntry {
  id: string;
  title: string;
  cover?: string;
  date?: string;
  tags?: string[];
  status?: string;
}

interface GalleryViewProps {
  databaseId: string;
  onEntryClick: (entryId: string) => void;
  cardSize?: 'small' | 'medium' | 'large';
}

export function GalleryView({ 
  databaseId, 
  onEntryClick,
  cardSize = 'medium'
}: GalleryViewProps) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const placeholderBg = useSemanticToken('surface.base');

  useEffect(() => {
    loadEntries();
  }, [databaseId]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks/${databaseId}`);
      
      if (response.ok) {
        const data = await response.json();
        const galleryEntries: GalleryEntry[] = (data.children || []).map((entry: any) => ({
          id: entry.id,
          title: entry.properties?.Name?.[0]?.text?.content || 'Untitled',
          cover: entry.properties?.cover?.url,
          date: entry.properties?.Date?.date?.start,
          tags: entry.properties?.Tags?.multi_select?.map((t: any) => t.name) || [],
          status: entry.properties?.Status?.select?.name
        }));
        
        setEntries(galleryEntries);
      }
    } catch (error) {
      console.error('Failed to load gallery entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardWidth = () => {
    switch (cardSize) {
      case 'small': return '200px';
      case 'large': return '350px';
      default: return '260px';
    }
  };

  if (loading) {
    return (
      <VStack py={10} spacing={4}>
        <Spinner size="lg" />
        <Text color={mutedColor}>Loading gallery...</Text>
      </VStack>
    );
  }

  if (entries.length === 0) {
    return (
      <VStack py={10} spacing={4}>
        <Icon as={FiFileText} boxSize={12} color={mutedColor} />
        <Text color={mutedColor}>No entries to display</Text>
      </VStack>
    );
  }

  return (
    <Box px={8}>
      <Grid
        templateColumns={`repeat(auto-fill, minmax(${getCardWidth()}, 1fr))`}
        gap={4}
      >
        {entries.map((entry) => (
          <Box
            key={entry.id}
            bg={bgColor}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{ 
              borderColor: 'blue.400',
              transform: 'translateY(-2px)',
              boxShadow: 'md'
            }}
            onClick={() => onEntryClick(entry.id)}
          >
            {/* Cover Image */}
            {entry.cover ? (
              <Image
                src={entry.cover}
                alt={entry.title}
                height="140px"
                width="100%"
                objectFit="cover"
              />
            ) : (
              <Box
                height="140px"
                width="100%"
                bg={placeholderBg}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiFileText} boxSize={8} color={mutedColor} />
              </Box>
            )}
            
            {/* Card Content */}
            <VStack align="stretch" p={3} spacing={2}>
              <Text fontWeight="600" fontSize="sm" noOfLines={2}>
                {entry.title}
              </Text>
              
              {entry.date && (
                <HStack spacing={1} fontSize="xs" color={mutedColor}>
                  <Icon as={FiCalendar} boxSize={3} />
                  <Text>{new Date(entry.date).toLocaleDateString()}</Text>
                </HStack>
              )}
              
              {entry.tags && entry.tags.length > 0 && (
                <HStack spacing={1} flexWrap="wrap">
                  {entry.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} colorScheme="blue" fontSize="xs">
                      {tag}
                    </Badge>
                  ))}
                  {entry.tags.length > 3 && (
                    <Text fontSize="xs" color={mutedColor}>
                      +{entry.tags.length - 3}
                    </Text>
                  )}
                </HStack>
              )}
              
              {entry.status && (
                <Badge alignSelf="flex-start" colorScheme="green" fontSize="xs">
                  {entry.status}
                </Badge>
              )}
            </VStack>
          </Box>
        ))}
      </Grid>
    </Box>
  );
}
