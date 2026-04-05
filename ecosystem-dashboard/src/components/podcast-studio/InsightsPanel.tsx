import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Button,
  Textarea,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiBookmark, FiX, FiMoreVertical, FiArrowRight, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Insight {
  id: string;
  content: string;
  timestamp: Date;
  isPinned: boolean;
  tags: string[];
}

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([
    {
      id: '1',
      content: 'Medical professionals need concrete examples when discussing complex procedures',
      timestamp: new Date(),
      isPinned: true,
      tags: ['audience', 'key-finding'],
    },
  ]);
  const [newInsight, setNewInsight] = useState('');

  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  const addInsight = () => {
    if (!newInsight.trim()) return;
    setInsights(prev => [
      {
        id: Date.now().toString(),
        content: newInsight,
        timestamp: new Date(),
        isPinned: false,
        tags: [],
      },
      ...prev,
    ]);
    setNewInsight('');
  };

  const togglePin = (id: string) => {
    setInsights(prev =>
      prev.map(insight =>
        insight.id === id ? { ...insight, isPinned: !insight.isPinned } : insight
      )
    );
  };

  const removeInsight = (id: string) => {
    setInsights(prev => prev.filter(insight => insight.id !== id));
  };

  const exportToSource = (insight: Insight) => {
    // TODO: Add to sources panel
    console.log('Export to source:', insight);
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <HStack spacing={2}>
          <FiZap color="orange" />
          <Text 
            fontSize="14px" 
            fontWeight="500" 
            color={textColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            Insights
          </Text>
        </HStack>
        <Badge colorScheme="orange" fontSize="11px">
          {insights.length} saved
        </Badge>
      </HStack>

      {/* Quick Capture */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          border="2px solid"
          borderColor="orange.500"
          borderRadius="2xl"
          boxShadow="lg"
          position="relative"
          overflow="hidden"
        >
          <VStack spacing={3} position="relative" zIndex={1}>
            <Text 
              fontSize="12px" 
              fontWeight="600" 
              color={textColor}
              alignSelf="flex-start"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              💡 Capture New Insight
            </Text>
            <Textarea
              value={newInsight}
              onChange={(e) => setNewInsight(e.target.value)}
              placeholder="What did you discover?"
              size="sm"
              rows={3}
              fontSize="13px"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              borderRadius="xl"
              bg={useSemanticToken('surface.elevated')}
              border="none"
              _focus={{ 
                boxShadow: '0 0 0 3px rgba(237, 137, 54, 0.3)',
              }}
            />
            <Button
              size="sm"
              colorScheme="orange"
              w="full"
              onClick={addInsight}
              borderRadius="xl"
              fontWeight="600"
            >
              Save Insight
            </Button>
          </VStack>
        </Box>
      </Box>

      {/* Insights List */}
      <VStack spacing={3} px={4} pb={4}>
        {insights.map((insight) => (
          <Box
            key={insight.id}
            p={3}
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            border="1px solid"
            borderColor={insight.isPinned ? 'orange.300' : borderColor}
            w="full"
            transition="all 0.2s ease"
            _hover={{ boxShadow: 'lg', transform: 'translateY(-1px)' }}
          >
            <HStack justify="space-between" mb={2} align="flex-start">
              <IconButton
                aria-label="Pin insight"
                icon={<FiBookmark />}
                size="xs"
                variant="ghost"
                color={insight.isPinned ? 'orange.500' : mutedColor}
                onClick={() => togglePin(insight.id)}
              />
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  size="xs"
                  variant="ghost"
                />
                <MenuList>
                  <MenuItem icon={<FiArrowRight />} onClick={() => exportToSource(insight)}>
                    Export to Sources
                  </MenuItem>
                  <MenuItem icon={<FiX />} color="red.500" onClick={() => removeInsight(insight.id)}>
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
            
            <Text 
              fontSize="13px" 
              color={textColor}
              mb={2}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {insight.content}
            </Text>
            
            {insight.tags.length > 0 && (
              <HStack spacing={2} flexWrap="wrap">
                {insight.tags.map((tag) => (
                  <Badge key={tag} fontSize="10px" px={2} py={0.5} borderRadius="full" colorScheme="orange">
                    {tag}
                  </Badge>
                ))}
              </HStack>
            )}
            
            <Text 
              fontSize="11px" 
              color={mutedColor}
              mt={2}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {insight.timestamp.toLocaleTimeString()}
            </Text>
          </Box>
        ))}
      </VStack>

      {/* Info */}
      <Box
        mx={4}
        mb={4}
        p={4}
        bg={cardBg}
        borderRadius="xl"
        borderLeft="4px solid"
        borderLeftColor="orange.400"
      >
        <Text 
          fontSize="12px" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          fontWeight="500"
        >
          💡 Pin important findings to keep them at the top. Export insights to Sources panel for podcast generation.
        </Text>
      </Box>
    </VStack>
  );
}
