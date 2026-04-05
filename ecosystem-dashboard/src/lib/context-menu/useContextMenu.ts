/**
 * useContextMenu Hook
 * 
 * Manages context menu state and provides handlers for opening/closing.
 * Can be used with any platform-specific menu configuration.
 */

import { useState, useCallback } from 'react';
import type { ContextMenuConfig, ContextMenuPosition, ContextMenuState } from './types';

export interface UseContextMenuReturn {
  state: ContextMenuState;
  open: (position: ContextMenuPosition, config: ContextMenuConfig) => void;
  close: () => void;
  handleContextMenu: (e: React.MouseEvent, config: ContextMenuConfig) => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    config: null,
  });

  const open = useCallback((position: ContextMenuPosition, config: ContextMenuConfig) => {
    setState({
      isOpen: true,
      position,
      config,
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, config: ContextMenuConfig) => {
    e.preventDefault();
    e.stopPropagation();
    open({ x: e.clientX, y: e.clientY }, config);
  }, [open]);

  return {
    state,
    open,
    close,
    handleContextMenu,
  };
}

export default useContextMenu;
