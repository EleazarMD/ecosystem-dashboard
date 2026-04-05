import React from 'react';
import { Box, keyframes } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Voice visualization animations
const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const waveAnimation = keyframes`
  0%, 100% { height: 4px; }
  50% { height: 20px; }
`;

const rippleAnimation = keyframes`
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
`;

interface VoiceBubbleProps {
  isListening?: boolean;
  audioLevel?: number;
  size?: number;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  isListening = false,
  audioLevel = 0,
  size = 120
}) => {
  return (
    <Box
      position="relative"
      w={`${size}px`}
      h={`${size}px`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      _hover={{ transform: 'scale(1.05)' }}
      transition="all 0.2s ease"
    >
      {/* Main Voice Bubble */}
      <Box
        w={`${size}px`}
        h={`${size}px`}
        borderRadius="50%"
        background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 8px 32px rgba(102, 126, 234, 0.3)"
        animation={isListening ? `${pulseAnimation} 2s ease-in-out infinite` : undefined}
        position="relative"
        overflow="hidden"
      >
        {/* Ripple Effect */}
        {isListening && (
          <>
            <Box
              position="absolute"
              top="0"
              left="0"
              w="100%"
              h="100%"
              borderRadius="50%"
              border="2px solid"
              borderColor={useSemanticToken('border.subtle')}
              animation={`${rippleAnimation} 2s ease-out infinite`}
            />
            <Box
              position="absolute"
              top="0"
              left="0"
              w="100%"
              h="100%"
              borderRadius="50%"
              border="2px solid"
              borderColor={useSemanticToken('border.subtle')}
              animation={`${rippleAnimation} 2s case-out infinite 0.5s`}
            />
          </>
        )}

        {/* Inner Content */}
        <Box
          w={`${size * 0.4}px`}
          h={`${size * 0.4}px`}
          borderRadius="50%"
          bg={useSemanticToken('glass.background')}
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          {/* Voice Wave Indicators */}
          {isListening && (
            <Box display="flex" alignItems="center" gap="2px">
              {[...Array(5)].map((_, i) => (
                <Box
                  key={i}
                  w="3px"
                  bg={useSemanticToken('surface.elevated')}
                  borderRadius="2px"
                  animation={`${waveAnimation} 1s ease-in-out infinite`}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: isListening ? `${12 + audioLevel * 20}px` : '4px'
                  }}
                />
              ))}
            </Box>
          )}

          {/* Static Icon when not listening */}
          {!isListening && (
            <Box
              w="16px"
              h="16px"
              borderRadius="50%"
              bg={useSemanticToken('surface.elevated')}
              opacity="0.9"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="50%"
                bg="rgba(102, 126, 234, 0.8)"
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
