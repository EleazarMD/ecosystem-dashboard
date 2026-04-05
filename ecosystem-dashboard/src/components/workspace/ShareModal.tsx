/**
 * Share Modal Component
 * Permission management dialog for sharing pages/blocks
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Text,
  Avatar,
  IconButton,
  Divider,
  Switch,
  useToast,
  Box,
  Tag,
  InputGroup,
  InputLeftElement,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import { FiMail, FiLink, FiCopy, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { PermissionLevel, CollaboratorsResponse, ShareLinkResponse } from '@/types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ShareModalProps {
  blockId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function ShareModal({ blockId, isOpen, onClose, currentUserId }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('can_view');
  const [message, setMessage] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkPermission, setLinkPermission] = useState<PermissionLevel>('can_view');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);
  const toast = useToast();

  // Load collaborators on mount
  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, blockId]);

  const loadCollaborators = async () => {
    try {
      setLoadingCollaborators(true);
      const response = await fetch(`/api/workspace/permissions/collaborators?block_id=${blockId}`, {
        headers: { 'x-user-id': currentUserId },
      });
      const data: CollaboratorsResponse = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const handleInviteUser = async () => {
    if (!email) {
      toast({ title: 'Please enter an email address', status: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/workspace/permissions/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          block_id: blockId,
          user_email: email,
          permission_level: permissionLevel,
          message,
        }),
      });

      if (response.ok) {
        toast({ title: 'Invitation sent!', status: 'success' });
        setEmail('');
        setMessage('');
        await loadCollaborators();
      } else {
        const error = await response.json();
        toast({ title: 'Failed to send invitation', description: error.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to send invitation', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspace/permissions/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          block_id: blockId,
          permission_level: linkPermission,
        }),
      });

      if (response.ok) {
        const data: ShareLinkResponse = await response.json();
        setShareLink(data.link_info.link_url);
        toast({ title: 'Share link created!', status: 'success' });
      } else {
        toast({ title: 'Failed to create link', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to create link', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({ title: 'Link copied!', status: 'success', duration: 2000 });
    }
  };

  const handleRevokeAccess = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch('/api/workspace/permissions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          block_id: blockId,
          user_id: userId,
        }),
      });

      if (response.ok) {
        toast({ title: `Removed ${userEmail}`, status: 'success' });
        await loadCollaborators();
      } else {
        toast({ title: 'Failed to revoke access', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to revoke access', status: 'error' });
    }
  };

  const getPermissionColor = (level: PermissionLevel) => {
    const colors = {
      full_access: 'purple',
      can_edit: 'blue',
      can_comment: 'green',
      can_view: 'gray',
    };
    return colors[level];
  };

  const getPermissionLabel = (level: PermissionLevel) => {
    const labels = {
      full_access: 'Full Access',
      can_edit: 'Can Edit',
      can_comment: 'Can Comment',
      can_view: 'Can View',
    };
    return labels[level];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Share</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            {/* Invite by Email */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Invite people
              </Text>
              <VStack spacing={2}>
                <HStack w="full">
                  <InputGroup flex={1}>
                    <InputLeftElement pointerEvents="none">
                      <FiMail color="gray" />
                    </InputLeftElement>
                    <Input
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleInviteUser()}
                    />
                  </InputGroup>
                  <Select
                    value={permissionLevel}
                    onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
                    w="150px"
                  >
                    <option value="can_view">Can view</option>
                    <option value="can_comment">Can comment</option>
                    <option value="can_edit">Can edit</option>
                    <option value="full_access">Full access</option>
                  </Select>
                  <Button
                    colorScheme="blue"
                    onClick={handleInviteUser}
                    isLoading={loading}
                    isDisabled={!email}
                  >
                    Invite
                  </Button>
                </HStack>
                <Input
                  placeholder="Add a message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  size="sm"
                />
              </VStack>
            </Box>

            <Divider />

            {/* Current Collaborators */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                People with access
              </Text>
              {loadingCollaborators ? (
                <HStack justify="center" py={4}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Loading...</Text>
                </HStack>
              ) : collaborators.length === 0 ? (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No collaborators yet</Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {collaborators.map((collab) => (
                    <HStack key={collab.user_id} justify="space-between" p={2} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                      <HStack>
                        <Avatar size="sm" name={collab.user_name || collab.user_email} />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="500">
                            {collab.user_name || collab.user_email}
                          </Text>
                          {collab.user_name && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {collab.user_email}
                            </Text>
                          )}
                        </VStack>
                        {collab.is_inherited && (
                          <Tooltip label="Inherited from parent">
                            <Tag size="sm" colorScheme="gray">Inherited</Tag>
                          </Tooltip>
                        )}
                      </HStack>
                      <HStack>
                        <Tag size="sm" colorScheme={getPermissionColor(collab.permission_level)}>
                          {getPermissionLabel(collab.permission_level)}
                        </Tag>
                        <IconButton
                          aria-label="Remove access"
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleRevokeAccess(collab.user_id, collab.user_email)}
                        />
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>

            <Divider />

            {/* Share Link */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="600">
                  Share link
                </Text>
                <Switch
                  size="sm"
                  isChecked={!!shareLink}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleCreateShareLink();
                    } else {
                      setShareLink(null);
                    }
                  }}
                />
              </HStack>
              {shareLink ? (
                <VStack spacing={2}>
                  <HStack w="full">
                    <Select
                      value={linkPermission}
                      onChange={(e) => setLinkPermission(e.target.value as PermissionLevel)}
                      size="sm"
                    >
                      <option value="can_view">Can view</option>
                      <option value="can_comment">Can comment</option>
                      <option value="can_edit">Can edit</option>
                    </Select>
                  </HStack>
                  <HStack w="full">
                    <Input
                      value={shareLink}
                      isReadOnly
                      size="sm"
                      bg={useSemanticToken('surface.base')}
                    />
                    <Tooltip label="Copy link">
                      <IconButton
                        aria-label="Copy link"
                        icon={<FiCopy />}
                        size="sm"
                        onClick={handleCopyLink}
                      />
                    </Tooltip>
                  </HStack>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Anyone with this link can {linkPermission === 'can_view' ? 'view' : linkPermission === 'can_edit' ? 'edit' : 'comment on'} this page
                  </Text>
                </VStack>
              ) : (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Enable to create a shareable link
                </Text>
              )}
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
