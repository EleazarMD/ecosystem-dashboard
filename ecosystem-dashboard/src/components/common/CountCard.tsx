import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Text,
  Heading,
  Flex,
  Center,
  Icon,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as BiIcons from 'react-icons/bi';

interface CountCardProps {
  title: string;
  count: number;
  icon: string | IconType;
  color?: string;
}

/**
 * Count Card Component
 * 
 * Displays a metric with an icon, title, and count
 */
const CountCard: React.FC<CountCardProps> = ({ title, count, icon, color = 'blue.500' }) => {
  // Get the icon component if a string is provided
  const getIconComponent = () => {
    if (typeof icon !== 'string') {
      return icon;
    }
    
    // Try to find the icon in various icon libraries
    const faIcon = FaIcons[icon as keyof typeof FaIcons];
    const aiIcon = AiIcons[icon as keyof typeof AiIcons];
    const biIcon = BiIcons[icon as keyof typeof BiIcons];
    
    return faIcon || aiIcon || biIcon || FaIcons.FaQuestionCircle;
  };
  
  // Get background color with opacity
  const bgColor = useSemanticToken('surface.highlight');
  
  const IconComponent = getIconComponent();
  
  return (
    <Card variant="outline" height="100%">
      <CardBody>
        <Flex align="center" mb={2}>
          <Center
            borderRadius="full"
            bg={bgColor}
            p={2}
            mr={2}
          >
            <Icon as={IconComponent} color={color} boxSize={5} />
          </Center>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            {title}
          </Text>
        </Flex>
        <Heading size="lg" fontWeight="bold">
          {count.toLocaleString()}
        </Heading>
      </CardBody>
    </Card>
  );
};

export default CountCard;
