/**
 * ImportModal - Import pages from Markdown, CSV, or Notion HTML
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, HStack, Box, Text, Button, Icon, Badge, Tabs, TabList, TabPanels,
  Tab, TabPanel, Textarea, Select, useToast, Progress,
} from '@chakra-ui/react';
import { FiUpload, FiFileText, FiDatabase, FiCode } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { MarkdownParser } from '@/lib/import/MarkdownParser';
import { CSVParser } from '@/lib/import/CSVParser';
import { NotionHTMLParser } from '@/lib/import/NotionHTMLParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  onImportComplete: (result: { title: string; blocks: any[]; type: 'page' | 'database'; schema?: any; rows?: any[] }) => void;
}

export function ImportModal({ isOpen, onClose, workspaceId, userId, onImportComplete }: ImportModalProps) {
  const [markdownText, setMarkdownText] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const processFile = async (file: File) => {
    setImporting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'md' || ext === 'markdown') {
        const text = await file.text();
        const result = MarkdownParser.parse(text);
        onImportComplete({ title: result.title, blocks: result.blocks, type: 'page' });
        toast({ title: `Imported "${result.title}" (${result.blocks.length} blocks)`, status: 'success', duration: 3000 });
      } else if (ext === 'csv') {
        const result = await CSVParser.parseFile(file);
        onImportComplete({ title: file.name.replace('.csv', ''), blocks: [], type: 'database', schema: result.schema, rows: result.rows });
        toast({ title: `Imported ${result.rowCount} rows, ${result.columns.length} columns`, status: 'success', duration: 3000 });
      } else if (ext === 'html' || ext === 'htm') {
        const text = await file.text();
        const result = NotionHTMLParser.parse(text);
        onImportComplete({ title: result.title, blocks: result.blocks, type: 'page' });
        toast({ title: `Imported "${result.title}" (${result.blocks.length} blocks)`, status: 'success', duration: 3000 });
      } else {
        toast({ title: `Unsupported file type: .${ext}`, status: 'error', duration: 3000 });
        return;
      }

      onClose();
    } catch (error: any) {
      toast({ title: 'Import failed', description: error.message, status: 'error', duration: 4000 });
    } finally {
      setImporting(false);
    }
  };

  const handleMarkdownImport = () => {
    if (!markdownText.trim()) return;
    setImporting(true);
    try {
      const result = MarkdownParser.parse(markdownText);
      onImportComplete({ title: result.title, blocks: result.blocks, type: 'page' });
      toast({ title: `Imported "${result.title}" (${result.blocks.length} blocks)`, status: 'success', duration: 3000 });
      setMarkdownText('');
      onClose();
    } catch (error: any) {
      toast({ title: 'Import failed', description: error.message, status: 'error', duration: 4000 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>Import</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList mb={4}>
              <Tab><Icon as={FiUpload} mr={2} />File Upload</Tab>
              <Tab><Icon as={FiFileText} mr={2} />Paste Markdown</Tab>
            </TabList>

            <TabPanels>
              {/* File Upload Tab */}
              <TabPanel p={0}>
                <Box
                  border="2px dashed"
                  borderColor={dragOver ? 'blue.400' : borderColor}
                  borderRadius="lg"
                  p={10}
                  textAlign="center"
                  bg={dragOver ? 'blue.50' : 'transparent'}
                  transition="all 0.2s"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  cursor="pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.csv,.html,.htm"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <VStack spacing={3}>
                    <Icon as={FiUpload} boxSize={10} color="blue.400" />
                    <Text fontWeight="600">Drop file here or click to browse</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="green">.md</Badge>
                      <Badge colorScheme="orange">.csv</Badge>
                      <Badge colorScheme="purple">.html</Badge>
                    </HStack>
                    <Text fontSize="xs" color={textSecondary}>
                      Markdown files become pages, CSV files become databases, HTML from Notion exports
                    </Text>
                  </VStack>
                </Box>

                {importing && <Progress size="sm" isIndeterminate mt={4} colorScheme="blue" />}

                <VStack mt={6} spacing={2} align="start">
                  <Text fontSize="sm" fontWeight="600">Supported Formats</Text>
                  <HStack spacing={4}>
                    <HStack>
                      <Icon as={FiFileText} color="green.500" />
                      <Text fontSize="sm">Markdown (.md) → Page</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FiDatabase} color="orange.500" />
                      <Text fontSize="sm">CSV (.csv) → Database</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FiCode} color="purple.500" />
                      <Text fontSize="sm">Notion HTML → Page</Text>
                    </HStack>
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Paste Markdown Tab */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <Textarea
                    value={markdownText}
                    onChange={(e) => setMarkdownText(e.target.value)}
                    placeholder="Paste your markdown here...

# My Document

Some **bold** and *italic* text.

- List item 1
- List item 2

```python
print('Hello')
```"
                    minH="300px"
                    fontFamily="mono"
                    fontSize="sm"
                  />
                  <Button
                    colorScheme="blue"
                    onClick={handleMarkdownImport}
                    isDisabled={!markdownText.trim()}
                    isLoading={importing}
                    loadingText="Importing..."
                  >
                    Import Markdown
                  </Button>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
