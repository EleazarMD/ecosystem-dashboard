/**
 * Email Batch Toolbar Component
 * 
 * Minimalist toolbar for batch email operations.
 * Integrates with the noise filter system for bulk blocking.
 * 
 * Operations:
 * - Select all/none
 * - Batch remove from index
 * - Block selected domains + cleanup
 */

import React, { useState } from 'react';
import { HStack, Checkbox, Text, Button, useToast, Box } from '@chakra-ui/react';
import { TrashIcon, NoSymbolIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EmailBatchToolbarProps {
  selectedIds: Set<string>;
  totalEmails: number;
  emails: Array<{
    id: string;
    from_email: string;
    from_name?: string;
    subject: string;
    is_sent?: boolean;
  }>;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onEmailsDeleted: (ids: string[]) => void;
  graphragUrl: string;
}

export const EmailBatchToolbar: React.FC<EmailBatchToolbarProps> = ({
  selectedIds,
  totalEmails,
  emails,
  onSelectAll,
  onSelectNone,
  onEmailsDeleted,
  graphragUrl,
}) => {
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const textSecondary = useSemanticToken('text.secondary');
  const textPrimary = useSemanticToken('text.primary');

  const selectedCount = selectedIds.size;
  const isAllSelected = selectedCount === totalEmails && totalEmails > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalEmails;

  // Get unique domains from selected emails
  const getSelectedDomains = () => {
    const domains = new Set<string>();
    emails
      .filter((e) => selectedIds.has(e.id))
      .forEach((e) => {
        const domain = e.from_email.split('@')[1];
        if (domain) domains.add(domain);
      });
    return Array.from(domains);
  };

  // Remove selected emails from index
  const handleBatchRemove = async () => {
    if (selectedCount === 0) return;
    setIsProcessing(true);

    const selectedEmails = emails.filter((e) => selectedIds.has(e.id));
    const deletedIds: string[] = [];

    for (const email of selectedEmails) {
      try {
        const res = await fetch(
          `${graphragUrl}/index/email/${encodeURIComponent(email.id)}?is_sent=${email.is_sent || false}`,
          { method: 'DELETE' }
        );
        if (res.ok) deletedIds.push(email.id);
      } catch {}
    }

    setIsProcessing(false);
    onEmailsDeleted(deletedIds);
    toast({
      title: `Removed ${deletedIds.length} emails`,
      status: 'success',
      duration: 2000,
      position: 'bottom-right',
    });
  };

  // Block domains and run cleanup
  const handleBlockAndCleanup = async () => {
    const domains = getSelectedDomains();
    if (domains.length === 0) return;
    setIsProcessing(true);

    // Block each domain
    for (const domain of domains) {
      try {
        await fetch(`${graphragUrl}/filters/noise/domain?domain=${encodeURIComponent(domain)}`, {
          method: 'POST',
        });
      } catch {}
    }

    // Run cleanup
    try {
      const res = await fetch(`${graphragUrl}/index/cleanup/execute?dry_run=false`, {
        method: 'POST',
      });
      const data = await res.json();
      toast({
        title: `Blocked ${domains.length} domain(s)`,
        description: `Removed ${data.removed_count} emails from index`,
        status: 'success',
        duration: 3000,
        position: 'bottom-right',
      });
      onEmailsDeleted(data.removed?.map((r: { id: string }) => r.id) || []);
    } catch {
      toast({ title: 'Cleanup failed', status: 'error', duration: 2000 });
    }

    setIsProcessing(false);
  };

  // Run filter cleanup (no selection needed)
  const handleCleanup = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${graphragUrl}/index/cleanup/execute?dry_run=false`, {
        method: 'POST',
      });
      const data = await res.json();
      toast({
        title: 'Cleanup complete',
        description: `Removed ${data.removed_count} emails matching filters`,
        status: 'success',
        duration: 3000,
        position: 'bottom-right',
      });
      onEmailsDeleted(data.removed?.map((r: { id: string }) => r.id) || []);
    } catch {
      toast({ title: 'Cleanup failed', status: 'error', duration: 2000 });
    }
    setIsProcessing(false);
  };

  return (
    <GlassPanel p={2} mb={2}>
      <HStack justify="space-between">
        {/* Left: Selection */}
        <HStack spacing={3}>
          <Checkbox
            isChecked={isAllSelected}
            isIndeterminate={isPartialSelected}
            onChange={() => (isAllSelected ? onSelectNone() : onSelectAll())}
            colorScheme="purple"
            size="sm"
          />
          <Text fontSize="xs" color={selectedCount > 0 ? textPrimary : textSecondary}>
            {selectedCount > 0 ? `${selectedCount} selected` : `${totalEmails} emails`}
          </Text>
        </HStack>

        {/* Right: Actions */}
        <HStack spacing={1}>
          {selectedCount > 0 && (
            <>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<TrashIcon style={{ width: 14, height: 14 }} />}
                onClick={handleBatchRemove}
                isLoading={isProcessing}
                loadingText="..."
              >
                Remove
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="red"
                leftIcon={<NoSymbolIcon style={{ width: 14, height: 14 }} />}
                onClick={handleBlockAndCleanup}
                isLoading={isProcessing}
                loadingText="..."
              >
                Block & Clean
              </Button>
            </>
          )}
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FunnelIcon style={{ width: 14, height: 14 }} />}
            onClick={handleCleanup}
            isLoading={isProcessing}
            loadingText="..."
          >
            Cleanup
          </Button>
        </HStack>
      </HStack>
    </GlassPanel>
  );
};

export default EmailBatchToolbar;
