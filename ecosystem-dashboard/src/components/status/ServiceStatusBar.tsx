/**
 * Service Status Bar
 * 
 * Displays status indicators for all ecosystem services
 * following AI Homelab Ecosystem architecture standards.
 */
import React from 'react';
import { 
  HStack, 
  Box,
  Divider,
  Text,
} from '@chakra-ui/react';
import { useServiceStatus } from '../../context/ServiceStatusContext';
import ServiceStatusIndicator from './ServiceStatusIndicator';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Service Status Bar
 * 
 * Shows the status of all ecosystem services in a horizontal bar
 */
const ServiceStatusBar: React.FC = () => {
  const { services, isForcingRealResponses } = useServiceStatus();
  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Box 
      width="100%" 
      py={1}
      px={4}
      bg={bgColor}
      borderBottom="1px solid"
      borderColor={borderColor}
    >
      <HStack spacing={4} justify="flex-end">
        {Object.values(services).map((service) => (
          <ServiceStatusIndicator 
            key={service.name}
            serviceName={service.name}
            isAvailable={service.isAvailable}
            isMockData={service.isMockData}
            isForcingRealResponses={isForcingRealResponses}
          />
        ))}
        
        {isForcingRealResponses && (
          <Text fontSize="xs" color="orange.500" fontWeight="medium">
            Real Responses Enforced
          </Text>
        )}
      </HStack>
    </Box>
  );
};

export default ServiceStatusBar;
