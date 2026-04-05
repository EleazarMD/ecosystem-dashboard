import React from 'react';
import { Box, Text, Heading } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface StatPanelProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  isLoading?: boolean;
}

const StatPanel: React.FC<StatPanelProps> = ({ 
  title,
  value,
  unit,
  description,
  isLoading = false 
}) => {
  const bgColor = useSemanticToken('surface.base');
  const headingColor = useSemanticToken('text.secondary');
  const valueColor = useSemanticToken('text.primary');
  const descColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box 
      p={5} 
      shadow="md" 
      borderWidth="1px" 
      borderColor={borderColor}
      borderRadius="lg" 
      bg={bgColor}
      minWidth="200px"
    >
      <Heading size="sm" color={headingColor} mb={1}>
        {title}
      </Heading>
      <Text fontSize="3xl" fontWeight="bold" color={valueColor}>
        {isLoading ? 'Loading...' : value}{unit && !isLoading && <Text as="span" fontSize="xl" ml={1}>{unit}</Text>}
      </Text>
      {description && (
        <Text fontSize="sm" color={descColor} mt={2}>
          {description}
        </Text>
      )}
    </Box>
  );
};

export default StatPanel;
