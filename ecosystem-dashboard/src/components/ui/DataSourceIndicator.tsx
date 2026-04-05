import React from 'react';
import {
  Badge,
  Tooltip,
  HStack,
  Icon,
  Text,
} from '@chakra-ui/react';
import { FiCheck, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface DataSourceIndicatorProps {
  source: 'real' | 'cached' | 'fallback';
  lastUpdated?: string;
  error?: string | null;
  size?: 'sm' | 'md';
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  source,
  lastUpdated,
  error,
  size = 'sm'
}) => {
  const getIndicatorProps = () => {
    switch (source) {
      case 'real':
        return {
          colorScheme: 'green',
          icon: FiCheck,
          label: 'Live Data',
          tooltip: 'Real-time data from services'
        };
      case 'cached':
        return {
          colorScheme: 'yellow',
          icon: FiClock,
          label: 'Cached',
          tooltip: `Cached data${lastUpdated ? ` from ${new Date(lastUpdated).toLocaleTimeString()}` : ''}`
        };
      case 'fallback':
        return {
          colorScheme: 'orange',
          icon: FiAlertTriangle,
          label: 'Demo Data',
          tooltip: error || 'Using fallback data - service unavailable'
        };
      default:
        return {
          colorScheme: 'gray',
          icon: FiAlertTriangle,
          label: 'Unknown',
          tooltip: 'Data source unknown'
        };
    }
  };

  const { colorScheme, icon, label, tooltip } = getIndicatorProps();
  const textColor = useSemanticToken('text.secondary');

  if (source === 'real' && !error) {
    // Don't show indicator for real data with no errors
    return null;
  }

  return (
    <Tooltip label={tooltip} placement="top">
      <Badge
        colorScheme={colorScheme}
        variant="subtle"
        size={size}
        display="flex"
        alignItems="center"
        gap={1}
      >
        <Icon as={icon} boxSize={3} />
        <Text fontSize="xs">{label}</Text>
      </Badge>
    </Tooltip>
  );
};
