/**
 * useTextSelection - Platform-wide text selection detection hook
 * 
 * Provides selection state and position for floating toolbars.
 * Used by FormatToolbar across the platform (workspace, child workspace, journal, etc.)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SelectionState {
  isActive: boolean;
  text: string;
  position: { x: number; y: number };
  range: Range | null;
}

export interface UseTextSelectionOptions {
  /** Container ref to limit selection detection scope */
  containerRef?: React.RefObject<HTMLElement>;
  /** Minimum characters to trigger toolbar */
  minLength?: number;
  /** Delay before showing toolbar (ms) */
  delay?: number;
  /** Whether selection detection is enabled */
  enabled?: boolean;
}

export function useTextSelection(options: UseTextSelectionOptions = {}) {
  const {
    containerRef,
    minLength = 1,
    delay = 10,
    enabled = true,
  } = options;

  const [selection, setSelection] = useState<SelectionState>({
    isActive: false,
    text: '',
    position: { x: 0, y: 0 },
    range: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateSelection = useCallback(() => {
    if (!enabled) {
      setSelection(prev => prev.isActive ? { ...prev, isActive: false } : prev);
      return;
    }

    const sel = window.getSelection();

    // No selection or collapsed (just cursor)
    if (!sel || sel.isCollapsed) {
      setSelection(prev => prev.isActive ? { 
        isActive: false, 
        text: '', 
        position: { x: 0, y: 0 }, 
        range: null 
      } : prev);
      return;
    }

    const text = sel.toString().trim();

    // Check minimum length
    if (text.length < minLength) {
      setSelection(prev => prev.isActive ? { 
        isActive: false, 
        text: '', 
        position: { x: 0, y: 0 }, 
        range: null 
      } : prev);
      return;
    }

    // Check if selection is within container (if specified)
    if (containerRef?.current) {
      const range = sel.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setSelection(prev => prev.isActive ? { 
          isActive: false, 
          text: '', 
          position: { x: 0, y: 0 }, 
          range: null 
        } : prev);
        return;
      }
    }

    // Get selection bounds
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate position (centered above selection)
    const x = rect.left + (rect.width / 2);
    const y = rect.top;

    setSelection({
      isActive: true,
      text,
      position: { x, y },
      range: range.cloneRange(),
    });
  }, [enabled, minLength, containerRef]);

  const debouncedUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(updateSelection, delay);
  }, [updateSelection, delay]);

  // Clear selection state
  const clearSelection = useCallback(() => {
    setSelection({
      isActive: false,
      text: '',
      position: { x: 0, y: 0 },
      range: null,
    });
  }, []);

  // Apply formatting to current selection
  const applyFormat = useCallback((command: string, value?: string) => {
    if (!selection.range) return false;

    // Restore selection
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(selection.range);
    }

    // Execute command
    document.execCommand(command, false, value);
    return true;
  }, [selection.range]);

  useEffect(() => {
    if (!enabled) return;

    const handleSelectionChange = () => debouncedUpdate();
    const handleMouseUp = () => debouncedUpdate();
    const handleKeyUp = (e: KeyboardEvent) => {
      // Only update on shift+arrow keys (selection via keyboard)
      if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        debouncedUpdate();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, debouncedUpdate]);

  return {
    selection,
    clearSelection,
    applyFormat,
    isActive: selection.isActive,
    selectedText: selection.text,
    position: selection.position,
  };
}

export default useTextSelection;
