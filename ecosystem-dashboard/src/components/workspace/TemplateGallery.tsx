/**
 * Template Gallery Component
 * Modal to select from various Notion-style templates
 * Loads templates from database API + hardcoded fallbacks
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  Spinner,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiTable,
  FiHome,
  FiMapPin,
  FiFileText,
  FiClipboard,
  FiBookOpen,
  FiBarChart2,
} from 'react-icons/fi';

interface DbTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  content: any[];
  properties?: any;
  isSystem: boolean;
  usageCount: number;
}

interface HardcodedTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
}

const hardcodedTemplates: HardcodedTemplate[] = [
  { id: 'travel-planner', name: 'Travel Planner', description: 'Packing lists, itinerary, and trip notes', icon: FiMapPin, category: 'Planning' },
  { id: 'recipe-table', name: 'Recipe Collection', description: 'Database for recipes with tags and links', icon: FiTable, category: 'Personal' },
  { id: 'personal-home', name: 'Personal Home', description: 'Organize your daily life in columns', icon: FiHome, category: 'Personal' },
  { id: 'calendar-view', name: 'Calendar', description: 'Monthly calendar with events', icon: FiCalendar, category: 'Planning' },
  { id: 'blank-page', name: 'Blank Page', description: 'Start with an empty page', icon: FiFileText, category: 'Basic' },
];

const categoryIcons: Record<string, any> = {
  basic: FiFileText,
  productivity: FiClipboard,
  documentation: FiBookOpen,
  planning: FiCalendar,
  personal: FiHome,
  custom: FiBarChart2,
};

const categories = ['all', 'basic', 'productivity', 'documentation', 'planning', 'personal', 'custom'];

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, content?: any[]) => void;
  workspaceId?: string;
}

export function TemplateGallery({ isOpen, onClose, onSelectTemplate, workspaceId }: TemplateGalleryProps) {
  const [dbTemplates, setDbTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadTemplates();
    }
  }, [isOpen, workspaceId]);

  const loadTemplates = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/templates?workspaceId=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setDbTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (templateId: string, content?: any[]) => {
    onSelectTemplate(templateId, content);
    onClose();
  };

  const filteredDbTemplates = selectedCategory === 'all'
    ? dbTemplates
    : dbTemplates.filter(t => t.category === selectedCategory);

  const filteredHardcoded = selectedCategory === 'all'
    ? hardcodedTemplates
    : hardcodedTemplates.filter(t => t.category.toLowerCase() === selectedCategory);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>Choose a template</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* Category filter */}
          <HStack spacing={2} mb={4} flexWrap="wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="xs"
                variant={selectedCategory === cat ? 'solid' : 'ghost'}
                colorScheme={selectedCategory === cat ? 'blue' : 'gray'}
                onClick={() => setSelectedCategory(cat)}
                textTransform="capitalize"
              >
                {cat}
              </Button>
            ))}
          </HStack>

          {loading ? (
            <VStack py={8}><Spinner size="lg" /></VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {/* Database templates */}
              {filteredDbTemplates.map((template) => (
                <Box
                  key={`db-${template.id}`}
                  p={4}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ bg: hoverBg, borderColor: 'blue.300' }}
                  onClick={() => handleTemplateClick(template.id, template.content)}
                >
                  <VStack align="start" spacing={3}>
                    <Text fontSize="2xl">{template.icon || '📄'}</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="md" fontWeight="600">{template.name}</Text>
                      {template.description && (
                        <Text fontSize="xs" color={textSecondary} noOfLines={2}>{template.description}</Text>
                      )}
                    </VStack>
                    <HStack spacing={2}>
                      <Badge fontSize="xs" textTransform="capitalize">{template.category}</Badge>
                      {template.isSystem && <Badge colorScheme="blue" fontSize="xs">System</Badge>}
                    </HStack>
                  </VStack>
                </Box>
              ))}

              {/* Hardcoded templates (fallback) */}
              {filteredHardcoded.map((template) => (
                <Box
                  key={`hc-${template.id}`}
                  p={4}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ bg: hoverBg, borderColor: 'blue.300' }}
                  onClick={() => handleTemplateClick(template.id)}
                >
                  <VStack align="start" spacing={3}>
                    <Icon as={template.icon} boxSize={8} color="blue.500" />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="md" fontWeight="600">{template.name}</Text>
                      <Text fontSize="xs" color={textSecondary}>{template.description}</Text>
                    </VStack>
                    <Badge fontSize="xs" textTransform="capitalize">{template.category}</Badge>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
