/**
 * AI Gateway Debug Page
 * 
 * Gradually add imports to find the forEach error source
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAIGatewayClient } from '@/lib/ai-gateway-client-provider-safe';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Start with just basic MUI components - no custom imports yet

export default function AIGatewayDebugPage() {
  const [activeTab, setActiveTab] = useState(0);
  
  // Test AI Gateway client hook
  const {
    client,
    isConnected,
    connectionState,
    models,
    error
  } = useAIGatewayClient();

  return (
    <DashboardLayout>
      <Box p={4}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AIIcon color="primary" />
        AI Gateway Debug - Step 5b: Tables Only (No Tabs)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Testing with MUI Tabs and Tables added. If this fails, complex MUI components are the problem.
      </Alert>

      <GlassPanel variant="light" elevation={2}>
        <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Basic Components Test
          </Typography>
          
          <Box display="flex" gap={2} mb={2}>
            <Button variant="contained" startIcon={<RefreshIcon />}>
              Test Button
            </Button>
            <Chip label="Test Chip" color="success" />
            <CircularProgress size={20} />
          </Box>
          
          <Typography>
            Connection State: {connectionState || 'Unknown'}
          </Typography>
          <Typography>
            Models Count: {(models || []).length}
          </Typography>
          <Typography>
            Error: {error || 'None'}
          </Typography>
          
          {/* Test Tabs - REMOVED TO TEST */}
          <Typography sx={{ mt: 2 }}>Tabs component removed for testing</Typography>
          
          {/* Test Table */}
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test Column</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Test Row</TableCell>
                  <TableCell>Test Value</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
        </Card>
      </GlassPanel>
      </Box>
    </DashboardLayout>
  );
}
