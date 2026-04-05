/**
 * Draft Context Menu Component
 * 
 * Right-click context menu for AI draft management.
 * Reuses EmailTools for consistent action handling.
 * 
 * Actions available:
 * - Approve draft (alpha mode: marks approved but doesn't send)
 * - Regenerate with different tone
 * - Edit/Revise draft
 * - Add feedback (rating)
 * - Delete draft
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  useToast,
  Portal,
  Badge,
  Input,
  Button,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  CheckCircleIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { createEmailTools, EmailTools } from './EmailTools';

interface DraftContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  draft: {
    id: string;
    email_id?: string;
    to?: string;
    subject?: string;
    status?: string;
    confidence?: number;
  } | null;
  graphragUrl: string;
  onActionComplete?: () => void;
  onEditDraft?: (draftId: string) => void;
  onSelectDraft?: (draftId: string) => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  sublabel,
  onClick,
  variant = 'default',
  disabled = false,
}) => {
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const getColor = () => {
    if (disabled) return textSecondary;
    if (variant === 'danger') return '#F56565';
    if (variant === 'success') return '#48BB78';
    return 'currentColor';
  };

  return (
    <HStack
      px={3}
      py={2}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      _hover={{ bg: disabled ? 'transparent' : hoverBg }}
      onClick={disabled ? undefined : onClick}
      spacing={3}
      borderRadius="md"
      opacity={disabled ? 0.5 : 1}
    >
      <Icon
        style={{
          width: 16,
          height: 16,
          color: getColor(),
          opacity: 0.8,
        }}
      />
      <VStack align="start" spacing={0} flex={1}>
        <Text
          fontSize="sm"
          color={variant === 'danger' ? 'red.400' : variant === 'success' ? 'green.400' : textPrimary}
          fontWeight="medium"
        >
          {label}
        </Text>
        {sublabel && (
          <Text fontSize="xs" color={textSecondary} noOfLines={1}>
            {sublabel}
          </Text>
        )}
      </VStack>
    </HStack>
  );
};

// Star rating component
const StarRating: React.FC<{ rating: number; onRate: (r: number) => void }> = ({ rating, onRate }) => {
  return (
    <HStack spacing={1} px={3} py={2}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Box
          key={star}
          cursor="pointer"
          onClick={() => onRate(star)}
          _hover={{ transform: 'scale(1.2)' }}
          transition="transform 0.1s"
        >
          {star <= rating ? (
            <StarIconSolid style={{ width: 20, height: 20, color: '#ECC94B' }} />
          ) : (
            <StarIcon style={{ width: 20, height: 20, color: '#718096' }} />
          )}
        </Box>
      ))}
    </HStack>
  );
};

export const DraftContextMenu: React.FC<DraftContextMenuProps> = ({
  isOpen,
  onClose,
  position,
  draft,
  graphragUrl,
  onActionComplete,
  onEditDraft,
  onSelectDraft,
}) => {
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [showToneMenu, setShowToneMenu] = useState(false);

  // Create tools instance
  const tools = createEmailTools(graphragUrl, toast, onActionComplete);

  // Semantic tokens
  const glassBg = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Reset state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setShowFeedback(false);
      setShowToneMenu(false);
      setFeedbackRating(0);
      setFeedbackText('');
    }
  }, [isOpen]);

  if (!isOpen || !draft) return null;

  const handleApprove = async () => {
    await tools.approveDraft(draft.id);
    onClose();
  };

  const handleRegenerate = async (tone: string) => {
    setShowToneMenu(false);
    await tools.regenerateDraft(draft.id, tone);
    onClose();
  };

  const handleDelete = async () => {
    await tools.deleteDraft(draft.id);
    onClose();
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating > 0) {
      await tools.addFeedback(draft.id, feedbackRating, feedbackText || undefined);
      onClose();
    }
  };

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 260),
    y: Math.min(position.y, window.innerHeight - 350),
  };

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'formal', label: 'Formal' },
    { value: 'concise', label: 'Concise' },
    { value: 'detailed', label: 'Detailed' },
  ];

  return (
    <Portal>
      <Box
        ref={menuRef}
        position="fixed"
        left={`${adjustedPosition.x}px`}
        top={`${adjustedPosition.y}px`}
        zIndex={9999}
        bg={glassBg}
        backdropFilter="blur(20px)"
        border="1px solid"
        borderColor={glassBorder}
        borderRadius="lg"
        boxShadow="0 8px 32px rgba(0,0,0,0.4)"
        py={1}
        minW="240px"
        overflow="hidden"
      >
        {/* Header - draft info */}
        <Box px={3} py={2} borderBottom="1px solid" borderColor={glassBorder}>
          <HStack justify="space-between">
            <Text fontSize="xs" color={textSecondary} fontWeight="medium" noOfLines={1} maxW="180px">
              {draft.subject || 'Untitled Draft'}
            </Text>
            {draft.confidence && (
              <Badge
                colorScheme={draft.confidence > 0.7 ? 'green' : draft.confidence > 0.4 ? 'yellow' : 'red'}
                fontSize="xs"
              >
                {Math.round(draft.confidence * 100)}%
              </Badge>
            )}
          </HStack>
          <Text fontSize="xs" color={textTertiary}>
            To: {draft.to || 'Unknown'}
          </Text>
        </Box>

        {/* Alpha Mode Warning */}
        <Box px={3} py={1.5} bg="orange.900" borderBottom="1px solid" borderColor={glassBorder}>
          <HStack spacing={2}>
            <ExclamationTriangleIcon style={{ width: 14, height: 14, color: '#ED8936' }} />
            <Text fontSize="xs" color="orange.300">
              Alpha mode: Sending disabled
            </Text>
          </HStack>
        </Box>

        {/* Main Actions */}
        {!showFeedback && !showToneMenu && (
          <>
            <Box py={1}>
              <MenuItem
                icon={CheckCircleIcon}
                label="Approve Draft"
                sublabel="Mark as ready (won't send)"
                onClick={handleApprove}
                variant="success"
              />
              <MenuItem
                icon={PencilSquareIcon}
                label="Edit Draft"
                sublabel="Open in editor"
                onClick={() => {
                  onEditDraft?.(draft.id);
                  onSelectDraft?.(draft.id);
                  onClose();
                }}
              />
              <MenuItem
                icon={ArrowPathIcon}
                label="Regenerate"
                sublabel="Try different tone"
                onClick={() => setShowToneMenu(true)}
              />
            </Box>

            {/* Separator */}
            <Box h="1px" bg={glassBorder} mx={2} />

            {/* Feedback */}
            <Box py={1}>
              <MenuItem
                icon={ChatBubbleLeftIcon}
                label="Rate & Feedback"
                sublabel="Help improve future drafts"
                onClick={() => setShowFeedback(true)}
              />
            </Box>

            {/* Separator */}
            <Box h="1px" bg={glassBorder} mx={2} />

            {/* Delete */}
            <Box py={1}>
              <MenuItem
                icon={TrashIcon}
                label="Delete Draft"
                onClick={handleDelete}
                variant="danger"
              />
            </Box>
          </>
        )}

        {/* Tone Selection Submenu */}
        {showToneMenu && (
          <Box py={1}>
            <HStack px={3} py={1} mb={1}>
              <Text fontSize="xs" color={textSecondary} fontWeight="medium">
                Select tone:
              </Text>
            </HStack>
            {tones.map((tone) => (
              <MenuItem
                key={tone.value}
                icon={SparklesIcon}
                label={tone.label}
                onClick={() => handleRegenerate(tone.value)}
              />
            ))}
            <Box h="1px" bg={glassBorder} mx={2} my={1} />
            <MenuItem
              icon={ArrowPathIcon}
              label="Back"
              onClick={() => setShowToneMenu(false)}
            />
          </Box>
        )}

        {/* Feedback Form */}
        {showFeedback && (
          <Box py={2}>
            <Text fontSize="xs" color={textSecondary} px={3} mb={1}>
              Rate this draft:
            </Text>
            <StarRating rating={feedbackRating} onRate={setFeedbackRating} />
            <Box px={3} py={1}>
              <Input
                size="sm"
                placeholder="Optional feedback..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor={glassBorder}
                _focus={{ borderColor: 'blue.400' }}
              />
            </Box>
            <HStack px={3} py={2} spacing={2}>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleSubmitFeedback}
                isDisabled={feedbackRating === 0}
                flex={1}
              >
                Submit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>
                Cancel
              </Button>
            </HStack>
          </Box>
        )}
      </Box>
    </Portal>
  );
};

export default DraftContextMenu;
