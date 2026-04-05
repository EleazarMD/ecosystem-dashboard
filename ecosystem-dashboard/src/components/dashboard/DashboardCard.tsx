import React from 'react';
import {
  Box,
  Heading,
  HStack,
  Icon,
  VStack,
  Text,
  GridItem,
  Spacer,
  Circle,
} from '@chakra-ui/react';
import { GlassPanel } from '../ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const statusColors = {
  online: 'green.500',
  warning: 'yellow.500',
  error: 'red.500',
  offline: 'gray.500',
  neutral: 'blue.500',
};

interface DashboardCardProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  gridColumn?: any;
  gridRow?: any;
  footer?: React.ReactNode;
  status?: keyof typeof statusColors;
  lastUpdated?: string;
  actions?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  icon,
  children,
  gridColumn,
  gridRow,
  footer,
  status,
  lastUpdated,
  actions,
}) => {
  const headingColor = useSemanticToken('text.primary');
  const subtextColor = useSemanticToken('text.secondary');

  return (
    <GridItem colSpan={gridColumn} rowSpan={gridRow}>
      <GlassPanel
        h="100%"
        display="flex"
        flexDirection="column"
        p={{ base: 4, md: 6 }}
      >
        {/* Card Header */}
        <HStack mb={2} align="center">
          {icon && <Icon as={icon} w={6} h={6} color="brand.500" />}
          <Heading size="md" color={headingColor} fontWeight="semibold">
            {title}
          </Heading>
          <Spacer />
          {actions}
        </HStack>

        {/* Sub-header for status and timestamp */}
        {(status || lastUpdated) && (
          <HStack mb={4} spacing={3} align="center">
            {status && (
              <HStack>
                <Circle size="10px" bg={statusColors[status]} />
                <Text fontSize="xs" color={subtextColor} textTransform="capitalize">
                  {status}
                </Text>
              </HStack>
            )}
            {lastUpdated && (
              <Text fontSize="xs" color={subtextColor}>
                Last updated: {lastUpdated}
              </Text>
            )}
          </HStack>
        )}

        {/* Main Content */}
        <VStack flex={1} align="stretch" spacing={4} w="100%">
          {children}
        </VStack>

        {/* Footer */}
        {footer && (
          <Box mt={4} pt={4} borderTop="1px solid" borderColor={useSemanticToken('border.default')}>
            {footer}
          </Box>
        )}
      </GlassPanel>
    </GridItem>
  );
};
