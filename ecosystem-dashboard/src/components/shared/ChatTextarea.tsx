/**
 * Shared Chat Textarea Component
 * 
 * Reusable textarea for all chat interfaces with consistent behavior:
 * - Proper whitespace handling (trims trailing spaces on copy)
 * - Auto-resize based on content
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Consistent styling and UX
 */

import React, { forwardRef } from 'react';
import { Textarea, TextareaProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface ChatTextareaProps extends Omit<TextareaProps, 'onSubmit'> {
  onSubmit?: () => void;
  variant?: 'default' | 'compact' | 'research';
}

export const ChatTextarea = forwardRef<HTMLTextAreaElement, ChatTextareaProps>(
  ({ onSubmit, variant = 'default', sx, ...props }, ref) => {
    const mutedColor = useSemanticToken('text.tertiary');

    // Variant-specific sizing
    const variantStyles = {
      default: {
        minH: '28px',
        maxH: '56px',
        rows: 1,
      },
      compact: {
        minH: '40px',
        maxH: '120px',
        rows: 2,
      },
      research: {
        minH: '60px',
        maxH: '300px',
        rows: 3,
      },
    };

    const styles = variantStyles[variant];

    return (
      <Textarea
        ref={ref}
        resize="none"
        overflow="hidden"
        onKeyDown={(e) => {
          // Enter to send (Shift+Enter for new line)
          if (onSubmit && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
          
          // Call parent onKeyDown if provided
          props.onKeyDown?.(e);
        }}
        onCopy={(e) => {
          // Trim trailing spaces when copying
          const selection = window.getSelection();
          if (selection) {
            const text = selection.toString().trimEnd();
            e.clipboardData.setData('text/plain', text);
            e.preventDefault();
          }
        }}
        sx={{
          // CRITICAL: Proper whitespace handling - preserve spaces but allow wrap
          whiteSpace: 'pre-wrap',  // Preserve formatting but wrap long lines
          lineHeight: '1.5',
          verticalAlign: 'middle',
          
          // Auto-grow with content
          '&:focus': {
            overflow: 'auto',
          },
          
          // Custom scrollbar
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: mutedColor,
            borderRadius: '2px',
          },
          
          // Merge with custom sx
          ...sx,
        }}
        {...styles}
        {...props}
      />
    );
  }
);

ChatTextarea.displayName = 'ChatTextarea';

export default ChatTextarea;
