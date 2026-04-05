/**
 * ApprovalSettingsPanel - Right Panel Wrapper
 * 
 * Wrapper for ApprovalSettings that ensures ApprovalProvider context is available
 * when rendered in the right dynamic panel.
 */

import React from 'react';
import { Box } from '@chakra-ui/react';
import { ApprovalProvider } from '@/contexts/ApprovalContext';
import { ApprovalSettings } from './ApprovalSettings';

interface ApprovalSettingsPanelProps {
  onClose?: () => void;
}

export function ApprovalSettingsPanel({ onClose }: ApprovalSettingsPanelProps) {
  return (
    <Box h="100%" overflow="hidden">
      <ApprovalProvider userId="eleazar">
        <ApprovalSettings onClose={onClose} />
      </ApprovalProvider>
    </Box>
  );
}

export default ApprovalSettingsPanel;
