/**
 * Professional Animations & Transitions
 * Inspired by Linear, Vercel, and modern SaaS applications
 */

import { keyframes } from '@emotion/react';

/**
 * Easing functions - Natural motion curves
 */
export const easings = {
  // Standard easing
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  
  // Sharp easing
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  
  // Expressive easing
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  
  // Smooth easing (Linear-inspired)
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

/**
 * Duration scales (ms)
 */
export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

/**
 * Theme transition configuration
 */
export const themeTransition = {
  property: 'background-color, color, border-color, box-shadow',
  duration: `${durations.normal}ms`,
  easing: easings.smooth,
};

/**
 * Keyframe animations
 */

// Fade in
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Slide up
export const slideUp = keyframes`
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Slide down
export const slideDown = keyframes`
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Scale in
export const scaleIn = keyframes`
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

// Shimmer (loading skeleton)
export const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// Pulse (subtle breathing effect)
export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
`;

// Glow (for glassmorphic effects)
export const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(var(--chakra-colors-brand-500), 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(var(--chakra-colors-brand-500), 0.4);
  }
`;

// Spin (for loading indicators)
export const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Bounce (for micro-interactions)
export const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
`;

// Color morph (theme transition)
export const colorMorph = keyframes`
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
`;

/**
 * Preset animation configs
 */
export const animations = {
  // Fade animations
  fadeIn: {
    animation: `${fadeIn} ${durations.normal}ms ${easings.easeOut}`,
  },
  fadeInSlow: {
    animation: `${fadeIn} ${durations.slow}ms ${easings.easeOut}`,
  },
  
  // Slide animations
  slideUp: {
    animation: `${slideUp} ${durations.normal}ms ${easings.smooth}`,
  },
  slideDown: {
    animation: `${slideDown} ${durations.normal}ms ${easings.smooth}`,
  },
  
  // Scale animations
  scaleIn: {
    animation: `${scaleIn} ${durations.normal}ms ${easings.bounce}`,
  },
  
  // Loading states
  shimmer: {
    animation: `${shimmer} 2000ms linear infinite`,
    backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
    backgroundSize: '1000px 100%',
  },
  pulse: {
    animation: `${pulse} 2000ms ${easings.easeInOut} infinite`,
  },
  spin: {
    animation: `${spin} 1000ms linear infinite`,
  },
  
  // Micro-interactions
  bounce: {
    animation: `${bounce} 600ms ${easings.bounce}`,
  },
  glow: {
    animation: `${glow} 2000ms ${easings.easeInOut} infinite`,
  },
};

/**
 * Hover effects
 */
export const hoverEffects = {
  // Lift
  lift: {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
  },
  
  // Scale
  scale: {
    transform: 'scale(1.02)',
  },
  
  // Glow
  glow: {
    boxShadow: '0 0 20px rgba(var(--chakra-colors-brand-500), 0.3)',
  },
  
  // Brighten
  brighten: {
    filter: 'brightness(1.1)',
  },
};

/**
 * Stagger animation delays
 * For animating lists of items sequentially
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

/**
 * Spring animation config (for framer-motion)
 */
export const springConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Page transition variants (for framer-motion)
 */
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};

/**
 * Modal/Dialog transition variants
 */
export const modalTransition = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
};

/**
 * Glassmorphic shimmer effect
 */
export const glassShimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

export const glassShimmerAnimation = {
  background: `
    linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 50%,
      transparent 100%
    )
  `,
  backgroundSize: '200% 100%',
  animation: `${glassShimmer} 3s ease-in-out infinite`,
};
