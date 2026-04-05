/**
 * AI Gateway Status Cards Component
 * Displays key metrics in card format
 */
import React from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  HStack,
} from '@chakra-ui/react';
import { FiClock, FiCpu, FiActivity, FiServer } from 'react-icons/fi';
import { GlassPanel } from '../ui/GlassPanel';
import { AIGatewayStatus } from '../../types/aiGateway';
import { formatUptime } from '../../utils/aiGatewayUtils';

interface AIGatewayStatusCardsProps {
  status: AIGatewayStatus | null;
  loading?: boolean;
}

export const AIGatewayStatusCards: React.FC<AIGatewayStatusCardsProps> = ({ 
  status,
  loading = false
}) => {
  // Color mode values
  const isDark = false;
  
  // Card style configurations
  const cards = [
    {
      title: 'Gateway Status',
      value: status?.isOnline ? 'Online' : 'Offline',
      icon: FiServer,
      helpText: status?.lastUpdated ? `Last checked ${status.lastUpdated.toLocaleTimeString()}` : 'Status unknown',
      color: status?.isOnline ? 'green' : 'red',
    },
    {
      title: 'Active Models',
      value: status?.models?.toString() || '0',
      icon: FiCpu,
      helpText: 'Configured AI models',
      color: 'blue',
    },
    {
      title: 'Uptime',
      value: status?.uptime ? formatUptime(typeof status.uptime === 'string' ? parseInt(status.uptime) : status.uptime) : '0s',
      icon: FiClock,
      helpText: 'Time since last restart',
      color: 'purple',
    },
    {
      title: 'Request Rate',
      value: status?.requestRate ? `${status.requestRate.toFixed(1)}/min` : '0/min',
      icon: FiActivity,
      helpText: 'Average requests per minute',
      color: 'orange',
    },
  ];
  
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={6}>
      {cards.map((card, index) => (
        <GlassPanel
          key={index}
          variant={isDark ? "medium" : "light"}
          elevation={1}
          p={0}
          position="relative"
          overflow="hidden"
          opacity={loading ? 0.7 : 1}
          sx={{ transition: "all 0.2s" }}
          borderLeftWidth="4px"
          borderLeftStyle="solid"
          borderLeftColor={`${card.color}.${isDark ? '400' : '500'}`}
          _hover={{ 
            transform: 'translateY(-2px)',
            boxShadow: isDark ? 'lg' : 'md'
          }}
        >
          <Box py={4} px={5}>
            <HStack spacing={4} align="flex-start">
              <Stat>
                <StatLabel fontSize="sm" color={isDark ? 'gray.300' : 'gray.600'}>
                  {card.title}
                </StatLabel>
                <StatNumber fontSize="2xl" fontWeight="bold">
                  {card.value}
                </StatNumber>
                <StatHelpText fontSize="xs" mt={1}>
                  {card.helpText}
                </StatHelpText>
              </Stat>
              <Box>
                <Icon 
                  as={card.icon} 
                  boxSize={8} 
                  color={`${card.color}.${isDark ? '300' : '500'}`} 
                  opacity={0.8}
                />
              </Box>
            </HStack>
          </Box>
        </GlassPanel>
      ))}
    </SimpleGrid>
  );
};
