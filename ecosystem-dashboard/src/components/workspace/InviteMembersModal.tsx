/**
 * Invite Members Modal Component
 * Workspace-wide member invitation
 */

import React, { useState } from 'react';
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
  useToast,
  InputGroup,
  InputLeftElement,
  Textarea,
  Box,
  Tag,
} from '@chakra-ui/react';
import { FiMail, FiSend } from 'react-icons/fi';
import { WorkspaceRole } from '@/types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface InviteMembersModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function InviteMembersModal({ workspaceId, isOpen, onClose, currentUserId }: InviteMembersModalProps) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleInvite = async () => {
    const emailList = emails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      toast({ title: 'Please enter at least one email address', status: 'warning' });
      return;
    }

    try {
      setLoading(true);
      
      // Send invitations for each email
      const promises = emailList.map(email =>
        fetch('/api/workspace/members/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            email,
            role,
            message,
          }),
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Invitations sent!',
        description: `Sent ${emailList.length} invitation${emailList.length > 1 ? 's' : ''}`,
        status: 'success',
      });

      setEmails('');
      setMessage('');
      onClose();
    } catch (error) {
      toast({ title: 'Failed to send invitations', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (roleValue: WorkspaceRole) => {
    const descriptions: Record<WorkspaceRole, string> = {
      owner: 'Full control including workspace deletion',
      admin: 'Manage settings and invite members',
      member: 'Create and edit pages',
      guest: 'Limited access to specific pages',
    };
    return descriptions[roleValue];
  };

  const getRoleColor = (roleValue: WorkspaceRole) => {
    const colors: Record<WorkspaceRole, string> = {
      owner: 'purple',
      admin: 'blue',
      member: 'green',
      guest: 'gray',
    };
    return colors[roleValue];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Invite Members</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            {/* Email Input */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Email addresses
              </Text>
              <Textarea
                placeholder="Enter email addresses (one per line or comma-separated)"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={4}
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                Separate multiple emails with commas or new lines
              </Text>
            </Box>

            {/* Role Selection */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Role
              </Text>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              >
                <option value="member">Member</option>
                <option value="guest">Guest</option>
                <option value="admin">Admin</option>
              </Select>
              <HStack mt={2} spacing={2} align="start">
                <Tag size="sm" colorScheme={getRoleColor(role)}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Tag>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {getRoleDescription(role)}
                </Text>
              </HStack>
            </Box>

            {/* Custom Message */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Message (optional)
              </Text>
              <Textarea
                placeholder="Add a personal message to the invitation"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </Box>

            {/* Action Buttons */}
            <HStack justify="flex-end" pt={2}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                leftIcon={<FiSend />}
                onClick={handleInvite}
                isLoading={loading}
                isDisabled={!emails.trim()}
              >
                Send Invitations
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
