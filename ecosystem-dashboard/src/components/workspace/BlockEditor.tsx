/**
 * BlockEditor - Notion-like block-based editor using Slate.js
 * Supports slash commands, drag & drop, and block transformations
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createEditor, Descendant, BaseEditor, Editor, Transforms, Element as SlateElement, Range, Point, Node } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { BlockType, Block as WorkspaceBlock, CreateBlockParams } from '../../types/workspace';
import { StaticChartBlock, PlotlyChartBlock, DataStoryBlock } from '../editor';
import { DatabaseBlock } from './blocks/DatabaseBlock';
import { SlashCommandMenu, SlashCommand } from './SlashCommandMenu';
import { ChartConfigModal, ChartConfig } from './ChartConfigModal';

interface BlockEditorProps {
  workspaceId: string;
  initialBlocks?: WorkspaceBlock[];
  readOnly?: boolean;
  onSave?: (blocks: WorkspaceBlock[]) => void;
  onChange?: (blocks: Descendant[]) => void;
}

// Custom element types for Slate
type CustomElement = {
  type: BlockType;
  children: CustomText[];
  [key: string]: any;
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export function BlockEditor({
  workspaceId,
  initialBlocks = [],
  readOnly = false,
  onSave,
  onChange
}: BlockEditorProps) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const editableRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<Descendant[]>(
    initialBlocks.length > 0
      ? convertWorkspaceBlocksToSlate(initialBlocks)
      : [
        {
          type: 'paragraph',
          children: [{ text: 'Start typing or press / for commands...' }]
        }
      ]
  );
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [selectedChartBlock, setSelectedChartBlock] = useState<{
    blockId: string;
    blockType: 'static_chart' | 'plotly_chart' | 'data_story';
  } | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const handleChange = (newValue: Descendant[]) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleOpenChartConfig = useCallback((blockId: string, blockType: 'static_chart' | 'plotly_chart' | 'data_story') => {
    setSelectedChartBlock({ blockId, blockType });
    setShowChartConfig(true);
  }, []);

  const handleGenerateChart = useCallback(async (blockId: string, config: ChartConfig) => {
    console.log('[BlockEditor] Generating chart:', blockId, config);

    try {
      // Call MCP endpoint to generate chart
      const response = await fetch('http://localhost:9001/api/mcp/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'claude_create_chart',
          arguments: {
            dataset_path: config.datasetPath,
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[BlockEditor] MCP Response:', data);

      if (!data.success) {
        throw new Error('Chart generation failed: ' + data.result);
      }

      // Parse Claude's response to extract chart information
      const chartInfo = parseChartResponse(data.result);
      console.log('[BlockEditor] Parsed chart info:', chartInfo);

      // Update the block in the editor with the chart data
      updateBlockData(editor, blockId, chartInfo);

      // Show success message
      console.log('[BlockEditor] ✅ Chart generated successfully');

    } catch (error: any) {
      console.error('[BlockEditor] ❌ Chart generation failed:', error);
      // Re-throw to let modal handle the error display
      throw error;
    }
  }, [editor]);

  const renderElement = useCallback((props: RenderElementProps) => {
    return <Element {...props} onOpenChartConfig={handleOpenChartConfig} />;
  }, [handleOpenChartConfig]);

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    return <Leaf {...props} />;
  }, []);

  const handleSlashCommand = useCallback((command: SlashCommand) => {
    const { selection } = editor;
    if (!selection) return;

    // Remove the "/" character
    Transforms.delete(editor, {
      at: {
        anchor: Editor.before(editor, selection.anchor, { unit: 'character' }) || selection.anchor,
        focus: selection.anchor
      }
    });

    // Insert the new block based on type
    if (command.blockType === 'static_chart') {
      insertChartBlock(editor, 'static_chart');
    } else if (command.blockType === 'plotly_chart') {
      insertChartBlock(editor, 'plotly_chart');
    } else if (command.blockType === 'data_story') {
      insertChartBlock(editor, 'data_story');
    } else {
      // Standard block insertion
      Transforms.setNodes(
        editor,
        { type: command.blockType as BlockType },
        { match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n as CustomElement) }
      );
    }

    setShowSlashMenu(false);
  }, [editor]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Slash command trigger
    if (event.key === '/' && !showSlashMenu) {
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        // Get cursor position for menu placement
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSlashMenuPosition({
            x: rect.left,
            y: rect.bottom + 5
          });
          setShowSlashMenu(true);
        }
      }
      return;
    }

    // Keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          toggleMark(editor, 'bold');
          break;
        case 'i':
          event.preventDefault();
          toggleMark(editor, 'italic');
          break;
        case '`':
          event.preventDefault();
          toggleMark(editor, 'code');
          break;
      }
    }
  };

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      p={6}
      minH="400px"
      position="relative"
    >
      <Slate editor={editor} initialValue={value} onChange={handleChange}>
        <Editable
          ref={editableRef}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder="Start typing or press / for commands..."
          style={{
            minHeight: '300px',
            outline: 'none'
          }}
        />
      </Slate>

      {showSlashMenu && (
        <SlashCommandMenu
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
          position={slashMenuPosition}
        />
      )}

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
    </Box>
  );
}

// Element renderer component
interface ExtendedRenderElementProps extends RenderElementProps {
  onOpenChartConfig?: (blockId: string, blockType: 'static_chart' | 'plotly_chart' | 'data_story') => void;
}

function Element({ attributes, children, element, onOpenChartConfig }: ExtendedRenderElementProps) {
  const style = { margin: '4px 0' };

  switch (element.type) {
    case 'heading_1':
      return (
        <h1 {...attributes} style={{ fontSize: '2em', fontWeight: 'bold', ...style }}>
          {children}
        </h1>
      );
    case 'heading_2':
      return (
        <h2 {...attributes} style={{ fontSize: '1.5em', fontWeight: 'bold', ...style }}>
          {children}
        </h2>
      );
    case 'heading_3':
      return (
        <h3 {...attributes} style={{ fontSize: '1.25em', fontWeight: 'bold', ...style }}>
          {children}
        </h3>
      );
    case 'bulleted_list':
      return (
        <ul {...attributes} style={{ paddingLeft: '24px', ...style }}>
          <li>{children}</li>
        </ul>
      );
    case 'numbered_list':
      return (
        <ol {...attributes} style={{ paddingLeft: '24px', ...style }}>
          <li>{children}</li>
        </ol>
      );
    case 'quote':
      return (
        <blockquote
          {...attributes}
          style={{
            borderLeft: '3px solid #ccc',
            paddingLeft: '16px',
            fontStyle: 'italic',
            color: '#666',
            ...style
          }}
        >
          {children}
        </blockquote>
      );
    case 'code':
      return (
        <pre
          {...attributes}
          style={{
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontFamily: 'monospace',
            ...style
          }}
        >
          <code>{children}</code>
        </pre>
      );
    case 'static_chart':
      return (
        <div {...attributes} style={style}>
          <StaticChartBlock
            blockId={element.id || 'temp'}
            imageUrl={element.imageUrl}
            imageData={element.imageData}
            title={element.title}
            caption={element.caption}
            altText={element.altText}
            metadata={element.metadata}
            editable={!element.readOnly}
            onGenerate={onOpenChartConfig ? () => onOpenChartConfig(element.id || 'temp', 'static_chart') : undefined}
          />
          {children}
        </div>
      );
    case 'plotly_chart':
      return (
        <div {...attributes} style={style}>
          <PlotlyChartBlock
            blockId={element.id || 'temp'}
            plotlyConfig={element.plotlyConfig}
            title={element.title}
            narrative={element.narrative}
            metadata={element.metadata}
            editable={!element.readOnly}
          />
          {children}
        </div>
      );
    case 'data_story':
      return (
        <div {...attributes} style={style}>
          <DataStoryBlock
            blockId={element.id || 'temp'}
            storyTitle={element.storyTitle}
            storyTheme={element.storyTheme}
            sections={element.sections}
            layout={element.layout}
            theme={element.theme}
            metadata={element.metadata}
            editable={!element.readOnly}
          />
          {children}
        </div>
      );
    case 'table':
    case 'database_inline':
      return (
        <div {...attributes} style={style}>
          <div contentEditable={false}>
            <DatabaseBlock blockId={element.id} inline={true} />
          </div>
          {children}
        </div>
      );
    case 'database_full_page':
      return (
        <div {...attributes} style={style}>
          <div contentEditable={false}>
            <DatabaseBlock blockId={element.id} inline={false} />
          </div>
          {children}
        </div>
      );
    default:
      return (
        <p {...attributes} style={style}>
          {children}
        </p>
      );
  }
}

// Leaf (text formatting) renderer
function Leaf({ attributes, children, leaf }: RenderLeafProps) {
  let styledChildren = children;

  if (leaf.bold) {
    styledChildren = <strong>{styledChildren}</strong>;
  }

  if (leaf.italic) {
    styledChildren = <em>{styledChildren}</em>;
  }

  if (leaf.code) {
    styledChildren = (
      <code
        style={{
          backgroundColor: '#f5f5f5',
          padding: '2px 4px',
          borderRadius: '2px',
          fontFamily: 'monospace',
          fontSize: '0.9em'
        }}
      >
        {styledChildren}
      </code>
    );
  }

  return <span {...attributes}>{styledChildren}</span>;
}

// Toggle text formatting
function toggleMark(editor: Editor, format: 'bold' | 'italic' | 'code') {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

// Check if mark is active
function isMarkActive(editor: Editor, format: string) {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}

// Convert workspace blocks to Slate format
function convertWorkspaceBlocksToSlate(blocks: WorkspaceBlock[]): Descendant[] {
  return blocks.map(block => ({
    type: block.type,
    children: block.properties?.title
      ? block.properties.title.map(rt => ({
        text: rt.text?.content || '',
        bold: rt.annotations?.bold,
        italic: rt.annotations?.italic,
        code: rt.annotations?.code
      }))
      : [{ text: '' }]
  }));
}

// Convert Slate format to workspace blocks
function convertSlateToWorkspaceBlocks(
  slateNodes: Descendant[],
  workspaceId: string,
  userId: string
): CreateBlockParams[] {
  return slateNodes.map(node => {
    const element = node as CustomElement;
    return {
      workspace_id: workspaceId,
      type: element.type,
      properties: {
        title: element.children.map(child => ({
          type: 'text' as const,
          text: { content: child.text },
          annotations: {
            bold: child.bold,
            italic: child.italic,
            code: child.code
          }
        }))
      },
      created_by: userId
    };
  });
}

// Insert a chart block with placeholder data
function insertChartBlock(editor: Editor, blockType: 'static_chart' | 'plotly_chart' | 'data_story') {
  const newBlock: CustomElement = {
    type: blockType,
    children: [{ text: '' }],
    id: `chart-${Date.now()}`,
    title: 'New Chart',
  };

  if (blockType === 'static_chart') {
    Object.assign(newBlock, {
      imageUrl: '',
      imageData: '',
      caption: 'Chart will appear here after data is provided',
      metadata: {
        chartLibrary: 'matplotlib',
        createdByAgent: 'user',
        status: 'placeholder'
      }
    });
  } else if (blockType === 'plotly_chart') {
    Object.assign(newBlock, {
      plotlyConfig: {
        data: [],
        layout: { title: 'New Interactive Chart' },
        config: { responsive: true }
      },
      narrative: 'Configure this chart with your data',
      metadata: {
        status: 'placeholder'
      }
    });
  } else if (blockType === 'data_story') {
    Object.assign(newBlock, {
      storyTitle: 'New Data Story',
      storyTheme: 'Analysis',
      sections: [
        {
          type: 'narrative',
          content: { text: 'Add your data story here...' }
        }
      ],
      layout: 'vertical',
      metadata: {
        status: 'placeholder'
      }
    });
  }

  Transforms.insertNodes(editor, newBlock);

  // Move cursor to next line
  Transforms.insertNodes(editor, {
    type: 'paragraph',
    children: [{ text: '' }]
  });
}

// Parse Claude's response to extract chart information
function parseChartResponse(claudeResponse: string): {
  imageUrl?: string;
  imagePath?: string;
  title?: string;
  insights?: string[];
  plotlyConfig?: any;
} {
  const result: any = {};

  // Extract file path (look for common patterns)
  const pathMatch = claudeResponse.match(/(?:saved to|file path|chart saved at)[:\s]+([^\n]+\.(?:png|jpg|svg|json))/i);
  if (pathMatch) {
    result.imagePath = pathMatch[1].trim();
    // Extract filename and create API URL
    const filename = result.imagePath.split('/').pop();
    if (filename) {
      result.imageUrl = `/api/charts/${filename}`;
    }
  }

  // Extract title
  const titleMatch = claudeResponse.match(/(?:title|chart title)[:\s]+"([^"]+)"|(?:title|chart title)[:\s]+([^\n]+)/i);
  if (titleMatch) {
    result.title = (titleMatch[1] || titleMatch[2]).trim();
  }

  // Extract insights (look for bullet points or numbered lists)
  const insights: string[] = [];
  const insightLines = claudeResponse.match(/(?:•|-|\d+\.)\s+([^\n]+)/g);
  if (insightLines) {
    insightLines.forEach(line => {
      const cleaned = line.replace(/^(?:•|-|\d+\.)\s+/, '').trim();
      if (cleaned.length > 10) { // Filter out short lines
        insights.push(cleaned);
      }
    });
  }
  if (insights.length > 0) {
    result.insights = insights.slice(0, 5); // Limit to 5 insights
  }

  // Extract Plotly config if interactive chart
  const jsonMatch = claudeResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      result.plotlyConfig = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('[parseChartResponse] Failed to parse Plotly JSON:', e);
    }
  }

  return result;
}

// Update block data in the Slate editor
function updateBlockData(editor: Editor, blockId: string, chartInfo: any) {
  console.log('[updateBlockData] Updating block:', blockId, 'with:', chartInfo);

  try {
    // Find the node with matching blockId
    const nodeEntries = Array.from(
      Editor.nodes(editor, {
        at: [],
        match: (n: any) =>
          SlateElement.isElement(n) &&
          (n.type === 'static_chart' || n.type === 'plotly_chart') &&
          n.id === blockId
      })
    );

    if (nodeEntries.length === 0) {
      console.warn('[updateBlockData] Block not found:', blockId);
      return;
    }

    const [node, path] = nodeEntries[0];
    const element = node as CustomElement;

    // Build update object based on chart type
    const updates: any = {
      title: chartInfo.title || element.title,
      metadata: {
        ...(element.metadata || {}),
        chartLibrary: 'matplotlib',
        createdByAgent: 'claude_code',
        insights: chartInfo.insights || [],
        status: 'generated'
      }
    };

    // Add type-specific properties
    if (element.type === 'static_chart') {
      updates.imageUrl = chartInfo.imageUrl || element.imageUrl;
      updates.imageData = chartInfo.imageData || element.imageData;
    } else if (element.type === 'plotly_chart' && chartInfo.plotlyConfig) {
      updates.plotlyConfig = chartInfo.plotlyConfig;
    }

    // Update the node
    Transforms.setNodes(editor, updates, { at: path });

    console.log('[updateBlockData] ✅ Block updated successfully');
  } catch (error) {
    console.error('[updateBlockData] ❌ Error updating block:', error);
  }
}

export default BlockEditor;
