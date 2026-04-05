/**
 * Child Page Wrapper Component
 * 
 * Applies theme-specific background images to child portal pages
 */

import React, { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { useChildTheme } from './ChildThemeProvider';

type PageType = 'home' | 'chat' | 'email' | 'workspace' | 'art' | 'default';

interface ChildPageWrapperProps {
  children: ReactNode;
  pageType?: PageType;
  overlay?: boolean;
}

export function ChildPageWrapper({ 
  children, 
  pageType = 'default',
  overlay = false,
}: ChildPageWrapperProps) {
  const { colors, childExtras } = useChildTheme();
  
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  
  // Map page types to background images
  const getBackgroundImage = () => {
    if (!backgroundImages) return undefined;
    
    switch (pageType) {
      case 'home':
        return backgroundImages.home || backgroundImages.default;
      case 'chat':
        return backgroundImages.chat || backgroundImages.default;
      case 'email':
        return backgroundImages.email || backgroundImages.default;
      case 'workspace':
        return backgroundImages.default;
      case 'art':
        return backgroundImages.default;
      default:
        return backgroundImages.default;
    }
  };

  const backgroundImage = getBackgroundImage();
  const isPixelated = childExtras?.decorations?.cardStyle === 'pixelated';

  return (
    <Box
      minH="calc(100vh - 60px)"
      bg={colors?.background || '#f8fafc'}
      backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
      backgroundSize={pageType === 'home' ? (isPixelated ? '400px' : '500px') : 'cover'}
      backgroundPosition="center"
      backgroundRepeat={pageType === 'home' ? 'repeat' : 'no-repeat'}
      backgroundAttachment={pageType === 'home' ? 'scroll' : 'fixed'}
      position="relative"
    >
      {overlay && backgroundImage && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
          pointerEvents="none"
        />
      )}
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
}

export default ChildPageWrapper;
