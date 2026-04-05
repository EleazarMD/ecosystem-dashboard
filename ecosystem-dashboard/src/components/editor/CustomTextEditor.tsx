/**
 * CustomTextEditor - Notion-style contentEditable implementation
 * Handles text editing, formatting, and cursor management
 */

import React, { useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { RichTextSegment } from '../../lib/editor/BlockModel';

interface CustomTextEditorProps {
  content: RichTextSegment[];
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (content: RichTextSegment[]) => void;
  onEnter?: () => void;
  onBackspace?: (isEmpty: boolean) => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onSlashCommand?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  style?: React.CSSProperties;
}

export function CustomTextEditor({
  content,
  placeholder = "Type '/' for commands",
  autoFocus = false,
  onChange,
  onEnter,
  onBackspace,
  onArrowUp,
  onArrowDown,
  onSlashCommand,
  onTab,
  onShiftTab,
  style = {},
}: CustomTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const textColor = useSemanticToken('text.primary');
  const placeholderColor = useSemanticToken('text.tertiary');

  // Convert rich text to HTML
  const richTextToHTML = useCallback((segments: RichTextSegment[]): string => {
    return segments
      .map(segment => {
        let html = segment.text;
        const ann = segment.annotations || {};

        // Apply formatting
        if (ann.bold) html = `<strong>${html}</strong>`;
        if (ann.italic) html = `<em>${html}</em>`;
        if (ann.code) html = `<code style="background: rgba(135,131,120,0.15); color: #EB5757; padding: 0.2em 0.4em; border-radius: 3px; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 85%;">${html}</code>`;
        if (ann.strikethrough) html = `<s>${html}</s>`;
        if (ann.underline) html = `<u>${html}</u>`;
        if (segment.href) html = `<a href="${segment.href}" style="color: #0066cc; text-decoration: underline;">${html}</a>`;
        if (ann.color) html = `<span style="color: ${ann.color}">${html}</span>`;
        if (ann.backgroundColor) html = `<span style="background-color: ${ann.backgroundColor}">${html}</span>`;

        return html;
      })
      .join('');
  }, []);

  // Convert HTML back to rich text
  const htmlToRichText = useCallback((html: string): RichTextSegment[] => {
    if (!html || html === '<br>') return [{ text: '' }];

    // Simple parsing - in production, use DOMParser
    const text = html
      .replace(/<br>/g, '\n')
      .replace(/<[^>]+>/g, '') // Strip HTML tags for now
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    return [{ text }];
  }, []);

  // Update editor content when prop changes
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = richTextToHTML(content);
    }
  }, [content, richTextToHTML]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  // Handle input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const newContent = htmlToRichText(html);
    onChange(newContent);

    // Check for slash command - only trigger at start or after space
    const text = editorRef.current.textContent || '';
    const lastChar = text[text.length - 1];
    const secondLastChar = text[text.length - 2];

    if (lastChar === '/' && (!secondLastChar || secondLastChar === ' ' || secondLastChar === '\n')) {
      onSlashCommand?.();
    }
  }, [onChange, onSlashCommand, htmlToRichText]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // Tab key for indent/outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onShiftTab?.();
      } else {
        onTab?.();
      }
      return;
    }

    // Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
      return;
    }

    // Backspace on empty
    if (e.key === 'Backspace') {
      const isEmpty = !editorRef.current?.textContent?.trim();
      if (isEmpty) {
        e.preventDefault();
        onBackspace?.(true);
        return;
      }
    }

    // Arrow keys at boundaries
    if (e.key === 'ArrowUp') {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0 && sel.focusOffset === 0) {
        e.preventDefault();
        onArrowUp?.();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      const sel = window.getSelection();
      const textLength = editorRef.current?.textContent?.length || 0;
      if (sel && sel.anchorOffset === textLength) {
        e.preventDefault();
        onArrowDown?.();
        return;
      }
    }

    // Formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          handleInput();
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          handleInput();
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          handleInput();
          break;
        case '`':
          e.preventDefault();
          // Toggle code formatting
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const code = document.createElement('code');
            code.style.background = 'rgba(135,131,120,0.15)';
            code.style.padding = '0.2em 0.4em';
            code.style.borderRadius = '3px';
            code.style.fontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
            code.style.fontSize = '85%';
            code.style.color = '#EB5757';
            range.surroundContents(code);
            handleInput();
          }
          break;
      }
    }
  }, [onEnter, onBackspace, onArrowUp, onArrowDown, onTab, onShiftTab, handleInput]);

  const isEmpty = !content[0]?.text || content[0].text === '';

  return (
    <Box position="relative" w="full">
      {isEmpty && (
        <Box
          position="absolute"
          top={0}
          left={0}
          color={placeholderColor}
          pointerEvents="none"
          userSelect="none"
          style={{
            ...style,
            fontStyle: 'normal', // Ensure placeholder isn't italic unless specified
            opacity: 0.6, // Subtle transparency
          }}
        >
          {placeholder}
        </Box>
      )}
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        style={{
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: textColor,
          minHeight: '1.5em',
          ...style,
        }}
      />
    </Box>
  );
}

export default CustomTextEditor;
