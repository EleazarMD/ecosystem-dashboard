/**
 * Background Context Menu Component
 * 
 * Right-click menu for children's portal to customize background tiling
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Portal,
  useToast,
} from '@chakra-ui/react';
import { FiImage, FiGrid, FiMaximize, FiSquare, FiCheck } from 'react-icons/fi';

export type BackgroundMode = 'cover' | 'tile-small' | 'tile-medium' | 'tile-large';

interface BackgroundContextMenuProps {
  children: React.ReactNode;
  onModeChange: (mode: BackgroundMode) => void;
  currentMode: BackgroundMode;
}

const BACKGROUND_OPTIONS: { mode: BackgroundMode; label: string; icon: any; description: string }[] = [
  { mode: 'cover', label: '🖼️ Fill Screen', icon: FiMaximize, description: 'One big picture' },
  { mode: 'tile-large', label: '🔲 Big Tiles', icon: FiSquare, description: 'Large repeating pattern' },
  { mode: 'tile-medium', label: '🔳 Medium Tiles', icon: FiGrid, description: 'Medium repeating pattern' },
  { mode: 'tile-small', label: '▪️ Small Tiles', icon: FiGrid, description: 'Lots of small tiles' },
];

export function BackgroundContextMenu({ 
  children, 
  onModeChange, 
  currentMode 
}: BackgroundContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const toast = useToast();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show menu if right-clicking directly on the background container
    // Not on interactive content like inputs, buttons, text areas, or cards
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    
    // List of elements that should NOT trigger the background menu
    const interactiveElements = ['input', 'textarea', 'button', 'a', 'select', 'option'];
    const interactiveRoles = ['button', 'textbox', 'link', 'menuitem', 'option'];
    
    // Check if clicking on interactive element
    if (interactiveElements.includes(tagName)) {
      return; // Let default context menu show
    }
    
    // Check for role attribute
    const role = target.getAttribute('role');
    if (role && interactiveRoles.includes(role)) {
      return;
    }
    
    // Check if clicking inside a card, modal, or editable content
    const isInsideCard = target.closest('[data-card]') || 
                         target.closest('[role="dialog"]') ||
                         target.closest('[contenteditable="true"]') ||
                         target.closest('.chakra-card') ||
                         target.closest('.chakra-modal__content');
    
    if (isInsideCard) {
      return; // Let default context menu show
    }
    
    // Check if the target or parent has contentEditable
    if (target.isContentEditable || target.closest('[contenteditable]')) {
      return;
    }
    
    // Only trigger on background-like elements
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  const handleSelect = useCallback((mode: BackgroundMode) => {
    onModeChange(mode);
    setIsOpen(false);
    toast({
      title: '🎨 Background changed!',
      description: BACKGROUND_OPTIONS.find(o => o.mode === mode)?.label,
      status: 'success',
      duration: 2000,
    });
  }, [onModeChange, toast]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Adjust position if menu would go off screen (SSR safe)
  const adjustedX = typeof window !== 'undefined' 
    ? Math.min(position.x, window.innerWidth - 240) 
    : position.x;
  const adjustedY = typeof window !== 'undefined' 
    ? Math.min(position.y, window.innerHeight - 250) 
    : position.y;

  return (
    <>
      <Box onContextMenu={handleContextMenu} w="100%" h="100%">
        {children}
      </Box>

      {isOpen && (
        <Portal>
          <Box
            position="fixed"
            top={`${adjustedY}px`}
            left={`${adjustedX}px`}
            zIndex={9999}
            bg="white"
            borderRadius="xl"
            boxShadow="2xl"
            border="2px solid"
            borderColor="purple.200"
            overflow="hidden"
            minW="200px"
            onClick={(e) => e.stopPropagation()}
          >
            <Box px={3} py={2} bg="purple.50" borderBottom="2px solid" borderColor="purple.200">
              <HStack spacing={2}>
                <Text fontSize="lg">🎨</Text>
                <Text fontWeight="bold" fontSize="sm" color="purple.700">Background Style</Text>
              </HStack>
            </Box>
            
            <VStack spacing={0} align="stretch" p={1}>
              {BACKGROUND_OPTIONS.map((option) => (
                <HStack
                  key={option.mode}
                  px={3}
                  py={2}
                  cursor="pointer"
                  borderRadius="lg"
                  bg={currentMode === option.mode ? 'purple.100' : 'transparent'}
                  _hover={{ bg: currentMode === option.mode ? 'purple.200' : 'gray.100' }}
                  onClick={() => handleSelect(option.mode)}
                  spacing={3}
                >
                  <Box flex={1}>
                    <Text 
                      fontSize="sm" 
                      fontWeight={currentMode === option.mode ? 'bold' : 'medium'}
                      color={currentMode === option.mode ? 'purple.700' : 'gray.700'}
                    >
                      {option.label}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {option.description}
                    </Text>
                  </Box>
                  {currentMode === option.mode && (
                    <Icon as={FiCheck} color="purple.500" boxSize={5} />
                  )}
                </HStack>
              ))}
            </VStack>
          </Box>
        </Portal>
      )}
    </>
  );
}

export function getBackgroundStyles(mode: BackgroundMode): {
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
  backgroundAttachment: string;
} {
  switch (mode) {
    case 'cover':
      return {
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    case 'tile-small':
      return {
        backgroundSize: '150px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
        backgroundAttachment: 'scroll',
      };
    case 'tile-medium':
      return {
        backgroundSize: '300px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
        backgroundAttachment: 'scroll',
      };
    case 'tile-large':
      return {
        backgroundSize: '500px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
        backgroundAttachment: 'scroll',
      };
    default:
      return {
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
  }
}

export default BackgroundContextMenu;
