import React from 'react';
import { Box, Text, Tooltip } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50% { box-shadow: 0 0 16px currentColor; }
`;

interface AchievementBadgeProps {
  emoji: string;
  name: string;
  description?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  earned?: boolean;
  isNew?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  emoji,
  name,
  description,
  color = '#667eea',
  size = 'md',
  earned = true,
  isNew = false,
}) => {
  const sizes = {
    sm: { box: '48px', emoji: 'lg', name: '2xs' },
    md: { box: '64px', emoji: '2xl', name: 'xs' },
    lg: { box: '80px', emoji: '3xl', name: 'sm' },
  };
  const s = sizes[size];

  return (
    <Tooltip label={description || name} placement="top">
      <Box
        position="relative"
        display="flex"
        flexDirection="column"
        alignItems="center"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{ transform: 'scale(1.1)' }}
      >
        {isNew && (
          <Box
            position="absolute"
            top="-4px"
            right="-4px"
            bg="red.500"
            color="white"
            fontSize="2xs"
            fontWeight="bold"
            borderRadius="full"
            px={1.5}
            py={0.5}
            zIndex={2}
            animation={`${float} 2s ease-in-out infinite`}
          >
            NEW
          </Box>
        )}
        <Box
          w={s.box}
          h={s.box}
          borderRadius="full"
          bg={earned ? `${color}15` : 'gray.100'}
          border="2px solid"
          borderColor={earned ? color : 'gray.200'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          opacity={earned ? 1 : 0.5}
          animation={earned ? `${float} 3s ease-in-out infinite` : undefined}
          filter={earned ? 'none' : 'grayscale(100%)'}
        >
          <Text fontSize={s.emoji}>{emoji}</Text>
        </Box>
        <Text fontSize={s.name} fontWeight="medium" color={earned ? 'gray.700' : 'gray.400'} mt={1} noOfLines={1}>
          {name}
        </Text>
      </Box>
    </Tooltip>
  );
};

interface AchievementShowcaseProps {
  achievements: Array<{
    id: string;
    emoji: string;
    name: string;
    description?: string;
    category?: string;
    earnedAt?: string;
  }>;
  color?: string;
  maxDisplay?: number;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  color = '#667eea',
  maxDisplay = 6,
}) => {
  const displayed = achievements.slice(0, maxDisplay);
  const remaining = achievements.length - displayed.length;

  if (achievements.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Text fontSize="3xl" mb={2}>🎯</Text>
        <Text fontSize="sm" color="gray.500">
          Keep learning to earn your first badge!
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={3} justifyContent="center">
        {displayed.map((a, i) => (
          <AchievementBadge
            key={a.id}
            emoji={a.emoji || '🏆'}
            name={a.name}
            description={a.description}
            color={color}
            size="sm"
            earned={true}
            isNew={i === 0 && a.earnedAt && (Date.now() - new Date(a.earnedAt).getTime()) < 86400000}
          />
        ))}
        {remaining > 0 && (
          <Box
            w="48px"
            h="48px"
            borderRadius="full"
            bg="gray.50"
            border="2px dashed"
            borderColor="gray.200"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mt="8px"
          >
            <Text fontSize="xs" color="gray.400" fontWeight="bold">+{remaining}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
