/**
 * ExportModal - Export pages to Markdown, HTML, or PDF
 */

import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, HStack, Box, Text, Button, Icon, Radio, RadioGroup,
  useToast,
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiCode, FiPrinter } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { MarkdownExporter } from '@/lib/export/MarkdownExporter';
import { PDFExporter } from '@/lib/export/PDFExporter';
import type { Block } from '@/lib/editor/BlockModel';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  blocks: Block[];
}

export function ExportModal({ isOpen, onClose, pageTitle, blocks }: ExportModalProps) {
  const [format, setFormat] = useState('markdown');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const handleExport = () => {
    setExporting(true);
    try {
      switch (format) {
        case 'markdown': {
          const md = MarkdownExporter.export(pageTitle, blocks);
          downloadFile(`${sanitizeFilename(pageTitle)}.md`, md, 'text/markdown');
          break;
        }
        case 'html': {
          const blob = PDFExporter.generateHTMLBlob(pageTitle, blocks);
          const url = URL.createObjectURL(blob);
          downloadBlob(url, `${sanitizeFilename(pageTitle)}.html`);
          URL.revokeObjectURL(url);
          break;
        }
        case 'pdf': {
          PDFExporter.printToPDF(pageTitle, blocks);
          break;
        }
      }

      toast({
        title: format === 'pdf' ? 'Print dialog opened' : `Exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 2000,
      });
      onClose();
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, status: 'error', duration: 3000 });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>Export "{pageTitle}"</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <RadioGroup value={format} onChange={setFormat}>
            <VStack spacing={3} align="stretch">
              <FormatOption
                value="markdown"
                icon={FiFileText}
                label="Markdown"
                description="Plain text with formatting. Best for portability."
                color="green.500"
                borderColor={borderColor}
                hoverBg={hoverBg}
                isSelected={format === 'markdown'}
              />
              <FormatOption
                value="html"
                icon={FiCode}
                label="HTML"
                description="Styled web page. Preserves formatting and layout."
                color="purple.500"
                borderColor={borderColor}
                hoverBg={hoverBg}
                isSelected={format === 'html'}
              />
              <FormatOption
                value="pdf"
                icon={FiPrinter}
                label="PDF (Print)"
                description="Opens print dialog. Save as PDF from browser."
                color="red.500"
                borderColor={borderColor}
                hoverBg={hoverBg}
                isSelected={format === 'pdf'}
              />
            </VStack>
          </RadioGroup>

          <Button
            mt={6}
            w="full"
            colorScheme="blue"
            leftIcon={<FiDownload />}
            onClick={handleExport}
            isLoading={exporting}
            loadingText="Exporting..."
          >
            {format === 'pdf' ? 'Print to PDF' : `Download ${format.toUpperCase()}`}
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function FormatOption({ value, icon, label, description, color, borderColor, hoverBg, isSelected }: {
  value: string; icon: any; label: string; description: string; color: string;
  borderColor: string; hoverBg: string; isSelected: boolean;
}) {
  return (
    <Box
      as="label"
      p={4}
      border="2px solid"
      borderColor={isSelected ? 'blue.400' : borderColor}
      borderRadius="md"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: hoverBg }}
      bg={isSelected ? 'blue.50' : 'transparent'}
    >
      <HStack spacing={3}>
        <Radio value={value} />
        <Icon as={icon} boxSize={5} color={color} />
        <VStack align="start" spacing={0}>
          <Text fontWeight="600" fontSize="sm">{label}</Text>
          <Text fontSize="xs" color="gray.500">{description}</Text>
        </VStack>
      </HStack>
    </Box>
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-').toLowerCase() || 'export';
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadBlob(url, filename);
  URL.revokeObjectURL(url);
}

function downloadBlob(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
