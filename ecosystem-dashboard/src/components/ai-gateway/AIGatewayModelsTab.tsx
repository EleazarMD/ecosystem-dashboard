/**
 * AI Gateway Models Tab Component
 * Displays and manages AI models in the gateway
 */
import React from 'react';
import {
  Box,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Button,
  Icon,
  Spinner,
  Heading,
  Flex,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { 
  FiCpu, 
  FiZap, 
  FiSettings, 
  FiBarChart2,
  FiPlus
} from 'react-icons/fi';
import { GlassPanel } from '../ui/GlassPanel';
import { AIModel } from '../../types/aiGateway';
import { 
  getModelHeaderColor, 
  getModelIcon, 
  getModelTypeDescription, 
  getCapabilityColor 
} from '../../utils/aiGatewayUtils';

interface AIGatewayModelsTabProps {
  models: AIModel[];
  loading: boolean;
  isClient: boolean;
  onAddModel: () => void;
}

export const AIGatewayModelsTab: React.FC<AIGatewayModelsTabProps> = ({ 
  models, 
  loading, 
  isClient,
  onAddModel
}) => {
  // Color mode values
  const isDark = false;

  return (
    <Box w="full">
      <HStack mb={4} justify="space-between">
        <HStack spacing={2}>
          <Text fontSize="lg" fontWeight="semibold">
            Available Models
          </Text>
          <Badge colorScheme="blue" fontSize="sm">{models?.length || 0}</Badge>
        </HStack>
        
        <HStack spacing={3}>
          <Button
            size="sm"
            leftIcon={<Icon as={FiZap} />}
            colorScheme="purple"
            variant="ghost"
            isDisabled={loading}
            onClick={onAddModel}
          >
            Add Model
          </Button>
          
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              rightIcon={<ChevronDownIcon />}
              variant="outline"
            >
              Filter
            </MenuButton>
            <MenuList>
              <MenuItem>All Providers</MenuItem>
              <MenuItem>OpenAI</MenuItem>
              <MenuItem>Ollama</MenuItem>
              <MenuItem>Anthropic</MenuItem>
              <MenuItem>Hugging Face</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>
      
      {isClient && loading && (
        <Box display="flex" justifyContent="center" w="full" py={8}>
          <VStack spacing={3}>
            <Spinner size="xl" color="blue.400" thickness="3px" />
            <Text color={isDark ? "gray.400" : "gray.600"}>
              Loading models...
            </Text>
          </VStack>
        </Box>
      )}

      {!loading && models && models.length === 0 && (
        <GlassPanel variant="light" elevation={1} p={6} textAlign="center">
          <VStack spacing={4}>
            <Icon as={FiCpu} boxSize={12} color={isDark ? "whiteAlpha.500" : "gray.400"} />
            <VStack spacing={1}>
              <Heading size="md">No Models Available</Heading>
              <Text color={isDark ? "whiteAlpha.600" : "gray.500"} maxW="md">
                There are currently no AI models available in the gateway.
              </Text>
            </VStack>
            <Button
              leftIcon={<Icon as={FiZap} />}
              colorScheme="blue"
              size="md"
              onClick={onAddModel}
            >
              Add Your First Model
            </Button>
          </VStack>
        </GlassPanel>
      )}

      {!loading && models && models.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} w="full">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} isDark={isDark} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

interface ModelCardProps {
  model: AIModel;
  isDark: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, isDark }) => {
  return (
    <GlassPanel 
      variant={isDark ? "medium" : "light"} 
      elevation={2}
      p={0}
      overflow="hidden"
      sx={{
        _hover: { transform: 'translateY(-2px)', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)' },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <Box 
        bg={getModelHeaderColor(model.provider, isDark)}
        py={2}
        px={4}
        borderBottom={isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'}
      >
        <HStack justify="space-between">
          <HStack>
            <Icon as={getModelIcon(model.provider)} boxSize={4} />
            <Text fontWeight="medium" fontSize="sm">{model.provider}</Text>
          </HStack>
          
          <Badge 
            colorScheme={model.configured ? 'green' : 'gray'}
            variant="solid"
            fontSize="xs"
            textTransform="lowercase"
            borderRadius="sm"
          >
            {model.configured ? 'active' : 'available'}
          </Badge>
        </HStack>
      </Box>
      
      <Box p={4}>
        <VStack align="start" spacing={4}>
          <VStack align="start" spacing={1}>
            <Text 
              fontWeight="bold" 
              fontSize="lg" 
              color={isDark ? "white" : "gray.800"}
            >
              {model.id}
            </Text>
            
            <Text fontSize="sm" color={isDark ? "gray.300" : "gray.600"}>
              {getModelTypeDescription(model.type)}
            </Text>
          </VStack>
          
          <Divider borderColor={isDark ? 'whiteAlpha.200' : 'gray.100'} />
          
          <Box w="full">
            <Text fontSize="xs" mb={2} color={isDark ? "gray.400" : "gray.600"}>
              Capabilities:
            </Text>
            <Flex wrap="wrap" gap={2}>
              {(() => {
                // Normalize capabilities to always be an array of strings
                const caps = Array.isArray(model.capabilities) 
                  ? model.capabilities 
                  : (model.capabilities && typeof model.capabilities === 'object' 
                      ? Object.keys(model.capabilities) 
                      : []);
                return caps.map((capability) => (
                  <Badge 
                    key={`${model.id}-${String(capability)}`} 
                    colorScheme={getCapabilityColor(String(capability))}
                    variant="subtle" 
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    {String(capability)}
                  </Badge>
                ));
              })()}
            </Flex>
          </Box>
          
          <HStack w="full" justify="space-between" pt={2}>
            <Button 
              size="sm" 
              variant="ghost" 
              leftIcon={<Icon as={FiBarChart2} />}
              colorScheme="blue"
            >
              Usage
            </Button>
            
            <Button 
              size="sm" 
              variant="solid" 
              colorScheme="blue" 
              leftIcon={<Icon as={FiSettings} />}
            >
              Configure
            </Button>
          </HStack>
        </VStack>
      </Box>
    </GlassPanel>
  );
};
