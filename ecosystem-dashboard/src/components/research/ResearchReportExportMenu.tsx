/**
 * Research Report Export Menu
 * Provides multiple export options: Markdown, PDF, Podcast Studio
 * Sources are kept separate from the main body in all export formats.
 */

import React, { useMemo } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  MenuGroup,
  Button,
  Icon,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiFile, FiMic, FiChevronDown, FiLink, FiPrinter } from 'react-icons/fi';
import ExportToPodcastModal from './ExportToPodcastModal';

interface SourceItem {
  title?: string;
  url?: string;
  snippet?: string;
}

interface ResearchReportExportMenuProps {
  sessionId: string;
  sessionTitle: string;
  report: string;
  sources?: SourceItem[];
}

/**
 * Separate a report string into body and references/sources section.
 * Works with both Perplexity citation styles and standard markdown references.
 */
function splitBodyAndReferences(report: string): { body: string; referencesSection: string | null } {
  // Match a trailing References / Sources / Citations / Bibliography section
  const refPattern = /\n#{1,2}\s*(References|Sources|Bibliography|Citations)\s*\n([\s\S]*?)$/i;
  const match = report.match(refPattern);
  if (match) {
    const body = report.slice(0, match.index!).trim();
    const referencesSection = match[0].trim();
    return { body, referencesSection };
  }
  return { body: report, referencesSection: null };
}

