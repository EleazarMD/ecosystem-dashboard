import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion } from 'framer-motion';
import { statusColors } from '@/styles/theme';
import { GlassPanel } from './GlassPanel';

const MotionBox = motion(Box);

export interface StatusOrbProps {
  status: 'healthy' | 'warning' | 'error' | 'info';
  title: string;
  value: string | number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  pulse?: boolean;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

/**
 * StatusOrb - Apple-inspired status indicator with glass morphism
 * 
 * Features:
 * - Gradient backgrounds based on status
 * - Pulse animations for critical states
 * - Multiple sizes
 * - Trend indicators
 * - Glass morphism container
 */
export const StatusOrb: React.FC<StatusOrbProps> = ({
  status,
  title,
  value,
  size = 'md',
  animated = true,
  pulse = false,
  trend,
}) => {
  const isDark = false;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: { w: '200px', h: '120px', p: 4 },
      orb: { w: '40px', h: '40px' },
      title: 'sm',
      value: 'lg',
    },
    md: {
      container: { w: '240px', h: '140px', p: 5 },
      orb: { w: '50px', h: '50px' },
      title: 'md',
      value: 'xl',
    },
    lg: {
      container: { w: '280px', h: '160px', p: 6 },
      orb: { w: '60px', h: '60px' },
      title: 'lg',
      value: '2xl',
    },
  };

  // Status color mapping
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return statusColors.healthy;
      case 'warning':
        return statusColors.warning;
      case 'error':
        return statusColors.error;
      case 'info':
        return statusColors.info;
      default:
        return statusColors.info;
    }
  };

  // Status gradient mapping
  const getStatusGradient = () => {
    switch (status) {
      case 'healthy':
        return statusColors.gradients.healthy;
      case 'warning':
        return statusColors.gradients.warning;
      case 'error':
        return statusColors.gradients.error;
      case 'info':
        return statusColors.gradients.info;
      default:
        return statusColors.gradients.info;
    }
  };

  // Trend indicator
  const getTrendColor = () => {
    if (!trend) return 'gray.500';
    switch (trend.direction) {
      case 'up':
        return status === 'error' ? 'red.400' : 'green.400';
      case 'down':
        return status === 'error' ? 'green.400' : 'red.400';
      case 'stable':
        return 'gray.400';
      default:
        return 'gray.400';
    }
  };

  const getTrendSymbol = () => {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  const config = sizeConfig[size];
  const statusColor = getStatusColor();
  const statusGradient = getStatusGradient();

  // Animation variants
  const orbVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    pulse: pulse ? {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    } : {},
  };

  const glowVariants = {
    animate: {
      boxShadow: [
        `0 0 20px ${statusColor}40`,
        `0 0 30px ${statusColor}60`,
        `0 0 20px ${statusColor}40`,
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      animated={animated}
      hoverEffect={true}
      {...config.container}
    >
      <VStack spacing={3} align="center" justify="center" h="full">
        {/* Status Orb */}
        <Box position="relative">
          <MotionBox
            {...config.orb}
            borderRadius="full"
            background={statusGradient}
            variants={orbVariants}
            initial="initial"
            animate={pulse ? "pulse" : "animate"}
            position="relative"
            _before={{
              content: '""',
              position: 'absolute',
              top: '10%',
              left: '10%',
              right: '30%',
              bottom: '30%',
              background: useSemanticToken('glass.background'),
              borderRadius: 'full',
              filter: 'blur(4px)',
            }}
          />
          {/* Glow effect */}
          {animated && (
            <MotionBox
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              {...config.orb}
              borderRadius="full"
              variants={glowVariants}
              animate="animate"
              zIndex={-1}
            />
          )}
        </Box>

        {/* Title */}
        <Text
          fontSize={config.title}
          fontWeight="medium"
          color={isDark ? 'whiteAlpha.800' : 'gray.600'}
          textAlign="center"
          lineHeight="shorter"
        >
          {title}
        </Text>

        {/* Value */}
        <Text
          fontSize={config.value}
          fontWeight="bold"
          color={isDark ? 'white' : 'gray.800'}
          textAlign="center"
        >
          {value}
        </Text>

        {/* Trend Indicator */}
        {trend && (
          <Text
            fontSize="sm"
            color={getTrendColor()}
            fontWeight="medium"
          >
            {getTrendSymbol()} {trend.percentage}%
          </Text>
        )}
      </VStack>
    </GlassPanel>
  );
};

export default StatusOrb;
