import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Text, Icon, CircularProgress, CircularProgressLabel } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.8) translateY(10px); }
  60% { opacity: 1; transform: scale(1.05) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

interface AnimatedStatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  gradient?: string;
  delay?: number;
  progress?: number;
  tooltip?: string;
}

export const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
  icon: IconComp,
  label,
  value,
  suffix = '',
  color,
  gradient,
  delay = 0,
  progress,
  tooltip,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(value * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [visible, value]);

  return (
    <Box
      position="relative"
      borderRadius="2xl"
      p={5}
      overflow="hidden"
      bg={gradient || `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`}
      border="1px solid"
      borderColor={`${color}30`}
      boxShadow={`0 4px 20px ${color}10`}
      transition="all 0.3s cubic-bezier(0.4,0,0.2,1)"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 30px ${color}25`,
        borderColor: `${color}50`,
      }}
      opacity={visible ? 1 : 0}
      animation={visible ? `${popIn} 0.5s ease-out` : undefined}
      title={tooltip}
    >
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <Box
            w="40px"
            h="40px"
            borderRadius="xl"
            bg={`${color}20`}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={IconComp} color={color} boxSize={5} />
          </Box>
          <Text fontSize="xs" color="gray.500" fontWeight="medium" mt={2}>
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color={color}>
            {displayValue}{suffix}
          </Text>
        </VStack>
        {progress !== undefined && (
          <CircularProgress
            value={progress}
            color={color}
            size="48px"
            thickness="8px"
            trackColor={`${color}10`}
            borderRadius="full"
          >
            <CircularProgressLabel fontSize="xs" color={color}>
              {progress}%
            </CircularProgressLabel>
          </CircularProgress>
        )}
      </HStack>
    </Box>
  );
};
