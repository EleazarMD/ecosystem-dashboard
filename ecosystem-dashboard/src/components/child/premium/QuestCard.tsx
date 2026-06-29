import React from 'react';
import { Box, Text, HStack, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.6; }
  100% { box-shadow: 0 0 0 12px currentColor; opacity: 0; }
`;

const slideIn = keyframes`
  0% { opacity: 0; transform: translateX(-20px); }
  100% { opacity: 1; transform: translateX(0); }
`;

interface QuestCardProps {
  title: string;
  description: string;
  emoji: string;
  color: string;
  progress: number;
  reward?: string;
  completed?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  emoji,
  color,
  progress,
  reward,
  completed = false,
  onClick,
  delay = 0,
}) => {
  return (
    <Box
      as={onClick ? 'button' : 'div'}
      onClick={onClick}
      w="full"
      textAlign="left"
      position="relative"
      borderRadius="2xl"
      p={4}
      bg={completed ? `${color}08` : 'white'}
      border="2px solid"
      borderColor={completed ? color : `${color}30`}
      overflow="hidden"
      transition="all 0.3s"
      _hover={onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 20px ${color}20`,
        borderColor: color,
      } : {}}
      animation={`${slideIn} 0.4s ease-out ${delay}ms both`}
    >
      {/* Progress bar background */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        h="3px"
        bg={color}
        borderRadius="full"
        transition="width 0.8s cubic-bezier(0.4,0,0.2,1)"
        style={{ width: `${progress}%` }}
      />

      <HStack spacing={3} align="start">
        <Box
          w="44px"
          h="44px"
          borderRadius="xl"
          bg={`${color}15`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          position="relative"
        >
          <Text fontSize="xl">{emoji}</Text>
          {completed && (
            <Box
              position="absolute"
              top="-2px"
              right="-2px"
              w="16px"
              h="16px"
              borderRadius="full"
              bg={color}
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xs"
              fontWeight="bold"
            >
              ✓
            </Box>
          )}
        </Box>
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="bold" fontSize="sm" color="gray.800" noOfLines={1}>
            {title}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={2}>
            {description}
          </Text>
          {reward && (
            <HStack spacing={1} mt={1}>
              <Text fontSize="2xs" color={color} fontWeight="bold">
                🎁 {reward}
              </Text>
            </HStack>
          )}
        </VStack>
        {!completed && progress > 0 && (
          <Text fontSize="xs" fontWeight="bold" color={color}>
            {progress}%
          </Text>
        )}
      </HStack>
    </Box>
  );
};

interface DailyQuestsProps {
  quests: QuestCardProps[];
}

export const DailyQuests: React.FC<DailyQuestsProps> = ({ quests }) => {
  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;

  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="bold" fontSize="md" color="gray.700">
          🎯 Today's Quests
        </Text>
        <Box
          bg="purple.50"
          borderRadius="full"
          px={3}
          py={1}
        >
          <Text fontSize="xs" fontWeight="bold" color="purple.600">
            {completedCount}/{totalCount} done
          </Text>
        </Box>
      </HStack>
      <VStack spacing={2} align="stretch">
        {quests.map((q, i) => (
          <QuestCard key={i} {...q} delay={i * 80} />
        ))}
      </VStack>
    </Box>
  );
};
