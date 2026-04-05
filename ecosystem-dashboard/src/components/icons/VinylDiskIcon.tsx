import React from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface VinylDiskIconProps {
  size?: number;
  color?: string;
}

/**
 * Custom Vinyl Disk Icon
 * Renders a vinyl record with concentric circles
 */
export const VinylDiskIcon: React.FC<VinylDiskIconProps> = ({ 
  size = 24, 
  color = 'currentColor' 
}) => {
  return (
    <Box
      as="svg"
      width={`${size}px`}
      height={`${size}px`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle (vinyl edge) */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Grooves - outer ring */}
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0.6"
      />
      
      {/* Grooves - middle ring */}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
      
      {/* Grooves - inner ring */}
      <circle
        cx="12"
        cy="12"
        r="5"
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        opacity="0.4"
      />
      
      {/* Label area */}
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill={color}
        opacity="0.15"
      />
      
      {/* Center hole */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill={color}
      />
    </Box>
  );
};

export default VinylDiskIcon;
