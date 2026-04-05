import React from 'react';
import { Box, BoxProps, Input, InputProps, Button, ButtonProps, IconButton, IconButtonProps, forwardRef } from '@chakra-ui/react';
import { useAdaptiveGlass, GlassmorphicOptions, useAdaptiveGlassHover } from '@/hooks/useAdaptiveGlass';
import { motion, HTMLMotionProps } from 'framer-motion';

// Create motion components
const MotionBox = motion(Box);

interface GlassBoxProps extends BoxProps {
  glassOptions?: GlassmorphicOptions;
  children?: React.ReactNode;
}

/**
 * GlassBox - A container with adaptive glassmorphism
 */
export const GlassBox = forwardRef<GlassBoxProps, 'div'>((props, ref) => {
  const { glassOptions, children, ...rest } = props;
  const glassStyles = useAdaptiveGlass(glassOptions);

  return (
    <Box
      ref={ref}
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border={glassStyles.border}
      boxShadow={glassStyles.boxShadow}
      borderRadius={glassStyles.borderRadius || 'lg'}
      {...rest}
    >
      {children}
    </Box>
  );
});

/**
 * GlassMenu - A menu container with entrance animation
 */
export const GlassMenu = forwardRef<GlassBoxProps, 'div'>((props, ref) => {
  const { glassOptions, children, ...rest } = props;
  const glassStyles = useAdaptiveGlass({
    intensity: 0.6,
    shadow: true,
    ...glassOptions
  });

  return (
    <MotionBox
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.2, 0, 0.13, 1.5] }} // Slight bounce
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border={glassStyles.border}
      boxShadow="0 12px 36px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)" // Enhanced shadow for menus
      borderRadius="xl"
      overflow="hidden"
      {...rest}
    >
      {children}
    </MotionBox>
  );
});

/**
 * GlassInput - An input field with glass styling
 */
export const GlassInput = forwardRef<InputProps & { glassOptions?: GlassmorphicOptions }, 'input'>((props, ref) => {
  const { glassOptions, ...rest } = props;
  const glassStyles = useAdaptiveGlass({
    intensity: 0.4,
    shadow: false,
    ...glassOptions
  });
  const hoverStyles = useAdaptiveGlassHover();

  return (
    <Input
      ref={ref}
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border={glassStyles.border}
      borderRadius="md"
      _hover={{
        bg: hoverStyles.background,
        borderColor: 'whiteAlpha.300'
      }}
      _focus={{
        bg: hoverStyles.background,
        borderColor: 'whiteAlpha.200',
        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
      }}
      {...rest}
    />
  );
});

/**
 * GlassButton - A button with glass styling
 */
export const GlassButton = forwardRef<ButtonProps & { glassOptions?: GlassmorphicOptions }, 'button'>((props, ref) => {
  const { glassOptions, ...rest } = props;
  const glassStyles = useAdaptiveGlass({
    intensity: 0.4,
    shadow: false,
    ...glassOptions
  });
  const hoverStyles = useAdaptiveGlassHover();

  return (
    <Button
      ref={ref}
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="full" // Pill shape for modern look
      fontWeight="medium"
      _hover={{
        bg: hoverStyles.background,
        borderColor: 'whiteAlpha.200',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}
      _active={{
        transform: 'translateY(0)',
        boxShadow: 'none',
        bg: 'rgba(0, 0, 0, 0.05)'
      }}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      {...rest}
    />
  );
});

/**
 * GlassIconButton - An icon button with glass styling
 */
export const GlassIconButton = forwardRef<IconButtonProps & { glassOptions?: GlassmorphicOptions }, 'button'>((props, ref) => {
  const { glassOptions, ...rest } = props;
  const glassStyles = useAdaptiveGlass({
    intensity: 0.4,
    shadow: false,
    ...glassOptions
  });
  const hoverStyles = useAdaptiveGlassHover();

  return (
    <IconButton
      ref={ref}
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="full" // Circular for icon buttons
      _hover={{
        bg: hoverStyles.background,
        borderColor: 'whiteAlpha.200',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}
      _active={{
        transform: 'translateY(0)',
        boxShadow: 'none',
        bg: 'rgba(0, 0, 0, 0.05)'
      }}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      {...rest}
    />
  );
});
