/**
 * AI Gateway Test Page - No Validation
 * 
 * Test page that bypasses validation to isolate forEach errors
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AIGatewayNoValidationPage() {
  return (
    <DashboardLayout>
      <Box p={4}>
        <Typography variant="h4" gutterBottom>
          AI Gateway - No Validation Test
        </Typography>
        
        <Card>
          <CardContent>
            <Typography>
              This page tests if the forEach error is in the AI Gateway client validation.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
