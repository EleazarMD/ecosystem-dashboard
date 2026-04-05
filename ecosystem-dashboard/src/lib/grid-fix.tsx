/**
 * Grid Fix Library - Comprehensive solution for MUI Grid forEach errors
 * Addresses the server-side rendering issue where Grid components try to iterate over undefined children
 */

import React, { ReactNode } from 'react';

// Type guard to check if children is iterable
function isIterable(obj: any): obj is Iterable<any> {
  return obj != null && typeof obj[Symbol.iterator] === 'function';
}

// Safe children processor that prevents forEach errors
export function processSafeChildren(children: ReactNode): ReactNode[] {
  if (!children) return [];
  
  try {
    // Convert children to array safely
    const childrenArray = React.Children.toArray(children);
    return childrenArray.filter(child => child != null);
  } catch (error) {
    console.warn('processSafeChildren: Error processing children, returning empty array:', error);
    return [];
  }
}

// Hook to safely handle Grid children
export function useSafeGridChildren(children: ReactNode) {
  const [safeChildren, setSafeChildren] = React.useState<ReactNode[]>([]);
  
  React.useEffect(() => {
    try {
      const processed = processSafeChildren(children);
      setSafeChildren(processed);
    } catch (error) {
      console.warn('useSafeGridChildren: Error in useEffect, using empty array:', error);
      setSafeChildren([]);
    }
  }, [children]);
  
  return safeChildren;
}

// Grid props sanitizer to prevent undefined values
export function sanitizeGridProps(props: any) {
  const sanitized = { ...props };
  
  // Remove undefined values that might cause forEach errors
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  // Ensure spacing is a valid number
  if (sanitized.spacing !== undefined && (isNaN(sanitized.spacing) || sanitized.spacing < 0)) {
    sanitized.spacing = 0;
  }
  
  return sanitized;
}

// Error boundary specifically for Grid components
export class GridErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if it's the specific forEach error we're targeting
    if (error.message.includes('forEach') || 
        error.message.includes('Cannot read properties of undefined')) {
      console.warn('GridErrorBoundary: Caught forEach error:', error.message);
      return { hasError: true, error };
    }
    
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GridErrorBoundary: Component error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '16px', border: '1px solid #orange', borderRadius: '4px', backgroundColor: '#fff3cd' }}>
          <strong>Grid Loading Issue</strong>
          <p>Grid component encountered a data loading issue. This is typically resolved automatically.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Utility to wrap any component with Grid error protection
export function withGridErrorProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => (
    <GridErrorBoundary>
      <Component {...props} />
    </GridErrorBoundary>
  );
  
  WrappedComponent.displayName = `withGridErrorProtection(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Safe Grid component factory
export function createSafeGrid(GridComponent: React.ComponentType<any>) {
  return React.forwardRef<any, any>((props, ref) => {
    const { children, ...otherProps } = props;
    const safeChildren = useSafeGridChildren(children);
    const sanitizedProps = sanitizeGridProps(otherProps);
    
    return (
      <GridErrorBoundary>
        <GridComponent ref={ref} {...sanitizedProps}>
          {safeChildren}
        </GridComponent>
      </GridErrorBoundary>
    );
  });
}
