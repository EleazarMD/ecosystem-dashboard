import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiChevronLeft } from 'react-icons/fi';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RetractablePanelProps {
  /**
   * Panel title
   */
  title: string;

  /**
   * Icon to show next to title
   */
  icon?: React.ElementType;

  /**
   * Icon color
   */
  iconColor?: string;

  /**
   * Panel content
   */
  children: React.ReactNode;

  /**
   * Header actions (buttons, etc.)
   */
  headerActions?: React.ReactNode;

  /**
   * Whether panel is collapsed
   */
  isCollapsed: boolean;

  /**
   * Callback when collapse state changes
   */
  onToggleCollapse?: () => void;

  /**
   * Panel width when expanded
   */
  width: number;

  /**
   * Callback when width changes
   */
  onWidthChange?: (width: number) => void;

  /**
   * Side to attach panel (left or right)
   */
  side?: 'left' | 'right';

  /**
   * Minimum width when resizing
   */
  minWidth?: number;

  /**
   * Maximum width when resizing
   */
  maxWidth?: number;

  /**
   * Top offset from page top
   */
  topOffset?: string;

  /**
   * Custom header content (replaces default title/icon)
   */
  customHeader?: React.ReactNode;
}

/**
 * Shared retractable panel component
 * Used by both Research Sessions and Podcast Sources panels
 * 
 * Features:
 * - Collapse/expand
 * - Resize with drag handle
 * - Fixed positioning
 * - Customizable header
 * - Scroll behavior
 */
export default function RetractablePanel({
  title,
  icon,
  iconColor = 'blue.500',
  children,
  headerActions,
  isCollapsed,
  onToggleCollapse,
  width,
  onWidthChange,
  side = 'left',
  minWidth = 300,
  maxWidth = 800,
  topOffset = '60px',
  customHeader,
}: RetractablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(width);
  const { width: sidebarWidth } = useSidebar();

  const bgColor = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('glass.border');
  const textColor = useSemanticToken('text.primary');
  const glassBlur = useSemanticToken('glass.blur');
  const surfacePopover = useSemanticToken('surface.popover');
  const surfaceRaised = useSemanticToken('surface.raised');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');

  // Panel resizing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = side === 'left'
        ? e.clientX - dragStartX.current
        : dragStartX.current - e.clientX;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, dragStartWidth.current + delta));
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, onWidthChange, side, minWidth, maxWidth]);

  // Collapsed state
  if (isCollapsed) {
    return (
      <Box
        position="fixed"
        left={side === 'left' ? `${sidebarWidth}px` : undefined}
        right={side === 'right' ? 0 : undefined}
        top={topOffset}
        bottom={0}
        width="50px"
        bg={bgColor}
        borderRight={side === 'left' ? '1px solid' : undefined}
        borderLeft={side === 'right' ? '1px solid' : undefined}
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        zIndex={99}
        backdropFilter={glassBlur}
      >
        <Tooltip
          label={`Expand ${title}`}
          placement={side === 'left' ? 'right' : 'left'}
          bg={useSemanticToken('surface.popover')}
          color={useSemanticToken('text.primary')}
        >
          <IconButton
            aria-label="Expand"
            icon={<FiChevronLeft style={{ transform: side === 'left' ? 'rotate(180deg)' : 'none' }} />}
            onClick={onToggleCollapse}
            variant="solid"
            size="sm"
            color={textColor}
            bg={useSemanticToken('surface.raised')}
            borderColor={useSemanticToken('border.subtle')}
            borderWidth="1px"
            _hover={{ bg: useSemanticToken('surface.hover') }}
          />
        </Tooltip>
      </Box>
    );
  }

  // Expanded state
  return (
    <Box
      position="fixed"
      left={side === 'left' ? `${sidebarWidth}px` : undefined}
      right={side === 'right' ? 0 : undefined}
      top={topOffset}
      height={`calc(100vh - ${topOffset})`}
      width={`${width}px`}
      bg={bgColor}
      borderRight={side === 'left' ? '1px solid' : undefined}
      borderLeft={side === 'right' ? '1px solid' : undefined}
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      zIndex={99}
      overflow="hidden"
      backdropFilter={glassBlur}
    >
      {/* Header */}
      {customHeader || (
        <HStack
          p={4}
          justify="space-between"
          align="center"
          borderBottom="1px solid"
          borderColor={borderColor}
          h="60px"
        >
          <HStack spacing={2}>
            {icon && <Icon as={icon} color={iconColor} boxSize={5} />}
            <Text fontSize="md" fontWeight="700" color={textColor}>
              {title}
            </Text>
          </HStack>

          <HStack spacing={1}>
            {headerActions}
            <Tooltip
              label="Collapse"
              bg={surfacePopover}
              color={textColor}
            >
              <IconButton
                aria-label="Collapse"
                icon={<FiChevronLeft style={{ transform: side === 'right' ? 'rotate(180deg)' : 'none' }} />}
                onClick={onToggleCollapse}
                variant="solid"
                size="sm"
                color={textColor}
                bg={surfaceRaised}
                borderColor={borderSubtle}
                borderWidth="1px"
                _hover={{ bg: surfaceHover }}
              />
            </Tooltip>
          </HStack>
        </HStack>
      )}

      {/* Content */}
      <Box
        flex={1}
        overflowY="auto"
        overflowX="hidden"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#A0AEC0',
            borderRadius: '3px',
          },
        }}
      >
        {children}
      </Box>

      {/* Resize Handle */}
      <Box
        position="absolute"
        right={side === 'left' ? 0 : undefined}
        left={side === 'right' ? 0 : undefined}
        top={0}
        bottom={0}
        width="4px"
        cursor="col-resize"
        bg="transparent"
        _hover={{ bg: 'blue.400' }}
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
}
