/**
 * Goose Floating Button
 * Notion-style floating AI assistant for page editing
 * Appears in bottom-right corner when viewing a workspace page
 */

import React, { useState } from 'react';
import {
  Box,
  Tooltip,
  Badge,
  Portal,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIContext } from '@/contexts/AIContextManager';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// CSS animations
const pulseAnimation = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;

const bounceAnimation = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`;

interface GooseFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  pageTitle?: string;
}

export const GooseFloatingButton: React.FC<GooseFloatingButtonProps> = ({
  onClick,
  isOpen,
  pageTitle,
}) => {
  const { context, getContextSummary } = useAIContext();
  const { isOpen: isRightPanelOpen } = useRightPanel();
  const [isHovered, setIsHovered] = useState(false);

  const badgeBg = 'green.500';
  const buttonBg = useSemanticToken('surface.elevated');

  // Show badge if page context is active
  const hasPageContext = context?.type === 'workspace-page';
  const contextSummary = getContextSummary();

  // Don't show if already in sidebar mode
  if (isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            right: isRightPanelOpen ? '410px' : '55px', // Closer to vertical icon bar when closed
          }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            bottom: '20px', // Match panel bottom
            zIndex: 1000,
          }}
        >
          <Tooltip
            label={
              <Box>
                <Box fontWeight="semibold">Ask Goose about this page</Box>
                <Box fontSize="xs" mt={1} opacity={0.8}>
                  {contextSummary}
                </Box>
                <Box fontSize="xs" mt={1} opacity={0.6}>
                  Press ⌘J to open
                </Box>
              </Box>
            }
            placement="left"
            hasArrow
          >
            <Box position="relative">
              {/* Active context badge */}
              {hasPageContext && (
                <Badge
                  position="absolute"
                  top="-4px"
                  right="-4px"
                  bg={badgeBg}
                  color="whiteAlpha.900"
                  borderRadius="full"
                  width="12px"
                  height="12px"
                  zIndex={1}
                  animation={`${pulseAnimation} 2s ease-in-out infinite`}
                />
              )}

              {/* Main button - Just the goose icon */}
              <Box
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                cursor="pointer"
                transition="all 0.2s"
                borderRadius="full"
                overflow="hidden"
                width="56px"
                height="56px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={buttonBg}
                boxShadow="0 4px 16px rgba(251, 243, 219, 0.6), 0 2px 8px rgba(0, 0, 0, 0.1)"
                _hover={{
                  transform: 'scale(1.1)',
                  boxShadow: "0 6px 20px rgba(251, 243, 219, 0.8), 0 3px 10px rgba(0, 0, 0, 0.15)",
                }}
                _active={{
                  transform: 'scale(0.95)',
                }}
              >
                <GooseIcon isHovered={isHovered} />
              </Box>
            </Box>
          </Tooltip>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

// Goose icon component with hover animation
const GooseIcon: React.FC<{ isHovered: boolean }> = ({ isHovered }) => {
  const iconFilter = useSemanticToken('surface.base') === '#ffffff' ? 'none' : 'invert(1) brightness(1.2)';
  
  return (
    <motion.div
      animate={{
        rotate: isHovered ? [0, -10, 10, -10, 0] : 0,
      }}
      transition={{ duration: 0.5 }}
      style={{
        marginLeft: '-2px',
        marginTop: '2px',
      }}
    >
      <Box
        as="img"
        src="/goose-icon.png"
        alt="Goose AI"
        w="48px"
        h="48px"
      />
    </motion.div>
  );
};

export default GooseFloatingButton;
