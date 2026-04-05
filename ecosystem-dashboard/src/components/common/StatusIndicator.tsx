import React from 'react';
import {
  Tag,
  TagLabel,
  TagLeftIcon,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  WarningIcon,
  WarningTwoIcon,
  TimeIcon
} from '@chakra-ui/icons';

// Define the possible status types
type StatusType = 'online' | 'warning' | 'error' | 'pending' | 'offline' | 'unknown';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Status Indicator Component
 * 
 * Displays a status indicator with an icon and label
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  label, 
  showIcon = true,
  size = 'md'
}) => {
  // Define status configurations
  const statusConfig = {
    online: {
      colorScheme: 'green',
      icon: <CheckCircleIcon />,
      defaultLabel: 'Online'
    },
    warning: {
      colorScheme: 'yellow',
      icon: <WarningIcon />,
      defaultLabel: 'Warning'
    },
    error: {
      colorScheme: 'red',
      icon: <WarningTwoIcon />,
      defaultLabel: 'Error'
    },
    pending: {
      colorScheme: 'blue',
      icon: <TimeIcon />,
      defaultLabel: 'Pending'
    },
    offline: {
      colorScheme: 'gray',
      icon: <WarningTwoIcon />,
      defaultLabel: 'Offline'
    },
    unknown: {
      colorScheme: 'gray',
      icon: <TimeIcon />,
      defaultLabel: 'Unknown'
    }
  };
  
  // Get configuration for the current status
  const config = statusConfig[status] || statusConfig.unknown;
  
  // Determine the label to display
  const displayLabel = label || config.defaultLabel;
  
  // Use variant based on light/dark mode
  const variant = 'subtle';
  
  return (
    <Tag
      size={size}
      variant={variant}
      colorScheme={config.colorScheme}
    >
      {showIcon && <TagLeftIcon as={() => config.icon} />}
      <TagLabel>{displayLabel}</TagLabel>
    </Tag>
  );
};

export default StatusIndicator;
