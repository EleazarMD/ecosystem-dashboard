/**
 * @deprecated This component has been renamed to AHISActivityMonitor.
 * Please update your imports to use the new name.
 * This file is maintained for backward compatibility and will be removed in a future release.
 */

import React from 'react';
import { BoxProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import AHISActivityMonitor from './AHISActivityMonitor';

// Re-export the interface for backward compatibility
interface MCPActivityMonitorProps extends BoxProps { }

/**
 * This component is a wrapper around AHISActivityMonitor for backward compatibility.
 * It logs a deprecation warning to the console when used.
 */
const MCPActivityMonitor: React.FC<MCPActivityMonitorProps> = (props) => {
  // Log deprecation warning in development only
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'MCPActivityMonitor is deprecated and will be removed in a future release. ' +
      'Please use AHISActivityMonitor instead.'
    );
  }
  
  // Pass all props to AHISActivityMonitor
  return <AHISActivityMonitor {...props} />;
};

export default MCPActivityMonitor;

// Also export the new component name to make migration easier
export { default as AHISActivityMonitor } from './AHISActivityMonitor';
