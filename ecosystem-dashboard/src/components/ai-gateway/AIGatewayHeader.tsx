/**
 * AI Gateway Header Component
 * Displays the page header with title and status indicator
 */
import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  Badge
} from '@chakra-ui/react';
import { FiRefreshCw, FiSettings } from 'react-icons/fi';
import { AIGatewayStatus } from '../../types/aiGateway';

interface AIGatewayHeaderProps {
  status: AIGatewayStatus | null;
  loading?: boolean;
  onRefresh: () => void;
  onConfigure: () => void;
}

export const AIGatewayHeader: React.FC<AIGatewayHeaderProps> = ({ 
  status, 
  loading = false,
  onRefresh,
  onConfigure
}) => {
  // Color mode values
  const isDark = false;
  const gradientBg = 'linear-gradient(to right, rgba(226, 232, 240, 0.7), rgba(203, 213, 224, 0.7))';
  
  const statusColor = status?.isOnline 
    ? isDark ? 'green.300' : 'green.500' 
    : isDark ? 'red.300' : 'red.500';
  
  return (
    <Box
      w="full"
      p={6}
      mb={6}
      borderRadius="lg"
      bg={gradientBg}
      backgroundSize="cover"
      boxShadow="md"
      position="relative"
      overflow="hidden"
    >
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="url('/patterns/circuit-board.svg')"
        opacity={0.05}
        zIndex={0}
      />
      
      {/* Content */}
      <Flex 
        position="relative" 
        zIndex={1} 
        justifyContent="space-between" 
        alignItems="center"
      >
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg">AI Gateway</Heading>
            {status && (
              <Badge
                colorScheme={status.isOnline ? 'green' : 'red'}
                variant="solid"
                fontSize="sm"
              >
                {status.isOnline ? 'Online' : 'Offline'}
              </Badge>
            )}
            {status?.version && (
              <Badge colorScheme="blue" variant="outline">
                v{status.version}
              </Badge>
            )}
          </HStack>
          
          <Text color={isDark ? 'gray.300' : 'gray.600'}>
            Central management for AI models and API access
          </Text>
        </Box>
        
        <HStack spacing={3}>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            size="sm"
            onClick={onRefresh}
            isLoading={loading}
          >
            Refresh
          </Button>
          
          <Button
            leftIcon={<Icon as={FiSettings} />}
            size="sm"
            colorScheme="blue"
            onClick={onConfigure}
          >
            Manage Gateway
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};
