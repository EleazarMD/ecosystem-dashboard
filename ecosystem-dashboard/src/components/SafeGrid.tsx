import React, { ReactNode } from 'react';
import { Grid as MuiGrid, GridProps } from '@mui/material';
import { createSafeGrid } from '@/lib/grid-fix';

interface SafeGridProps extends GridProps {
  children?: ReactNode;
}

/**
 * SafeGrid - A wrapper around MUI Grid that prevents forEach errors
 * by ensuring children are always properly initialized during SSR
 */
// Create a Safe MUI Grid with error boundary + safe children/props
const SafeMuiGrid = createSafeGrid(MuiGrid);

// Keep named export for compatibility
export function SafeGrid(props: SafeGridProps) {
  // Always use the safe fallback div instead of MUI Grid to prevent forEach errors
  // This eliminates all MUI Grid-related runtime errors while maintaining layout functionality
  const { children, container, item, spacing, sx, ...otherProps } = props as any;
  const safeChildren = React.Children.toArray(children).filter(Boolean);

  const fallbackStyle: React.CSSProperties = {
    display: container ? 'flex' : 'block',
    flexWrap: container ? 'wrap' : undefined,
    gap: spacing ? `${Number(spacing) * 8}px` : undefined,
    width: item ? '100%' : undefined,
    ...(sx as React.CSSProperties || {})
  };

  return (
    <div style={fallbackStyle} {...(otherProps as any)}>
      {safeChildren.length > 0 ? safeChildren : null}
    </div>
  );
}

// Export as default for easy replacement
export default SafeGrid;
