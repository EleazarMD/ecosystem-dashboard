/**
 * Basic AI Gateway Test Page - No Custom Components
 * 
 * Ultra-simplified version using only MUI components
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip
} from '@mui/material';

const AIGatewayBasicPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ p: 4, mb: 4, backgroundColor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Gateway Infrastructure (Basic)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Ultra-simplified test page using only MUI components
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Connection Status
            </Typography>
            <Chip label="Disconnected" color="error" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Health Status
            </Typography>
            <Chip label="Unknown" color="default" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Models Available
            </Typography>
            <Typography variant="body2">
              0 models loaded
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" color="primary" sx={{ mr: 2 }}>
          Connect
        </Button>
        <Button variant="outlined" color="secondary">
          Refresh
        </Button>
      </Box>
    </Box>
  );
};

export default AIGatewayBasicPage;