export default function ResearchReportExportMenu({
  sessionId,
  sessionTitle,
  report,
  sources = [],
}: ResearchReportExportMenuProps) {
  const toast = useToast();
  const { isOpen: isPodcastModalOpen, onOpen: onPodcastModalOpen, onClose: onPodcastModalClose } = useDisclosure();

  // Parse report into separated sections
  const parsed = useMemo(() => {
    const { body, referencesSection } = splitBodyAndReferences(report);

    // Extract podcast script if present
    const podcastMatch = body.match(/\n#{1,2}\s*Podcast.*?\n([\s\S]*?)(?=\n#{1,2}\s[^P]|$)/i);
    const podcastScript = podcastMatch?.[1]?.trim() || null;
    const bodyWithoutPodcast = podcastMatch
      ? body.replace(podcastMatch[0], '').trim()
      : body;

    // Build a standalone sources markdown block from structured sources prop
    let sourcesMarkdown = '';
    if (sources.length > 0) {
      sourcesMarkdown = '## Sources\n\n' +
        sources.map((s, i) => {
          const parts: string[] = [];
          parts.push(`${i + 1}. `);
          if (s.title) parts.push(`**${s.title}**`);
          if (s.url) parts.push(s.title ? ` — ${s.url}` : s.url);
          if (s.snippet) parts.push(`\n   > ${s.snippet}`);
          return parts.join('');
        }).join('\n');
    } else if (referencesSection) {
      sourcesMarkdown = referencesSection;
    }

    return { body: bodyWithoutPodcast, podcastScript, sourcesMarkdown, referencesSection };
  }, [report, sources]);

  const filePrefix = sessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // --- Download helpers ---

  const downloadBlob = (content: string, filename: string, mimeType = 'text/markdown;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Full report (body + sources clearly separated)
  const handleDownloadFull = () => {
    try {
      let content = `# ${sessionTitle}\n\n${parsed.body}`;
      if (parsed.sourcesMarkdown) {
        content += `\n\n---\n\n${parsed.sourcesMarkdown}`;
      }
      if (parsed.podcastScript) {
        content += `\n\n---\n\n## Podcast Script\n\n${parsed.podcastScript}`;
      }
      downloadBlob(content, `${filePrefix}.md`);
      toast({ title: '📄 Full Report Downloaded', description: 'Body + sources as .md', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  // Body only — no sources, no references
  const handleDownloadBodyOnly = () => {
    try {
      const content = `# ${sessionTitle}\n\n${parsed.body}`;
      downloadBlob(content, `${filePrefix}_body.md`);
      toast({ title: '📄 Body Downloaded', description: 'Report body without sources', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  // Sources only
  const handleDownloadSourcesOnly = () => {
    try {
      if (!parsed.sourcesMarkdown) {
        toast({ title: 'No sources found', status: 'warning', duration: 3000 });
        return;
      }
      const content = `# Sources — ${sessionTitle}\n\n${parsed.sourcesMarkdown}`;
      downloadBlob(content, `${filePrefix}_sources.md`);
      toast({ title: '🔗 Sources Downloaded', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  // Podcast script only
  const handleDownloadPodcast = () => {
    try {
      if (!parsed.podcastScript) return;
      const content = `# Podcast Script — ${sessionTitle}\n\n${parsed.podcastScript}`;
      downloadBlob(content, `${filePrefix}_podcast_script.md`);
      toast({ title: '🎙️ Podcast Script Downloaded', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  // Print-to-PDF via browser print dialog
  const handlePrintPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: 'Pop-up blocked', description: 'Allow pop-ups to print as PDF', status: 'warning', duration: 4000 });
        return;
      }

      // Build a clean, print-friendly HTML document
      let htmlBody = parsed.body
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      htmlBody = `<p>${htmlBody}</p>`;

      let htmlSources = '';
      if (parsed.sourcesMarkdown) {
        htmlSources = `<hr/><h2>Sources</h2><div class="sources">${
          parsed.sourcesMarkdown
            .replace(/^## .*\n\n?/, '')
            .replace(/\n/g, '<br/>')
        }</div>`;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${sessionTitle}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 1.8em; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 1.4em; margin-top: 1.5em; color: #333; }
  h3 { font-size: 1.1em; margin-top: 1.2em; }
  p { margin: 0.8em 0; }
  ul { padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  hr { margin: 2em 0; border: none; border-top: 1px solid #ccc; }
  .sources { font-size: 0.9em; color: #555; }
  a { color: #2563eb; }
  @media print { body { margin: 20px; } }
</style></head>
<body>
  <h1>${sessionTitle}</h1>
  ${htmlBody}
  ${htmlSources}
</body></html>`);
      printWindow.document.close();

      // Wait for content to render, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 300);

      toast({ title: '🖨️ Print dialog opened', description: 'Choose "Save as PDF" in the print dialog', status: 'info', duration: 5000 });
    } catch {
      toast({ title: 'PDF export failed', status: 'error', duration: 3000 });
    }
  };

  const hasSources = parsed.sourcesMarkdown.length > 0;

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<FiChevronDown />}
          leftIcon={<FiDownload />}
          colorScheme="blue"
          size="sm"
        >
          Export
        </MenuButton>
        <MenuList minW="260px">
          <MenuGroup title="Markdown">
            <MenuItem icon={<Icon as={FiFileText} />} onClick={handleDownloadFull}>
              Full Report (body + sources)
            </MenuItem>
            <MenuItem icon={<Icon as={FiFile} />} onClick={handleDownloadBodyOnly}>
              Body Only (no sources)
            </MenuItem>
            {hasSources && (
              <MenuItem icon={<Icon as={FiLink} />} onClick={handleDownloadSourcesOnly}>
                Sources / References Only
              </MenuItem>
            )}
            {parsed.podcastScript && (
              <MenuItem icon={<Icon as={FiMic} />} onClick={handleDownloadPodcast}>
                Podcast Script Only
              </MenuItem>
            )}
          </MenuGroup>

          <MenuDivider />

          <MenuGroup title="Other Formats">
            <MenuItem icon={<Icon as={FiPrinter} />} onClick={handlePrintPDF}>
              Print / Save as PDF
            </MenuItem>
          </MenuGroup>

          <MenuDivider />

          <MenuGroup title="Integrations">
            <MenuItem icon={<Icon as={FiMic} />} onClick={onPodcastModalOpen}>
              Export to Podcast Studio
            </MenuItem>
          </MenuGroup>
        </MenuList>
      </Menu>

      {/* Export to Podcast Modal */}
      <ExportToPodcastModal
        isOpen={isPodcastModalOpen}
        onClose={onPodcastModalClose}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
      />
    </>
  );
}
