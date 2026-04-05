import React from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { MapPin, Users } from 'lucide-react';

interface FamilyLocationCardProps {
  isTesla?: boolean;
}

const FamilyLocationCard: React.FC<FamilyLocationCardProps> = ({ isTesla = false }) => {
  return (
    <Box
      bg={isTesla ? 'rgba(30, 30, 35, 0.8)' : 'white'}
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor={isTesla ? 'gray.700' : 'gray.200'}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={Users} color="blue.400" boxSize={5} />
            <Text fontWeight="semibold" color={isTesla ? 'white' : 'gray.800'}>
              Family Locations
            </Text>
          </HStack>
          <Badge colorScheme="blue" variant="subtle">Live</Badge>
        </HStack>

        <VStack align="stretch" spacing={2}>
          <Flex justify="space-between" align="center">
            <HStack>
              <Icon as={MapPin} color="green.400" boxSize={4} />
              <Text fontSize="sm" color={isTesla ? 'gray.300' : 'gray.600'}>
                Home
              </Text>
            </HStack>
            <Text fontSize="xs" color={isTesla ? 'gray.400' : 'gray.500'}>
              Present
            </Text>
          </Flex>

          <Flex justify="space-between" align="center">
            <HStack>
              <Icon as={MapPin} color="blue.400" boxSize={4} />
              <Text fontSize="sm" color={isTesla ? 'gray.300' : 'gray.600'}>
                Work
              </Text>
            </HStack>
            <Text fontSize="xs" color={isTesla ? 'gray.400' : 'gray.500'}>
              Away
            </Text>
          </Flex>
        </VStack>
      </VStack>
    </Box>
  );
};

export default FamilyLocationCard;
