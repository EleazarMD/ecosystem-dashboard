import React, { ReactNode } from 'react';
import { Stat, StatProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface StatWrapperProps extends StatProps {
  children: ReactNode;
}

/**
 * StatWrapper - Ensures all Chakra UI Stat components are properly wrapped
 * 
 * This component wraps any StatHelpText, StatLabel, or StatNumber components
 * in a Stat component if they're not already wrapped, preventing the
 * "useStatStyles returned is 'undefined'" context error.
 * 
 * Forwards all props to the underlying Stat component.
 */
export const StatWrapper: React.FC<StatWrapperProps> = ({ children, ...props }) => {
  return <Stat {...props}>{children}</Stat>;
};

export default StatWrapper;
