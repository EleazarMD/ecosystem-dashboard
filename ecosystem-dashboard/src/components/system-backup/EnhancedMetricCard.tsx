import {
  Box,
  Text,
  HStack,
  VStack,
  Icon,
  Progress,
  Badge,
  CircularProgress,
  CircularProgressLabel
} from '@chakra-ui/react';
import { ArrowUpIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { ReactElement } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: ReactElement;
  trend?: 'up' | 'down' | 'stable';
  color: string;
  progress?: number;
  sparkline?: string;
}

// Mock sparkline data
const getSparklineData = (type: string) => {
  const dataMap: Record<string, number[]> = {
    success: [85, 90, 95, 88, 92, 96, 98],
    size: [2.1, 2.3, 2.8, 2.4, 2.6, 2.9, 2.4],
    duration: [12, 15, 11, 14, 13, 10, 12]
  };
  
  return (dataMap[type] || []).map((value, index) => ({ value, index }));
};

export const EnhancedMetricCard: React.FC<EnhancedMetricCardProps> = ({
  title,
  value,
  subValue,
  icon,
  trend = undefined,
  color,
  progress = undefined,
  sparkline = undefined
}) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  
  const sparklineData = sparkline ? getSparklineData(sparkline) : [];

  return (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="xl"
      border="1px"
      borderColor={borderColor}
      position="relative"
      overflow="hidden"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
      transition="all 0.2s"
    >
      {/* Background gradient */}
      <Box
        position="absolute"
        top={0}
        right={0}
        w="50px"
        h="50px"
        bgGradient={`linear(135deg, ${color}.400, ${color}.600)`}
        opacity={0.1}
        borderRadius="full"
        transform="translate(50%, -50%)"
      />
      
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Icon 
              as={() => icon} 
              boxSize={6} 
              color={`${color}.500`}
            />
          </Box>
          {trend && (
            <Badge
              colorScheme={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}
              variant="subtle"
              borderRadius="full"
              px={2}
              py={1}
            >
              <HStack spacing={1}>
                <Icon 
                  as={trend === 'up' ? ArrowUpIcon : ArrowDownIcon} 
                  boxSize={3} 
                />
                <Text fontSize="xs">
                  {trend === 'up' ? 'Good' : trend === 'down' ? 'Alert' : 'Stable'}
                </Text>
              </HStack>
            </Badge>
          )}
        </HStack>
        
        <VStack spacing={1} align="start">
          <Text fontSize="xs" color={textSecondary} fontWeight="medium" textTransform="uppercase">
            {title}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
            {value}
          </Text>
          {subValue && (
            <Text fontSize="sm" color={textSecondary}>
              {subValue}
            </Text>
          )}
        </VStack>
        
        {progress !== undefined && (
          <Progress 
            value={progress} 
            colorScheme={color} 
            size="sm" 
            borderRadius="full"
            bg={useSemanticToken('surface.base')}
          />
        )}
        
        {sparklineData.length > 0 && (
          <Box h="40px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={`var(--chakra-colors-${color}-500)`}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
