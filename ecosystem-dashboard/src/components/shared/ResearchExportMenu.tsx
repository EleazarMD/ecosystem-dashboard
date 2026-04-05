/**
 * Reusable Research Export Component
 * 
 * Exports research content in multiple formats:
 * - Markdown (.md)
 * - PDF
 * - Podcast Script (for Podcast Studio)
 * - LaTeX (.tex)
 * - Word (.docx)
 * - Citation Library (BibTeX, RIS)
 * 
 * Used by: Workspace AI, AI Research Studio, Podcast Studio
 */

import React, { useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  Button,
  Icon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import {
  FiDownload,
  FiFile,
  FiFileText,
  FiMic,
  FiBookOpen,
  FiCopy,
} from 'react-icons/fi';
import { SiLatex } from 'react-icons/si';

export interface ResearchContent {
  title: string;
  abstract?: string;
  content: string; // Markdown with citations
  citations: Citation[];
  metadata?: {
    author?: string;
    date?: string;
    tags?: string[];
    model?: string;
    wordCount?: number;
  };
}

export interface Citation {
  id: number;
  authors: string[];
  year: number;
  title: string;
  source: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

interface ResearchExportMenuProps {
  content: ResearchContent;
  buttonLabel?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  buttonVariant?: string;
  onExportStart?: (format: string) => void;
  onExportComplete?: (format: string, success: boolean) => void;
}

export const ResearchExportMenu: React.FC<ResearchExportMenuProps> = ({
  content,
  buttonLabel = 'Export',
  buttonSize = 'sm',
  buttonVariant = 'outline',
  onExportStart,
  onExportComplete,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const handleExport = async (format: 'markdown' | 'pdf' | 'podcast' | 'latex' | 'docx' | 'bibtex' | 'ris') => {
    setIsExporting(true);
    onExportStart?.(format);

    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'markdown':
          blob = await exportMarkdown(content);
          filename = `${sanitizeFilename(content.title)}.md`;
          break;

        case 'pdf':
          blob = await exportPDF(content);
          filename = `${sanitizeFilename(content.title)}.pdf`;
          break;

        case 'podcast':
          blob = await exportPodcastScript(content);
          filename = `${sanitizeFilename(content.title)}_podcast_script.md`;
          break;

        case 'latex':
          blob = await exportLaTeX(content);
          filename = `${sanitizeFilename(content.title)}.tex`;
          break;

        case 'docx':
          toast({
            title: 'Coming Soon',
            description: 'Word export will be available in the next update.',
            status: 'info',
            duration: 3000,
          });
          setIsExporting(false);
          return;

        case 'bibtex':
          blob = await exportBibTeX(content.citations);
          filename = `${sanitizeFilename(content.title)}_citations.bib`;
          break;

        case 'ris':
          blob = await exportRIS(content.citations);
          filename = `${sanitizeFilename(content.title)}_citations.ris`;
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Download file
      downloadBlob(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Downloaded as ${filename}`,
        status: 'success',
        duration: 3000,
      });

      onExportComplete?.(format, true);
    } catch (error) {
      console.error(`Export failed for ${format}:`, error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
      onExportComplete?.(format, false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        leftIcon={isExporting ? <Spinner size="sm" /> : <Icon as={FiDownload} />}
        size={buttonSize}
        variant={buttonVariant}
        isDisabled={isExporting}
      >
        {isExporting ? 'Exporting...' : buttonLabel}
      </MenuButton>
      <MenuList>
        <MenuGroup title="Document Formats">
          <MenuItem icon={<Icon as={FiFileText} />} onClick={() => handleExport('markdown')}>
            Markdown (.md)
          </MenuItem>
          <MenuItem icon={<Icon as={FiFile} />} onClick={() => handleExport('pdf')}>
            PDF
          </MenuItem>
          <MenuItem icon={<Icon as={SiLatex} />} onClick={() => handleExport('latex')}>
            LaTeX (.tex)
          </MenuItem>
          <MenuItem icon={<Icon as={FiFile} />} onClick={() => handleExport('docx')} isDisabled>
            Word (.docx) <em style={{ marginLeft: '8px', fontSize: '0.85em' }}>Coming Soon</em>
          </MenuItem>
        </MenuGroup>

        <MenuDivider />

        <MenuGroup title="Citations">
          <MenuItem icon={<Icon as={FiBookOpen} />} onClick={() => handleExport('bibtex')}>
            BibTeX (.bib)
          </MenuItem>
          <MenuItem icon={<Icon as={FiCopy} />} onClick={() => handleExport('ris')}>
            RIS (EndNote, Zotero)
          </MenuItem>
        </MenuGroup>

        <MenuDivider />

        <MenuGroup title="Podcast Studio">
          <MenuItem icon={<Icon as={FiMic} />} onClick={() => handleExport('podcast')}>
            Podcast Script
          </MenuItem>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

async function exportMarkdown(content: ResearchContent): Promise<Blob> {
  let markdown = `# ${content.title}\n\n`;

  if (content.metadata) {
    markdown += `**Author:** ${content.metadata.author || 'AI Research Assistant'}  \n`;
    markdown += `**Date:** ${content.metadata.date || new Date().toISOString().split('T')[0]}  \n`;
    if (content.metadata.model) {
      markdown += `**Model:** ${content.metadata.model}  \n`;
    }
    if (content.metadata.tags && content.metadata.tags.length > 0) {
      markdown += `**Tags:** ${content.metadata.tags.join(', ')}  \n`;
    }
    markdown += `\n---\n\n`;
  }

  if (content.abstract) {
    markdown += `## Abstract\n\n${content.abstract}\n\n`;
  }

  markdown += content.content;

  markdown += `\n\n---\n\n## References\n\n`;
  content.citations.forEach((citation) => {
    markdown += formatCitationMarkdown(citation);
  });

  return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
}

async function exportPDF(content: ResearchContent): Promise<Blob> {
  // Call backend API to generate PDF
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    throw new Error('PDF generation failed');
  }

  return await response.blob();
}

async function exportPodcastScript(content: ResearchContent): Promise<Blob> {
  // Transform academic paper into conversational podcast script
  let script = `# Podcast Script: ${content.title}\n\n`;
  script += `**Generated:** ${new Date().toLocaleDateString()}\n`;
  script += `**Duration Estimate:** ${estimatePodcastDuration(content.content)} minutes\n\n`;
  script += `---\n\n`;

  script += `## Opening\n\n`;
  script += `**Host:** Welcome to today's deep dive! We're exploring "${content.title}". `;
  if (content.abstract) {
    script += `This research examines ${content.abstract.substring(0, 200)}...\n\n`;
  }

  // Convert sections to conversational format
  script += `## Main Content\n\n`;
  script += convertToConversationalFormat(content.content);

  script += `\n\n## Closing\n\n`;
  script += `**Host:** That's our deep dive for today. `;
  script += `This research was synthesized by AI from ${content.citations.length} academic sources. `;
  script += `Thanks for listening!\n\n`;

  script += `---\n\n## Sources Referenced\n\n`;
  content.citations.slice(0, 10).forEach((citation) => {
    script += `- ${formatCitationPodcast(citation)}\n`;
  });

  return new Blob([script], { type: 'text/markdown;charset=utf-8' });
}

async function exportLaTeX(content: ResearchContent): Promise<Blob> {
  let latex = `\\documentclass[12pt,a4paper]{article}\n`;
  latex += `\\usepackage[utf8]{inputenc}\n`;
  latex += `\\usepackage{hyperref}\n`;
  latex += `\\usepackage{natbib}\n`;
  latex += `\\usepackage{graphicx}\n\n`;

  latex += `\\title{${escapeLatex(content.title)}}\n`;
  latex += `\\author{${escapeLatex(content.metadata?.author || 'AI Research Assistant')}}\n`;
  latex += `\\date{${content.metadata?.date || '\\today'}}\n\n`;

  latex += `\\begin{document}\n\n`;
  latex += `\\maketitle\n\n`;

  if (content.abstract) {
    latex += `\\begin{abstract}\n${escapeLatex(content.abstract)}\n\\end{abstract}\n\n`;
  }

  // Convert markdown to LaTeX (simplified)
  latex += convertMarkdownToLatex(content.content);

  latex += `\n\\bibliographystyle{plain}\n`;
  latex += `\\begin{thebibliography}{99}\n\n`;

  content.citations.forEach((citation, index) => {
    latex += `\\bibitem{ref${index + 1}}\n`;
    latex += formatCitationLatex(citation);
    latex += `\n\n`;
  });

  latex += `\\end{thebibliography}\n\n`;
  latex += `\\end{document}\n`;

  return new Blob([latex], { type: 'application/x-tex;charset=utf-8' });
}

async function exportBibTeX(citations: Citation[]): Promise<Blob> {
  let bibtex = '';

  citations.forEach((citation, index) => {
    const key = `${citation.authors[0]?.split(' ').pop()}${citation.year}`;
    bibtex += `@article{${key},\n`;
    bibtex += `  author = {${citation.authors.join(' and ')}},\n`;
    bibtex += `  title = {${citation.title}},\n`;
    bibtex += `  journal = {${citation.source}},\n`;
    bibtex += `  year = {${citation.year}},\n`;
    if (citation.volume) bibtex += `  volume = {${citation.volume}},\n`;
    if (citation.issue) bibtex += `  number = {${citation.issue}},\n`;
    if (citation.pages) bibtex += `  pages = {${citation.pages}},\n`;
    if (citation.doi) bibtex += `  doi = {${citation.doi}},\n`;
    if (citation.url) bibtex += `  url = {${citation.url}},\n`;
    bibtex += `}\n\n`;
  });

  return new Blob([bibtex], { type: 'application/x-bibtex;charset=utf-8' });
}

async function exportRIS(citations: Citation[]): Promise<Blob> {
  let ris = '';

  citations.forEach((citation) => {
    ris += `TY  - JOUR\n`;
    citation.authors.forEach(author => {
      ris += `AU  - ${author}\n`;
    });
    ris += `TI  - ${citation.title}\n`;
    ris += `JO  - ${citation.source}\n`;
    ris += `PY  - ${citation.year}\n`;
    if (citation.volume) ris += `VL  - ${citation.volume}\n`;
    if (citation.issue) ris += `IS  - ${citation.issue}\n`;
    if (citation.pages) ris += `SP  - ${citation.pages}\n`;
    if (citation.doi) ris += `DO  - ${citation.doi}\n`;
    if (citation.url) ris += `UR  - ${citation.url}\n`;
    ris += `ER  - \n\n`;
  });

  return new Blob([ris], { type: 'application/x-research-info-systems;charset=utf-8' });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCitationMarkdown(citation: Citation): string {
  let formatted = `[${citation.id}] ${citation.authors.join(', ')}. (${citation.year}). ${citation.title}. `;
  formatted += `*${citation.source}*`;
  if (citation.volume) formatted += `, ${citation.volume}`;
  if (citation.issue) formatted += `(${citation.issue})`;
  if (citation.pages) formatted += `, ${citation.pages}`;
  if (citation.doi) formatted += `. https://doi.org/${citation.doi}`;
  else if (citation.url) formatted += `. ${citation.url}`;
  formatted += `\n\n`;
  return formatted;
}

function formatCitationPodcast(citation: Citation): string {
  return `${citation.authors[0]} and colleagues, ${citation.year}, "${citation.title}", ${citation.source}`;
}

function formatCitationLatex(citation: Citation): string {
  let formatted = `${citation.authors.join(', ')}. \\textit{${escapeLatex(citation.title)}}. `;
  formatted += `${escapeLatex(citation.source)}`;
  if (citation.volume) formatted += `, ${citation.volume}`;
  if (citation.issue) formatted += `(${citation.issue})`;
  if (citation.pages) formatted += `, ${citation.pages}`;
  formatted += `, ${citation.year}.`;
  return formatted;
}

function convertToConversationalFormat(markdown: string): string {
  // Simple conversion: Add "Host:" prefix to paragraphs
  return markdown
    .split('\n\n')
    .map(para => {
      if (para.startsWith('#')) return para; // Keep headers
      if (para.trim().length === 0) return para;
      return `**Host:** ${para}`;
    })
    .join('\n\n');
}

function convertMarkdownToLatex(markdown: string): string {
  // Simplified markdown -> LaTeX conversion
  return markdown
    .replace(/^### (.*)/gm, '\\subsubsection{$1}')
    .replace(/^## (.*)/gm, '\\subsection{$1}')
    .replace(/^# (.*)/gm, '\\section{$1}')
    .replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}')
    .replace(/\*(.*?)\*/g, '\\textit{$1}')
    .replace(/\[(.*?)\]\((.*?)\)/g, '\\href{$2}{$1}');
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-]/gi, '_').substring(0, 100);
}

function estimatePodcastDuration(content: string): number {
  // Average speaking rate: 150 words per minute
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / 150);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default ResearchExportMenu;
