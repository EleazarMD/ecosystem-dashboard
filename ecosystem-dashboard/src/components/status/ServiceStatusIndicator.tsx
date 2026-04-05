/**
 * Service Status Indicator
 * 
 * Displays the availability status of ecosystem services like AI Gateway
 * following AI Homelab Ecosystem architecture standards.
 */
import React from 'react';
import { 
  Box, 
  Tooltip, 
  Badge,
  Text,
  HStack,
} from '@chakra-ui/react';
import { InfoIcon, WarningIcon } from '@chakra-ui/icons';

interface ServiceStatusIndicatorProps {
  serviceName: string;
  isAvailable: boolean;
  isMockData: boolean;
  isForcingRealResponses: boolean;
}

/**
 * Service Status Indicator
 * 
 * Displays the availability and data source status of ecosystem services
 */
const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({ 
  serviceName,
  isAvailable,
  isMockData,
  isForcingRealResponses
}) => {
  const mockBg = 'yellow.100';
  const mockColor = 'yellow.800';
  const errorBg = 'red.100';
  const errorColor = 'red.800';
  const successBg = 'green.100';
  const successColor = 'green.800';

  let statusInfo = {
    label: '',
    color: '',
    bg: '',
    message: '',
    icon: null as React.ReactNode
  };

  if (!isAvailable) {
    statusInfo = {
      label: 'Offline',
      color: errorColor,
      bg: errorBg,
      message: `${serviceName} is unavailable. Please check service status or configuration.`,
      icon: <WarningIcon mr={1} />
    };
  } else if (isMockData) {
    statusInfo = {
      label: 'Mock Data',
      color: mockColor,
      bg: mockBg,
      message: isForcingRealResponses 
        ? `${serviceName} should use real data but falling back to mock due to errors.` 
        : `${serviceName} is using mock data for development.`,
      icon: <InfoIcon mr={1} />
    };
  } else {
    statusInfo = {
      label: 'Online',
      color: successColor,
      bg: successBg,
      message: `${serviceName} is available and providing real data.`,
      icon: null
    };
  }

  return (
    <Tooltip hasArrow label={statusInfo.message}>
      <HStack display="inline-flex" spacing={1}>
        <Text fontSize="sm">{serviceName}:</Text>
        <Badge
          display="flex"
          alignItems="center"
          px={2}
          py={1}
          borderRadius="md"
          color={statusInfo.color}
          bg={statusInfo.bg}
          fontWeight="medium"
          fontSize="xs"
        >
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </HStack>
    </Tooltip>
  );
};

export default ServiceStatusIndicator;
