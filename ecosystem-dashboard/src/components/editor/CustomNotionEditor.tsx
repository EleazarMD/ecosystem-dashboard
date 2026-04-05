/**
 * CustomNotionEditor - Full custom Notion-style editor
 * No Slate.js - completely custom implementation matching Notion's architecture
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiMenu,
  FiSmile,
  FiImage,
} from 'react-icons/fi';
import { PageCover } from '../workspace/PageCover';
import { CoverSelectorModal } from '../workspace/CoverSelectorModal';
import { Button } from '@chakra-ui/react';
import { BlockModel, Block, BlockType, RichTextSegment } from '../../lib/editor/BlockModel';
import { CustomTextEditor } from './CustomTextEditor';
import { SlashCommandMenu, SlashCommand } from '../workspace/SlashCommandMenu';
import { ColumnLayout, GridLayout, ColumnItem, GridItem } from './LayoutComponents';
import { SpacerBlock, EnhancedDivider, ImageBlock, VideoBlock, FileBlock, EmbedBlock } from './RichMediaComponents';
import { DragDropManager } from '../../lib/editor/DragDropManager';
import { TableBlock } from './TableBlock';
import { StaticChartBlock, PlotlyChartBlock, DataStoryBlock } from '../editor';
import { ChartConfigModal, ChartConfig } from '../workspace/ChartConfigModal';
import { BlockHandle } from './BlockHandle';
import { BlockMenu } from './BlockMenu';
import { BlockComments, CommentIndicator } from './BlockComments';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { NotionDatabaseTable } from '../workspace/NotionDatabaseTable';
import { nanoid } from 'nanoid';

interface CustomNotionEditorProps {
  pageId: string;
  title: string;
  initialBlocks: Block[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
  onSave?: () => void;
  onBlockCreated?: (block: Block) => void;
  onBlockUpdated?: (block: Block) => void;
  onBlockDeleted?: (blockId: string) => void;
  workspaceId: string;
  onPageClick?: (pageId: string) => void;
  readOnly?: boolean;
  blockModelRef?: React.MutableRefObject<BlockModel | null>;
  initialCoverUrl?: string | null;
  initialCoverType?: 'image' | 'gradient' | 'solid';
}

export function CustomNotionEditor({
  pageId,
  title: initialTitle,
  initialBlocks,
  onTitleChange,
  onBlocksChange,
  onSave,
  onBlockCreated,
  onBlockUpdated,
  onBlockDeleted,
  workspaceId,
  onPageClick,
  blockModelRef,
  initialCoverUrl = null,
  initialCoverType = 'image',
  readOnly = false,
}: CustomNotionEditorProps) {
  const [blockModel] = useState(() => new BlockModel(initialBlocks));

  // Expose blockModel via ref
  useEffect(() => {
    if (blockModelRef) {
      blockModelRef.current = blockModel;
    }
  }, [blockModel, blockModelRef]);
  const [dragManager] = useState(() => new DragDropManager());
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [title, setTitle] = useState(initialTitle);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuBlock, setSlashMenuBlock] = useState<string | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState(dragManager.getState());
  const isInitializedRef = useRef(false);

  // Chart configuration modal state
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [selectedChartBlock, setSelectedChartBlock] = useState<{ blockId: string; blockType: 'static_chart' | 'plotly_chart' | 'data_story' } | null>(null);

  // Block menu state
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuId, setBlockMenuId] = useState<string | null>(null);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [commentsBlockId, setCommentsBlockId] = useState<string | null>(null);
  const [commentsPosition, setCommentsPosition] = useState({ x: 0, y: 0 });

  // Cover state
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [coverType, setCoverType] = useState<'image' | 'gradient' | 'solid'>(initialCoverType);
  const [showCoverModal, setShowCoverModal] = useState(false);

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.base');

  // Subscribe to block model changes
  useEffect(() => {
    const unsubscribe = blockModel.subscribe((updatedBlocks) => {
      console.log('[CustomNotionEditor] Blocks updated from model:', updatedBlocks.length);
      setBlocks(updatedBlocks);
      // Only call parent callback after first render (prevents loops on initial load)
      if (isInitializedRef.current) {
        onBlocksChange(updatedBlocks);
      }
    });
    // Mark as initialized after first subscription
    isInitializedRef.current = true;
    return unsubscribe;
  }, [blockModel, onBlocksChange]);

  // Subscribe to drag state changes
  useEffect(() => {
    const unsubscribe = dragManager.subscribe((state) => {
      setDragState(state);
    });
    return unsubscribe;
  }, [dragManager]);

  // Initialize with empty block if needed
  useEffect(() => {
    if (blocks.length === 0) {
      blockModel.createBlock('paragraph');
    }
  }, [blocks.length, blockModel]);

  // Sync title when prop changes (page switch)
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Poll job status until completion
  const pollJobStatus = async (jobId: string): Promise<string> => {
    const maxAttempts = 120; // 10 minutes max (5 sec intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await fetch(`http://localhost:9001/api/chat/status/${jobId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job status: ${response.status}`);
        }

        const job = await response.json();
        console.log(`[CustomNotionEditor] Job status (${attempts}/${maxAttempts}):`, job.status);

        if (job.status === 'completed') {
          // Parse the response field which contains the result JSON
          if (job.response) {
            const result = typeof job.response === 'string' ? JSON.parse(job.response) : job.response;
            if (result && result.result) {
              return result.result;
            }
          }
          throw new Error('Job completed but no result found');
        }

        if (job.status === 'failed') {
          const errorMsg = job.error || (job.response && JSON.parse(job.response).error) || 'Job failed';
          throw new Error(errorMsg);
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        console.error('[CustomNotionEditor] Polling error:', error);
        throw error;
      }
    }

    throw new Error('Job timed out after 10 minutes');
  };

  // Handle chart generation
  const handleGenerateChart = useCallback(async (blockId: string, config: ChartConfig) => {
    console.log('[CustomNotionEditor] Generating chart:', blockId, config);

    try {
      // Step 1: Submit job
      const response = await fetch('http://localhost:9001/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'claude_create_chart',
          arguments: {
            dataset_path: config.datasetPath || '/Users/eleazar/Projects/AIHomelab/datasets/customer_churn_synthetic.csv',
            chart_type: config.chartType,
            format: config.format,
            dimensions: config.dimensions,
            style: config.style,
            title: config.title,
            story_angle: config.narrative,
            model: 'claude-haiku-4-5'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CustomNotionEditor] HTTP error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const jobData = await response.json();
      console.log('[CustomNotionEditor] Job created:', jobData);

      const jobId = jobData.job_id;
      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      // Step 2: Poll for completion
      console.log('[CustomNotionEditor] Polling for job completion:', jobId);
      const resultString = await pollJobStatus(jobId);
      console.log('[CustomNotionEditor] Job completed, raw result:', resultString);

      // Parse structured JSON response (Option 3: No regex needed!)
      try {
        const chartData = JSON.parse(resultString);
        console.log('[CustomNotionEditor] Parsed chart data:', chartData);

        // Direct property access - no parsing needed!
        const { filename, title: chartTitle, insights, chart_type, format, style } = chartData;

        if (!filename) {
          throw new Error('No filename in response');
        }

        // Construct image URL from filename
        const imageUrl = `/api/charts/${filename}`;

        console.log('[CustomNotionEditor] Updating block with:', {
          imageUrl,
          chartTitle,
          insights,
          chartType: chart_type
        });

        // Update block properties
        blockModel.updateProperties(blockId, {
          imageUrl,
          chartTitle: chartTitle || config.title,
          caption: insights && insights.length > 0 ? insights[0] : '',
          metadata: {
            chartLibrary: 'matplotlib',
            createdByAgent: 'claude_code',
            status: 'generated',
            chartType: chart_type,
            format,
            style,
            insights
          }
        } as any);

        console.log('[CustomNotionEditor] ✅ Chart block updated successfully');

      } catch (error) {
        console.error('[CustomNotionEditor] Failed to parse chart data:', error);
        throw new Error(`Failed to parse chart response: ${error.message}`);
      }

      setShowChartConfig(false);
      setSelectedChartBlock(null);
    } catch (error: any) {
      console.error('[CustomNotionEditor] Chart generation failed:', error);
      throw error;
    }
  }, [blockModel]);

  // Handle slash command selection
  const handleSlashCommand = useCallback((command: SlashCommand) => {
    console.log('[CustomNotionEditor] Slash command selected:', command.blockType);
    if (slashMenuBlock) {
      const block = blockModel.getBlock(slashMenuBlock);
      if (!block) return;

      // Remove trailing "/" from content if present
      if (block.content.length > 0) {
        const cleanContent = block.content.map(segment => ({
          ...segment,
          text: segment.text.endsWith('/') ? segment.text.slice(0, -1) : segment.text
        }));

        // Update content first to remove "/"
        blockModel.updateContent(slashMenuBlock, cleanContent);

        // Handle special actions
        if (command.blockType === 'action_add_cover') {
          setCoverUrl('gradient1');
          setCoverType('gradient');
          // Remove the slash command block since it was just an action
          blockModel.deleteBlock(slashMenuBlock);
        }
        // Transform block type and set initial properties for chart blocks
        else if (command.blockType === 'static_chart' || command.blockType === 'plotly_chart' || command.blockType === 'data_story') {
          blockModel.transformBlock(slashMenuBlock, command.blockType as BlockType);

          // Set initial properties for chart blocks
          if (command.blockType === 'static_chart') {
            blockModel.updateProperties(slashMenuBlock, {
              chartTitle: 'New Chart',
              imageUrl: '',
              imageData: '',
              caption: 'Chart will appear here after data is provided',
              metadata: { status: 'placeholder' }
            } as any);
          } else if (command.blockType === 'plotly_chart') {
            blockModel.updateProperties(slashMenuBlock, {
              chartTitle: 'New Interactive Chart',
              plotlyConfig: { data: [], layout: {}, config: {} },
              metadata: { status: 'placeholder' }
            } as any);
          } else if (command.blockType === 'data_story') {
            blockModel.updateProperties(slashMenuBlock, {
              storyTitle: 'New Data Story',
              storyTheme: 'Analysis',
              sections: [],
              metadata: { status: 'placeholder' }
            } as any);
          }
        } else {
          // Normal block transformation
          blockModel.transformBlock(slashMenuBlock, command.blockType as BlockType);
        }
      }

      setShowSlashMenu(false);
      setSlashMenuBlock(null);
    }
  }, [slashMenuBlock, blockModel]);

  // Handle block content change
  const handleBlockContentChange = useCallback((blockId: string, content: RichTextSegment[]) => {
    blockModel.updateContent(blockId, content);

    // Close slash menu if user continues typing (content changed after slash)
    if (showSlashMenu && slashMenuBlock === blockId) {
      const text = content.map(c => c.text).join('');
      // If text doesn't end with "/" or has content after "/", close menu
      if (!text.endsWith('/') || text.length > 1) {
        setShowSlashMenu(false);
        setSlashMenuBlock(null);
      }
    }
  }, [blockModel, showSlashMenu, slashMenuBlock]);

  // Handle Enter key - create new block
  const handleEnter = useCallback((blockId: string) => {
    const newBlock = blockModel.insertBlockAfter(blockId, 'paragraph');
    if (newBlock) {
      // Focus new block
      setTimeout(() => {
        setFocusedBlockId(newBlock.id);
      }, 10);
    }
  }, [blockModel]);

  // Handle Backspace on empty block
  const handleBackspace = useCallback((blockId: string, isEmpty: boolean) => {
    if (isEmpty && blocks.length > 1) {
      const blockIndex = blocks.findIndex(b => b.id === blockId);
      blockModel.deleteBlock(blockId);

      // Focus previous block
      if (blockIndex > 0) {
        setTimeout(() => {
          setFocusedBlockId(blocks[blockIndex - 1].id);
        }, 10);
      }
    }
  }, [blockModel, blocks]);

  // Handle slash command trigger
  const handleSlashCommandTrigger = useCallback((blockId: string) => {
    const blockElement = document.getElementById(`block-${blockId}`);
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      setSlashMenuPosition({
        x: rect.left,
        y: rect.bottom + 4,
      });
      setSlashMenuBlock(blockId);
      setShowSlashMenu(true);
    }
  }, []);

  // Add block below
  const handleAddBlock = useCallback((afterBlockId: string) => {
    console.log('[CustomNotionEditor] Add block clicked, after:', afterBlockId);
    console.log('[CustomNotionEditor] Current blocks:', blockModel.getAllBlocks().map(b => b.id));
    const afterBlock = blockModel.getBlock(afterBlockId);
    console.log('[CustomNotionEditor] After block found:', !!afterBlock);
    const newBlock = blockModel.insertBlockAfter(afterBlockId, 'paragraph');
    console.log('[CustomNotionEditor] New block created:', newBlock?.id);
    if (newBlock) {
      setTimeout(() => {
        setFocusedBlockId(newBlock.id);
      }, 10);
    }
  }, [blockModel]);

  // Handle drag and drop
  const handleDrop = useCallback((targetBlockId: string, event: React.DragEvent) => {
    console.log('[CustomNotionEditor] Drop triggered on block:', targetBlockId);
    const result = dragManager.onDrop(targetBlockId, event);
    console.log('[CustomNotionEditor] Drop result:', result);
    if (result) {
      const { draggedId, targetId, position } = result;
      console.log('[CustomNotionEditor] Moving block', draggedId, position, 'target', targetId);

      // Find target block
      const targetBlock = blockModel.getBlock(targetId);
      if (!targetBlock) return;

      // Calculate new position
      let newPosition: number;
      if (targetBlock.parentId) {
        const parent = blockModel.getBlock(targetBlock.parentId);
        if (!parent) return;
        const targetIndex = parent.children.indexOf(targetId);
        newPosition = position === 'before' ? targetIndex : targetIndex + 1;
        console.log('[CustomNotionEditor] Moving to position', newPosition, 'in parent', targetBlock.parentId);
        const success = blockModel.moveBlock(draggedId, targetBlock.parentId, newPosition);
        console.log('[CustomNotionEditor] Move success:', success);
      } else {
        const targetIndex = blocks.findIndex(b => b.id === targetId && !b.parentId);
        newPosition = position === 'before' ? targetIndex : targetIndex + 1;
        console.log('[CustomNotionEditor] Moving to root position', newPosition);
        const success = blockModel.moveBlock(draggedId, null, newPosition);
        console.log('[CustomNotionEditor] Move success:', success);
      }
    }
  }, [dragManager, blockModel, blocks]);

  // Handle indent (Tab)
  const handleIndent = useCallback((blockId: string) => {
    blockModel.indentBlock(blockId);
  }, [blockModel]);

  // Handle outdent (Shift+Tab)
  const handleOutdent = useCallback((blockId: string) => {
    blockModel.outdentBlock(blockId);
  }, [blockModel]);

  // Comment handlers
  const handleOpenComments = useCallback((blockId: string, position: { x: number; y: number }) => {
    setCommentsBlockId(blockId);
    setCommentsPosition(position);
    setShowComments(true);
    setShowBlockMenu(false);
  }, []);

  const handleAddComment = useCallback((blockId: string, text: string) => {
    const block = blockModel.getBlock(blockId);
    if (!block) return;

    const newComment = {
      id: nanoid(),
      text,
      author: 'You', // In production, get from auth context
      createdAt: new Date().toISOString(),
    };

    const existingComments = block.properties?.comments || [];
    blockModel.updateProperties(blockId, {
      comments: [...existingComments, newComment],
    });
  }, [blockModel]);

  const handleDeleteComment = useCallback((blockId: string, commentId: string) => {
    const block = blockModel.getBlock(blockId);
    if (!block) return;

    const existingComments = block.properties?.comments || [];
    blockModel.updateProperties(blockId, {
      comments: existingComments.filter((c: any) => c.id !== commentId),
    });
  }, [blockModel]);

  const handleResolveComment = useCallback((blockId: string, commentId: string) => {
    const block = blockModel.getBlock(blockId);
    if (!block) return;

    const existingComments = block.properties?.comments || [];
    blockModel.updateProperties(blockId, {
      comments: existingComments.map((c: any) =>
        c.id === commentId ? { ...c, resolved: true } : c
      ),
    });
  }, [blockModel]);

  // Render block based on type
  const renderBlock = useCallback((block: Block, index: number) => {
    const isHovered = hoveredBlockId === block.id;
    const isFocused = focusedBlockId === block.id;

    // 🎨 Convert block.style to CSS properties
    const applyCustomStyle = (baseStyle: React.CSSProperties): React.CSSProperties => {
      if (!block.style) return baseStyle;

      const customStyle: React.CSSProperties = { ...baseStyle };

      // Typography
      if (block.style.fontSize) {
        const fontSizeMap = { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem' };
        customStyle.fontSize = fontSizeMap[block.style.fontSize] || block.style.fontSize;
      }
      if (block.style.fontWeight) customStyle.fontWeight = block.style.fontWeight;
      if (block.style.fontFamily) customStyle.fontFamily = block.style.fontFamily === 'mono' ? 'monospace' : block.style.fontFamily;
      if (block.style.lineHeight) customStyle.lineHeight = block.style.lineHeight;
      if (block.style.alignment) customStyle.textAlign = block.style.alignment;

      // Colors
      if (block.style.textColor) customStyle.color = block.style.textColor;

      return customStyle;
    };

    // Get style based on block type
    const getBlockStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        width: '100%',
        padding: '4px 0', // Increased padding for better breathing room
        color: textColor,
        lineHeight: '1.6', // Improved line height for readability
        fontSize: '16px', // Standard base size
      };

      let typeStyle = baseStyle;
      switch (block.type) {
        case 'heading_1':
          typeStyle = {
            ...baseStyle,
            fontSize: '2.25em',
            fontWeight: '700',
            marginTop: '1.2em',
            marginBottom: '0.4em',
            lineHeight: '1.2',
            letterSpacing: '-0.02em'
          };
          break;
        case 'heading_2':
          typeStyle = {
            ...baseStyle,
            fontSize: '1.75em',
            fontWeight: '600',
            marginTop: '1em',
            marginBottom: '0.2em',
            lineHeight: '1.3',
            letterSpacing: '-0.01em'
          };
          break;
        case 'heading_3':
          typeStyle = {
            ...baseStyle,
            fontSize: '1.35em',
            fontWeight: '600',
            marginTop: '0.8em',
            marginBottom: '0.1em',
            lineHeight: '1.4'
          };
          break;
        case 'code':
          typeStyle = { ...baseStyle, fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.9em', lineHeight: '1.5' };
          break;
        case 'quote':
          typeStyle = { ...baseStyle, fontStyle: 'italic', fontSize: '1.1em', color: mutedColor };
          break;
        default:
          typeStyle = baseStyle;
      }

      // 🎨 Apply custom styles on top of type styles
      return applyCustomStyle(typeStyle);
    };

    // Wrapper for special block types
    const wrapperProps: any = {};
    if (block.type === 'quote') {
      wrapperProps.borderLeft = '3px solid';
      wrapperProps.borderColor = 'gray.400';
      wrapperProps.pl = 4;
    } else if (block.type === 'code') {
      wrapperProps.bg = 'gray.100';
      wrapperProps.p = 3;
      wrapperProps.borderRadius = 'md';
      wrapperProps.fontFamily = 'monospace';
    } else if (block.type === 'callout') {
      // Callout type-based styling
      const calloutType = block.style?.calloutType || 'info';
      const calloutColors = {
        info: { bg: 'blue.50', border: 'blue.500' },
        warning: { bg: 'yellow.50', border: 'yellow.500' },
        error: { bg: 'red.50', border: 'red.500' },
        success: { bg: 'green.50', border: 'green.500' },
      };
      const colors = calloutColors[calloutType];
      wrapperProps.bg = colors.bg;
      wrapperProps.p = 3;
      wrapperProps.borderRadius = 'md';
      wrapperProps.borderLeft = '3px solid';
      wrapperProps.borderColor = colors.border;
    }

    // 🎨 Apply custom block styles (background, spacing, borders, shadows)
    if (block.style) {
      if (block.style.backgroundColor) wrapperProps.bg = block.style.backgroundColor;
      if (block.style.borderColor) wrapperProps.borderColor = block.style.borderColor;
      if (block.style.borderWidth) wrapperProps.borderWidth = block.style.borderWidth;
      if (block.style.borderRadius) wrapperProps.borderRadius = block.style.borderRadius;
      if (block.style.boxShadow) wrapperProps.boxShadow = block.style.boxShadow;
      if (block.style.padding) wrapperProps.p = block.style.padding;
      if (block.style.margin) wrapperProps.m = block.style.margin;
      if (block.style.opacity) wrapperProps.opacity = block.style.opacity;
    }

    const blockElement = (
      <Box {...wrapperProps} position="relative">
        {block.type === 'to_do' && (
          <HStack spacing={2}>
            <input
              type="checkbox"
              checked={block.properties.checked || false}
              onChange={(e) => {
                blockModel.updateProperties(block.id, { checked: e.target.checked });
              }}
              style={{ marginRight: '8px' }}
            />
            <Box flex={1}>
              <CustomTextEditor
                content={block.content}
                placeholder={getPlaceholder(block.type)}
                autoFocus={isFocused}
                onChange={(content) => handleBlockContentChange(block.id, content)}
                onEnter={() => handleEnter(block.id)}
                onBackspace={(isEmpty) => handleBackspace(block.id, isEmpty)}
                onSlashCommand={() => handleSlashCommandTrigger(block.id)}
                onTab={() => handleIndent(block.id)}
                onShiftTab={() => handleOutdent(block.id)}
                style={getBlockStyle()}
              />
            </Box>
          </HStack>
        )}

        {block.type === 'callout' && (
          <HStack spacing={2} align="start">
            <Text fontSize="xl">{typeof block.properties.icon === 'object' && block.properties.icon?.emoji ? block.properties.icon.emoji : (block.properties.icon || '💡')}</Text>
            <Box flex={1}>
              <CustomTextEditor
                content={block.content}
                placeholder="Write a callout..."
                autoFocus={isFocused}
                onChange={(content) => handleBlockContentChange(block.id, content)}
                onEnter={() => handleEnter(block.id)}
                onBackspace={(isEmpty) => handleBackspace(block.id, isEmpty)}
                onSlashCommand={() => handleSlashCommandTrigger(block.id)}
                onTab={() => handleIndent(block.id)}
                onShiftTab={() => handleOutdent(block.id)}
                style={getBlockStyle()}
              />
            </Box>
          </HStack>
        )}

        {block.type === 'table' && (
          <TableBlock
            data={block.properties.tableData as string[][] || undefined}
            onChange={(newData) => {
              blockModel.updateProperties(block.id, { tableData: newData });
            }}
          />
        )}

        {/* Layout containers (Phase 2) */}
        {block.type === 'column_list' && (
          <ColumnLayout block={block}>
            {block.children?.map(childId => {
              const childBlock = blockModel.getBlock(childId);
              return childBlock ? renderBlock(childBlock, -1) : null;
            })}
          </ColumnLayout>
        )}

        {block.type === 'grid_container' && (
          <GridLayout block={block}>
            {block.children?.map(childId => {
              const childBlock = blockModel.getBlock(childId);
              return childBlock ? renderBlock(childBlock, -1) : null;
            })}
          </GridLayout>
        )}

        {block.type === 'column' && (
          <ColumnItem>
            {block.children?.map(childId => {
              const childBlock = blockModel.getBlock(childId);
              return childBlock ? renderBlock(childBlock, -1) : null;
            })}
          </ColumnItem>
        )}

        {block.type === 'grid_item' && (
          <GridItem>
            {block.children?.map(childId => {
              const childBlock = blockModel.getBlock(childId);
              return childBlock ? renderBlock(childBlock, -1) : null;
            })}
          </GridItem>
        )}

        {/* Phase 3 & 4: Rich Media Blocks */}
        {block.type === 'spacer' && <SpacerBlock block={block} />}

        {block.type === 'divider' && (
          block.style?.dividerStyle ? (
            <EnhancedDivider block={block} />
          ) : (
            <Box borderBottom="1px solid" borderColor={useSemanticToken('border.default')} my={2} />
          )
        )}

        {block.type === 'image' && <ImageBlock block={block} />}
        {block.type === 'video' && <VideoBlock block={block} />}
        {block.type === 'file' && <FileBlock block={block} />}
        {block.type === 'embed' && <EmbedBlock block={block} />}

        {/* Chart Blocks (Phase 5) */}
        {block.type === 'static_chart' && (
          <StaticChartBlock
            blockId={block.id}
            imageUrl={block.properties?.imageUrl as string}
            imageData={block.properties?.imageData as string}
            title={block.properties?.chartTitle as string || block.properties?.title as unknown as string}
            caption={block.properties?.caption as string}
            altText={block.properties?.altText as string}
            metadata={block.properties?.metadata as any}
            editable={true}
            onGenerate={() => {
              setSelectedChartBlock({ blockId: block.id, blockType: 'static_chart' });
              setShowChartConfig(true);
            }}
          />
        )}

        {block.type === 'plotly_chart' && (
          <PlotlyChartBlock
            blockId={block.id}
            plotlyConfig={block.properties?.plotlyConfig as any}
            title={block.properties?.chartTitle as string || block.properties?.title as unknown as string}
            narrative={block.properties?.narrative as string}
            metadata={block.properties?.metadata as any}
            editable={true}
          />
        )}

        {block.type === 'data_story' && (
          <DataStoryBlock
            blockId={block.id}
            storyTitle={block.properties?.storyTitle as unknown as string}
            storyTheme={block.properties?.storyTheme as unknown as string}
            sections={block.properties?.sections as any[]}
            layout={block.properties?.layout as any}
            metadata={block.properties?.metadata as any}
            editable={true}
          />
        )}

        {block.type === 'database_inline' && (
          <Box mt={4} mb={8}>
            <Text fontSize="xl" fontWeight="600" mb={4} px={1}>
              {(block.properties.title?.[0]?.text as any)?.content || (block.properties.title?.[0]?.text as unknown as string) || 'Untitled Database'}
            </Text>
            <NotionDatabaseTable
              databaseId={block.id}
              workspaceId={(block as any).workspace_id || workspaceId}
              onPageClick={onPageClick}
            />
          </Box>
        )}



        {block.type !== 'to_do' &&
          block.type !== 'callout' &&
          block.type !== 'divider' &&
          block.type !== 'table' &&
          block.type !== 'column_list' &&
          block.type !== 'grid_container' &&
          block.type !== 'column' &&
          block.type !== 'grid_item' &&
          block.type !== 'spacer' &&
          block.type !== 'image' &&
          block.type !== 'video' &&
          block.type !== 'file' &&
          block.type !== 'embed' &&
          block.type !== 'static_chart' &&
          block.type !== 'plotly_chart' &&
          block.type !== 'data_story' &&
          block.type !== 'database_inline' && (
            <CustomTextEditor
              content={block.content}
              placeholder={getPlaceholder(block.type)}
              autoFocus={isFocused}
              onChange={(content) => handleBlockContentChange(block.id, content)}
              onEnter={() => handleEnter(block.id)}
              onBackspace={(isEmpty) => handleBackspace(block.id, isEmpty)}
              onSlashCommand={() => handleSlashCommandTrigger(block.id)}
              onTab={() => handleIndent(block.id)}
              onShiftTab={() => handleOutdent(block.id)}
              style={getBlockStyle()}
            />
          )}
      </Box>
    );

    const isDragging = dragState.draggedBlockId === block.id;
    const isDropTarget = dragState.dragOverBlockId === block.id;
    const dropPosition = dragState.dropPosition;

    return (
      <HStack
        key={block.id}
        id={`block-${block.id}`}
        w="full"
        spacing={1}
        position="relative"
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
        py={block.type === 'divider' ? 0 : 1}
        _hover={{ bg: hoverBg }}
        borderRadius="sm"
        transition="background 0.15s"
        onDragOver={(e) => dragManager.onDragOver(block.id, e)}
        onDragLeave={() => dragManager.onDragLeave(block.id)}
        onDrop={(e) => handleDrop(block.id, e)}
        opacity={isDragging ? 0.5 : 1}
        borderTop={isDropTarget && dropPosition === 'before' ? '2px solid' : undefined}
        borderBottom={isDropTarget && dropPosition === 'after' ? '2px solid' : undefined}
        borderColor="blue.500"
      >
        {/* Modern Block Handle */}
        <BlockHandle
          blockId={block.id}
          isVisible={isHovered}
          onMenuClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setBlockMenuPosition({ x: rect.left, y: rect.bottom + 4 });
            setBlockMenuId(block.id);
            setShowBlockMenu(true);
          }}
          onAddClick={() => {
            console.log('[CustomNotionEditor] + button clicked for block:', block.id);
            handleAddBlock(block.id);
          }}
          onDragStart={(e) => {
            console.log('[CustomNotionEditor] Drag started for block:', block.id);
            dragManager.onDragStart(block.id, e);
          }}
        />

        {/* Block Content */}
        <Box flex={1}>
          {blockElement}
        </Box>

        {/* Comment Indicator */}
        {(block.properties?.comments?.length || 0) > 0 && (
          <Box position="absolute" right={-2} top="50%" transform="translateY(-50%)">
            <CommentIndicator
              count={block.properties?.comments?.length || 0}
              onClick={() => {
                const blockEl = document.getElementById(`block-${block.id}`);
                if (blockEl) {
                  const rect = blockEl.getBoundingClientRect();
                  handleOpenComments(block.id, { x: rect.right + 10, y: rect.top });
                }
              }}
            />
          </Box>
        )}
      </HStack>
    );
  }, [
    hoveredBlockId,
    focusedBlockId,
    textColor,
    hoverBg,
    blockModel,
    handleBlockContentChange,
    handleEnter,
    handleBackspace,
    handleSlashCommandTrigger,
    handleAddBlock,
    handleIndent,
    handleOutdent,
    handleOpenComments,
    dragState,
    dragManager,
    handleDrop,
    onPageClick,
  ]);

  return (
    <Box w="full">
      {/* Page Cover */}
      <PageCover
        coverUrl={coverUrl || undefined}
        coverType={coverType}
        onChangeCover={() => setShowCoverModal(true)}
        onRemoveCover={() => setCoverUrl(null)}
      />

      <Box maxW="900px" mx="auto" px={8} pt={coverUrl ? 8 : 20} pb={32}>
        {/* Page Icon & Title */}
        <VStack align="stretch" spacing={2} mb={8} role="group">
          <HStack spacing={2} opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
            <IconButton
              aria-label="Add icon"
              icon={<FiSmile />}
              variant="ghost"
              size="sm"
              color={mutedColor}
            />
            {!coverUrl && (
              <Button
                leftIcon={<FiImage />}
                variant="ghost"
                size="sm"
                color={mutedColor}
                onClick={() => {
                  setCoverUrl('gradient1'); // Default to a gradient
                  setCoverType('gradient');
                }}
              >
                Add cover
              </Button>
            )}
          </HStack>

          <Input
            placeholder="Untitled"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            fontSize="4xl"
            fontWeight="800"
            variant="unstyled"
            _placeholder={{ color: 'gray.300' }}
            py={2}
            px={0}
            mb={2}
            letterSpacing="-0.02em"
            autoComplete="off"
          />

          <Text fontSize="sm" color={mutedColor}>
            Type / for commands • ⌘B for bold • ⌘I for italic
          </Text>
        </VStack>

        {/* Blocks */}
        <VStack align="stretch" spacing={0} position="relative" pl="60px" pr="40px">
          {blocks.map((block, index) => renderBlock(block, index))}
        </VStack>

        {/* Slash Command Menu */}
        {showSlashMenu && (
          <SlashCommandMenu
            position={slashMenuPosition}
            onSelect={handleSlashCommand}
            onClose={() => {
              setShowSlashMenu(false);
              setSlashMenuBlock(null);
            }}
          />
        )}

        {/* Chart Configuration Modal */}
        {showChartConfig && selectedChartBlock && (
          <ChartConfigModal
            isOpen={showChartConfig}
            blockId={selectedChartBlock.blockId}
            blockType={selectedChartBlock.blockType}
            onClose={() => {
              setShowChartConfig(false);
              setSelectedChartBlock(null);
            }}
            onGenerate={handleGenerateChart}
          />
        )}

        {/* Block Menu */}
        {showBlockMenu && blockMenuId && (
          <BlockMenu
            blockId={blockMenuId}
            blockType={blockModel.getBlock(blockMenuId)?.type || 'paragraph'}
            isVisible={showBlockMenu}
            position={blockMenuPosition}
            onConvert={(newType) => {
              blockModel.convertBlock(blockMenuId, newType);
              setShowBlockMenu(false);
            }}
            onDelete={() => {
              blockModel.deleteBlock(blockMenuId);
              setShowBlockMenu(false);
            }}
            onDuplicate={() => {
              const block = blockModel.getBlock(blockMenuId);
              if (block) {
                blockModel.createBlock(block.type, block.content, blockMenuId);
              }
              setShowBlockMenu(false);
            }}
            onCopyLink={() => {
              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${blockMenuId}`);
              setShowBlockMenu(false);
            }}
            onComment={() => {
              handleOpenComments(blockMenuId, { x: blockMenuPosition.x + 260, y: blockMenuPosition.y });
            }}
            onColor={(color) => {
              const block = blockModel.getBlock(blockMenuId);
              if (block) {
                blockModel.updateProperties(blockMenuId, { bgColor: color === 'default' ? undefined : color });
              }
              setShowBlockMenu(false);
            }}
          />
        )}

        {/* Block Comments */}
        {showComments && commentsBlockId && (
          <BlockComments
            blockId={commentsBlockId}
            comments={blockModel.getBlock(commentsBlockId)?.properties?.comments || []}
            isOpen={showComments}
            position={commentsPosition}
            onClose={() => {
              setShowComments(false);
              setCommentsBlockId(null);
            }}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onResolveComment={handleResolveComment}
          />
        )}

        {/* Cover Selector Modal */}
        <CoverSelectorModal
          isOpen={showCoverModal}
          onClose={() => setShowCoverModal(false)}
          onSelectCover={(url, type) => {
            setCoverUrl(url);
            setCoverType(type);
            setShowCoverModal(false);
          }}
        />
      </Box>
    </Box>
  );
}

// Helper to get placeholder text
function getPlaceholder(blockType: BlockType): string {
  switch (blockType) {
    case 'heading_1':
      return 'Heading 1';
    case 'heading_2':
      return 'Heading 2';
    case 'heading_3':
      return 'Heading 3';
    case 'quote':
      return 'Empty quote';
    case 'code':
      return '// Code';
    case 'bulleted_list':
      return 'List item';
    case 'numbered_list':
      return 'List item';
    case 'to_do':
      return 'To-do';
    case 'callout':
      return 'Callout';
    default:
      return "Type '/' for commands";
  }
}

export default CustomNotionEditor;
