/**
 * ApprovalBadge Component
 * 
 * A badge that shows the pending approval count.
 * Designed for mobile navigation bars and headers.
 */

import React from 'react';
import {
  Box,
  Badge,
  Icon,
  HStack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { FiShield, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useApprovalSafe } from '@/contexts/ApprovalContext';

const MotionBadge = motion(Badge);

interface ApprovalBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
}

export function ApprovalBadge({
  size = 'md',
  showIcon = true,
  showLabel = false,
  onClick,
}: ApprovalBadgeProps) {
  const approval = useApprovalSafe();
  
  // Handle case where context isn't available
  if (!approval) {
    return null;
  }
  
  const { pendingCount, criticalCount } = approval;
  
  // Don't show if no pending approvals
  if (pendingCount === 0) {
    return null;
  }
  
  const hasCritical = criticalCount > 0;
  const badgeColor = hasCritical ? 'red' : 'brand';
  
  const sizeStyles = {
    sm: { fontSize: '10px', minW: '16px', h: '16px', iconSize: 3 },
    md: { fontSize: '12px', minW: '20px', h: '20px', iconSize: 4 },
    lg: { fontSize: '14px', minW: '24px', h: '24px', iconSize: 5 },
  };
  
  const styles = sizeStyles[size];
  
  return (
    <Tooltip
      label={`${pendingCount} pending approval${pendingCount !== 1 ? 's' : ''}${hasCritical ? ` (${criticalCount} critical)` : ''}`}
      hasArrow
    >
      <HStack
        spacing={1}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        _hover={onClick ? { opacity: 0.8 } : undefined}
      >
        {showIcon && (
          <Icon
            as={hasCritical ? FiAlertCircle : FiShield}
            boxSize={styles.iconSize}
            color={hasCritical ? 'red.500' : 'brand.500'}
          />
        )}
        
        <AnimatePresence mode="wait">
          <MotionBadge
            key={pendingCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
            colorScheme={badgeColor}
            variant="solid"
            borderRadius="full"
            fontSize={styles.fontSize}
            minW={styles.minW}
            h={styles.h}
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={1}
          >
            {pendingCount > 99 ? '99+' : pendingCount}
          </MotionBadge>
        </AnimatePresence>
        
        {showLabel && (
          <Text fontSize={styles.fontSize} color="textSecondary">
            {pendingCount === 1 ? 'approval' : 'approvals'}
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
}

/**
 * ApprovalIndicator - A pulsing indicator for critical approvals
 */
export function ApprovalIndicator() {
  const approval = useApprovalSafe();
  
  if (!approval || approval.criticalCount === 0) {
    return null;
  }
  
  return (
    <Box
      position="absolute"
      top={-1}
      right={-1}
      w="10px"
      h="10px"
      borderRadius="full"
      bg="red.500"
      sx={{
        '@keyframes pulse': {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.2)', opacity: 0.7 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        animation: 'pulse 1.5s infinite',
      }}
    />
  );
}

export default ApprovalBadge;
