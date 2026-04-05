import React, { useRef } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  HStack,
  Text,
  Icon,
  useToast,
  VStack,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPaperclip, 
  FiFile, 
  FiImage, 
  FiVideo, 
  FiMusic,
  FiFileText,
} from 'react-icons/fi';

interface AttachmentMenuProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  acceptedTypes?: string;
  showDeepResearch?: boolean;
  onDeepResearchClick?: () => void;
}

export default function AttachmentMenu({
  onFileSelect,
  disabled = false,
  acceptedTypes = '.txt,.md,.pdf,image/*,video/*,audio/*',
  showDeepResearch = false,
  onDeepResearchClick,
}: AttachmentMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileClick = (accept?: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept || acceptedTypes;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 50MB',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      onFileSelect(file);
      
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <>
      <Menu placement="top-start">
        <Tooltip 
          label={disabled ? "Select a project first to attach files" : "Attach files"}
          placement="top"
          openDelay={500}
          closeDelay={100}
        >
          <MenuButton
            as={IconButton}
            icon={<FiPaperclip />}
            variant="ghost"
            size="sm"
            aria-label="Attach files"
            isDisabled={disabled}
            _hover={{ bg: 'gray.100' }}
          />
        </Tooltip>
        <MenuList minW="280px" py={2}>
          <VStack align="stretch" spacing={0}>
            {/* File Upload Options */}
            <MenuItem
              icon={<Icon as={FiFile} boxSize={5} />}
              onClick={() => handleFileClick()}
              py={3}
            >
              <VStack align="start" spacing={0}>
                <Text fontWeight="500">Add photos & files</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  PDF, images, video, audio (max 50MB)
                </Text>
              </VStack>
            </MenuItem>

            <MenuItem
              icon={<Icon as={FiImage} boxSize={5} />}
              onClick={() => handleFileClick('image/*')}
              py={3}
            >
              <Text fontWeight="500">Add images</Text>
            </MenuItem>

            <MenuItem
              icon={<Icon as={FiVideo} boxSize={5} />}
              onClick={() => handleFileClick('video/*')}
              py={3}
            >
              <Text fontWeight="500">Add video</Text>
            </MenuItem>

            <MenuItem
              icon={<Icon as={FiMusic} boxSize={5} />}
              onClick={() => handleFileClick('audio/*')}
              py={3}
            >
              <Text fontWeight="500">Add audio</Text>
            </MenuItem>

            <MenuItem
              icon={<Icon as={FiFileText} boxSize={5} />}
              onClick={() => handleFileClick('.pdf')}
              py={3}
            >
              <Text fontWeight="500">Add PDF</Text>
            </MenuItem>

            {showDeepResearch && onDeepResearchClick && (
              <>
                <Divider my={1} />
                <MenuItem
                  icon={<Text fontSize="lg">🔬</Text>}
                  onClick={onDeepResearchClick}
                  py={3}
                >
                  <Text fontWeight="500">Deep research</Text>
                </MenuItem>
              </>
            )}
          </VStack>
        </MenuList>
      </Menu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
