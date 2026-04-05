import React from 'react';
import { Box, Text, VStack, HStack, Badge, Icon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion } from 'framer-motion';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { domainColors } from '@/styles/theme';
import { GlassPanel } from './GlassPanel';

const MotionBox = motion(Box);

export interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    isGood: boolean;
  };
}

export interface MetricPanelProps {
  title: string;
  domain?: 'infrastructure' | 'knowledge' | 'aiSystems' | 'platforms';
  metrics: MetricData[];
  status?: 'healthy' | 'warning' | 'error' | 'info';
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MetricPanel - Professional metrics display with glass morphism
 * 
 * Features:
 * - Multiple metrics in a single panel
 * - Domain-based color theming
 * - Change indicators with directional arrows
 * - Glass morphism styling
 * - Responsive sizing
 */
export const MetricPanel: React.FC<MetricPanelProps> = ({
  title,
  domain,
  metrics,
  status,
  animated = true,
  size = 'md',
}) => {


  // Size configurations
  const sizeConfig = {
    sm: {
      container: { minW: '280px', p: 4 },
      title: 'md',
      metric: 'lg',
      label: 'sm',
    },
    md: {
      container: { minW: '320px', p: 5 },
      title: 'lg',
      metric: 'xl',
      label: 'sm',
    },
    lg: {
      container: { minW: '360px', p: 6 },
      title: 'xl',
      metric: '2xl',
      label: 'md',
    },
  };

  // Get domain colors
  const getDomainGradient = () => {
    if (!domain) return 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))';
    return domainColors[domain]?.gradient || domainColors.infrastructure.gradient;
  };

  const getDomainColor = () => {
    if (!domain) return '#3B82F6';
    return domainColors[domain]?.primary || domainColors.infrastructure.primary;
  };

  // Get change indicator
  const getChangeIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return FaArrowUp;
      case 'down':
        return FaArrowDown;
      case 'stable':
        return FaMinus;
      default:
        return FaMinus;
    }
  };

  const getChangeColor = (change: MetricData['change']) => {
    if (!change) return useSemanticToken('text.secondary');

    if (change.direction === 'stable') return useSemanticToken('text.secondary');

    if (change.isGood) {
      return change.direction === 'up' ? useSemanticToken('status.success') : useSemanticToken('status.error');
    } else {
      return change.direction === 'up' ? useSemanticToken('status.error') : useSemanticToken('status.success');
    }
  };

  const config = sizeConfig[size];
  const domainGradient = getDomainGradient();
  const domainColor = getDomainColor();

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const metricVariants = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      animated={animated}
      hoverEffect={true}
      gradient={`linear-gradient(135deg, ${useSemanticToken('surface.hover')}, ${useSemanticToken('surface.base')}), ${domainGradient.replace(/rgb/g, 'rgba').replace(/\)/g, ', 0.05)')}`}
      {...config.container}
    >
      <MotionBox
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="center">
            <Text
              fontSize={config.title}
              fontWeight="semibold"
              color={useSemanticToken('text.primary')}
            >
              {title}
            </Text>
            {domain && (
              <Badge
                colorScheme="blue"
                variant="subtle"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="md"
                background={`${domainColor}20`}
                color={domainColor}
              >
                {domain}
              </Badge>
            )}
          </HStack>

          {/* Metrics */}
          <VStack align="stretch" spacing={3}>
            {metrics.map((metric, index) => (
              <MotionBox
                key={`${metric.label}-${index}`}
                variants={metricVariants}
              >
                <HStack justify="space-between" align="center">
                  <VStack align="start" spacing={0} flex={1}>
                    <Text
                      fontSize={config.label}
                      color={useSemanticToken('text.secondary')}
                      fontWeight="medium"
                    >
                      {metric.label}
                    </Text>
                    <HStack spacing={1} align="baseline">
                      <Text
                        fontSize={config.metric}
                        fontWeight="bold"
                        color={useSemanticToken('text.primary')}
                      >
                        {metric.value}
                      </Text>
                      {metric.unit && (
                        <Text
                          fontSize="sm"
                          color={useSemanticToken('text.tertiary')}
                          fontWeight="medium"
                        >
                          {metric.unit}
                        </Text>
                      )}
                    </HStack>
                  </VStack>

                  {/* Change Indicator */}
                  {metric.change && (
                    <HStack spacing={1} align="center">
                      <Icon
                        as={getChangeIcon(metric.change.direction)}
                        color={getChangeColor(metric.change)}
                        boxSize={3}
                      />
                      <Text
                        fontSize="sm"
                        color={getChangeColor(metric.change)}
                        fontWeight="medium"
                      >
                        {Math.abs(metric.change.value)}%
                      </Text>
                    </HStack>
                  )}
                </HStack>

                {/* Divider for all but last item */}
                {index < metrics.length - 1 && (
                  <Box
                    mt={3}
                    height="1px"
                    background={useSemanticToken('border.subtle')}
                  />
                )}
              </MotionBox>
            ))}
          </VStack>
        </VStack>
      </MotionBox>
    </GlassPanel>
  );
};

export default MetricPanel;
