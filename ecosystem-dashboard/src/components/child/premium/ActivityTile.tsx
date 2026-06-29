import React from 'react';
import { Box, Text, HStack, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const bounceIn = keyframes`
  0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
  50% { opacity: 1; transform: scale(1.1) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
`;

interface ActivityTileProps {
  emoji: string;
  label: string;
  description: string;
  color: string;
  path?: string;
  isImage?: boolean;
  disabled?: boolean;
  isMinecraft?: boolean;
  isTransparent?: boolean;
  badge?: string;
  isNew?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const ActivityTile: React.FC<ActivityTileProps> = ({
  emoji,
  label,
  description,
  color,
  disabled = false,
  isMinecraft = false,
  isTransparent = false,
  badge,
  isNew = false,
  onClick,
  delay = 0,
  isImage = false,
}) => {
  const mcBg = 'rgba(245, 222, 179, 0.75)';
  const mcHoverBg = 'rgba(245, 222, 179, 0.9)';
  const mcShadow = '4px 4px 0px #5D8C3E';
  const mcHoverShadow = '6px 6px 0px #55CDFC';

  return (
    <Box
      as="button"
      onClick={disabled ? undefined : onClick}
      bg={isMinecraft ? mcBg : isTransparent ? 'rgba(255, 255, 255, 0.7)' : 'white'}
      borderRadius={isMinecraft ? '4px' : '2xl'}
      p={4}
      textAlign="center"
      boxShadow={isMinecraft ? mcShadow : 'md'}
      transition="all 0.25s cubic-bezier(0.4,0,0.2,1)"
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      backdropFilter={(isTransparent || isMinecraft) ? 'blur(8px)' : undefined}
      border={isMinecraft ? '3px solid #8B5A2B' : '2px solid transparent'}
      _hover={disabled ? {} : {
        transform: isMinecraft ? 'translate(-2px, -2px)' : 'translateY(-6px) scale(1.02)',
        boxShadow: isMinecraft ? mcHoverShadow : `0 12px 24px ${color}30`,
        bg: isMinecraft ? mcHoverBg : isTransparent ? 'rgba(255, 255, 255, 0.85)' : 'white',
        borderColor: isMinecraft ? undefined : color,
      }}
      _active={disabled ? {} : { transform: 'scale(0.98)', borderColor: color }}
      position="relative"
      w="full"
      animation={`${bounceIn} 0.5s ease-out ${delay}ms both`}
    >
      {disabled && (
        <Box
          position="absolute"
          top={2}
          right={2}
          fontSize="sm"
          opacity={0.5}
        >
          🔒
        </Box>
      )}
      {isNew && (
        <Box
          position="absolute"
          top={-1}
          right={-1}
          bg="red.500"
          color="white"
          fontSize="2xs"
          fontWeight="bold"
          borderRadius="full"
          px={2}
          py={0.5}
          zIndex={2}
          animation={`${wiggle} 1s ease-in-out infinite`}
        >
          NEW
        </Box>
      )}
      {badge && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg={`${color}20`}
          color={color}
          fontSize="2xs"
          fontWeight="bold"
          borderRadius="full"
          px={2}
          py={0.5}
        >
          {badge}
        </Box>
      )}
      <Box
        mx="auto"
        mb={2}
        w="52px"
        h="52px"
        borderRadius={isMinecraft ? '4px' : 'xl'}
        bg={`${color}15`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.3s"
        _hover={disabled ? {} : { transform: 'scale(1.1)', bg: `${color}25` }}
      >
        {isImage ? (
          <Box
            as="img"
            src={emoji}
            alt={label}
            w="32px"
            h="32px"
            objectFit="contain"
            style={{ imageRendering: isMinecraft ? 'pixelated' : 'auto' }}
          />
        ) : (
          <Text fontSize="2xl">{emoji}</Text>
        )}
      </Box>
      <Text fontWeight="bold" fontSize="sm" color={isMinecraft ? '#2C2C2C' : 'gray.800'}>
        {label}
      </Text>
      <Text fontSize="2xs" color="gray.500" mt={0.5}>
        {description}
      </Text>
    </Box>
  );
};
