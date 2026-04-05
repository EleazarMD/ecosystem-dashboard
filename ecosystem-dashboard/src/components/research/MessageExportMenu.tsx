/**
 * Per-message export menu for conversational research messages.
 * Allows downloading a single message as markdown with sources separated.
 * Also supports exporting directly to Podcast Studio as source material.
 */

import React, { useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  MenuGroup,
  IconButton,
  Icon,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiLink, FiMic, FiPrinter } from 'react-icons/fi';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import ExportToPodcastModal from './ExportToPodcastModal';

interface Source {
  title?: string;
  url?: string;
  snippet?: string;
}

interface MessageExportMenuProps {
  content: string;
  sources?: Source[];
  /** Used for filenames and podcast export title */
  label?: string;
  /** Research session ID (if from deep research) */
  sessionId?: string;
  size?: 'xs' | 'sm';
}

/**
 * Separate inline references section from body text.
 */
function splitBodyAndSources(text: string): { body: string; refSection: string | null } {
  const pat = /\n#{1,2}\s*(References|Sources|Bibliography|Citations)\s*\n([\s\S]*?)$/i;
  const m = text.match(pat);
  if (m) {
    return { body: text.slice(0, m.index!).trim(), refSection: m[0].trim() };
  }
  return { body: text, refSection: null };
}

function buildSourcesMarkdown(sources: Source[]): string {
  if (sources.length === 0) return '';
  return '## Sources\n\n' +
    sources.map((s, i) => {
      const parts: string[] = [`${i + 1}. `];
      if (s.title) parts.push(`**${s.title}**`);
      if (s.url) parts.push(s.title ? ` — ${s.url}` : s.url);
      if (s.snippet) parts.push(`\n   > ${s.snippet}`);
      return parts.join('');
    }).join('\n');
}

export default function MessageExportMenu({
  content,
  sources = [],
  label = 'Research',
  sessionId,
  size = 'xs',
}: MessageExportMenuProps) {
  const toast = useToast();
  const { isOpen: isPodcastOpen, onOpen: onPodcastOpen, onClose: onPodcastClose } = useDisclosure();

  const { body, refSection } = splitBodyAndSources(content);
  const sourcesMarkdown = sources.length > 0 ? buildSourcesMarkdown(sources) : refSection || '';
  const hasSources = sourcesMarkdown.length > 0;
  const filePrefix = label.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 60);

  const download = (text: string, suffix: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}${suffix}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFull = () => {
    try {
      let md = `# ${label}\n\n${body}`;
      if (sourcesMarkdown) md += `\n\n---\n\n${sourcesMarkdown}`;
      download(md, '');
      toast({ title: '📄 Downloaded', status: 'success', duration: 2000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  const handleBodyOnly = () => {
    try {
      download(`# ${label}\n\n${body}`, '_body');
      toast({ title: '📄 Body downloaded', status: 'success', duration: 2000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  const handleSourcesOnly = () => {
    try {
      download(`# Sources — ${label}\n\n${sourcesMarkdown}`, '_sources');
      toast({ title: '🔗 Sources downloaded', status: 'success', duration: 2000 });
    } catch {
      toast({ title: 'Download failed', status: 'error', duration: 3000 });
    }
  };

  const handlePrint = () => {
    try {
      const w = window.open('', '_blank');
      if (!w) { toast({ title: 'Pop-up blocked', status: 'warning', duration: 3000 }); return; }

      const htmlBody = body
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      const htmlSources = sourcesMarkdown
        ? `<hr/><h2>Sources</h2><div style="font-size:0.9em;color:#555">${sourcesMarkdown.replace(/^## .*\n\n?/, '').replace(/\n/g, '<br/>')}</div>`
        : '';

      w.document.write(`<!DOCTYPE html><html><head><title>${label}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.7;color:#1a1a1a}h1{border-bottom:2px solid #333;padding-bottom:8px}h2{margin-top:1.5em;color:#333}hr{margin:2em 0;border:none;border-top:1px solid #ccc}a{color:#2563eb}@media print{body{margin:20px}}</style>
</head><body><h1>${label}</h1><p>${htmlBody}</p>${htmlSources}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 300);
      toast({ title: '🖨️ Print dialog opened', status: 'info', duration: 4000 });
    } catch {
      toast({ title: 'Print failed', status: 'error', duration: 3000 });
    }
  };

  // Direct export to podcast studio via materials API (no session needed)
  const handleDirectPodcastExport = async () => {
    if (sessionId) {
      onPodcastOpen();
      return;
    }
    // For conversational messages without a session, we can still export via the podcast modal
    // by using a generated ID
    onPodcastOpen();
  };

  return (
    <>
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Export message"
          icon={<ArrowDownTrayIcon width={16} height={16} />}
          size={size}
          variant="ghost"
          colorScheme="purple"
        />
        <MenuList minW="220px" fontSize="sm">
          <MenuGroup title="Markdown">
            <MenuItem icon={<Icon as={FiFileText} />} onClick={handleFull}>
              Full (body + sources)
            </MenuItem>
            <MenuItem icon={<Icon as={FiFileText} />} onClick={handleBodyOnly}>
              Body only
            </MenuItem>
            {hasSources && (
              <MenuItem icon={<Icon as={FiLink} />} onClick={handleSourcesOnly}>
                Sources only
              </MenuItem>
            )}
          </MenuGroup>
          <MenuDivider />
          <MenuItem icon={<Icon as={FiPrinter} />} onClick={handlePrint}>
            Print / Save as PDF
          </MenuItem>
          {sessionId && (
            <>
              <MenuDivider />
              <MenuItem icon={<Icon as={FiMic} />} onClick={handleDirectPodcastExport}>
                Export to Podcast Studio
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>

      {sessionId && (
        <ExportToPodcastModal
          isOpen={isPodcastOpen}
          onClose={onPodcastClose}
          sessionId={sessionId}
          sessionTitle={label}
        />
      )}
    </>
  );
}
