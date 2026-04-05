/**
 * usePropertyCommand - Hook for integrating property command menu
 * Handles / and + button triggers, keyboard shortcuts, and context
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PropertyDefinition, PropertyType } from '@/lib/property-registry';

interface UsePropertyCommandOptions {
  context?: {
    view?: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
    hasDatabase?: boolean;
    currentPropertyType?: PropertyType;
  };
  onPropertySelect?: (property: PropertyDefinition) => void;
  triggerOnSlash?: boolean; // Listen for "/" key
  triggerOnPlus?: boolean; // Listen for "+" button
}

export function usePropertyCommand({
  context,
  onPropertySelect,
  triggerOnSlash = true,
  triggerOnPlus = false,
}: UsePropertyCommandOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialQuery, setInitialQuery] = useState('');
  const triggerElementRef = useRef<HTMLElement | null>(null);

  /**
   * Open menu at specific position
   */
  const openMenu = useCallback((pos?: { x: number; y: number }, query = '') => {
    if (pos) {
      setPosition(pos);
    } else if (triggerElementRef.current) {
      const rect = triggerElementRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left,
        y: rect.bottom + 8,
      });
    }
    setInitialQuery(query);
    setIsOpen(true);
  }, []);

  /**
   * Close menu
   */
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setInitialQuery('');
  }, []);

  /**
   * Handle property selection
   */
  const handleSelect = useCallback((property: PropertyDefinition) => {
    onPropertySelect?.(property);
    closeMenu();
  }, [onPropertySelect, closeMenu]);

  /**
   * Listen for slash command trigger
   */
  useEffect(() => {
    if (!triggerOnSlash) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in input/textarea and "/" is pressed
      if (
        e.key === '/' &&
        !isOpen &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        openMenu({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, '');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [triggerOnSlash, isOpen, openMenu]);

  return {
    isOpen,
    position,
    initialQuery,
    context,
    openMenu,
    closeMenu,
    handleSelect,
    triggerElementRef,
  };
}

/**
 * Helper hook for input fields that support inline property commands
 */
export function useInlinePropertyCommand(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  options: UsePropertyCommandOptions = {}
) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState('');

  /**
   * Track slash command in input
   */
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      const value = input.value;
      const cursorPos = input.selectionStart || 0;
      
      // Find last "/" before cursor
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      if (lastSlashIndex !== -1) {
        const query = textBeforeCursor.substring(lastSlashIndex + 1);
        
        // Only show menu if "/" is at start of word
        const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];
        if (!charBeforeSlash || /\s/.test(charBeforeSlash)) {
          setSlashQuery(query);
          
          // Calculate position
          const rect = input.getBoundingClientRect();
          setPosition({
            x: rect.left,
            y: rect.bottom + 8,
          });
          setIsOpen(true);
          return;
        }
      }
      
      // Close menu if no valid slash command
      if (isOpen) {
        setIsOpen(false);
      }
    };

    input.addEventListener('input', handleInput);
    return () => input.removeEventListener('input', handleInput);
  }, [inputRef, isOpen]);

  const handleSelect = useCallback((property: PropertyDefinition) => {
    options.onPropertySelect?.(property);
    setIsOpen(false);
    
    // Replace /command with property in input
    const input = inputRef.current;
    if (input) {
      const value = input.value;
      const cursorPos = input.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      if (lastSlashIndex !== -1) {
        const newValue = 
          value.substring(0, lastSlashIndex) +
          property.name +
          ' ' +
          value.substring(cursorPos);
        
        input.value = newValue;
        input.setSelectionRange(
          lastSlashIndex + property.name.length + 1,
          lastSlashIndex + property.name.length + 1
        );
        
        // Trigger input event
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, [inputRef, options]);

  return {
    isOpen,
    position,
    initialQuery: slashQuery,
    context: options.context,
    closeMenu: () => setIsOpen(false),
    handleSelect,
  };
}

/**
 * Helper for "+  Add property" button integration
 */
export function useAddPropertyButton(
  onPropertySelect: (property: PropertyDefinition) => void,
  context?: UsePropertyCommandOptions['context']
) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleButtonClick = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left,
        y: rect.bottom + 8,
      });
      setIsOpen(true);
    }
  }, []);

  const handleSelect = useCallback((property: PropertyDefinition) => {
    onPropertySelect(property);
    setIsOpen(false);
  }, [onPropertySelect]);

  return {
    isOpen,
    position,
    context,
    buttonRef,
    openMenu: handleButtonClick,
    closeMenu: () => setIsOpen(false),
    handleSelect,
  };
}
