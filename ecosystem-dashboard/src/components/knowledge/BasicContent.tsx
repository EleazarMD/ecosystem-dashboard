/**
 * Basic Knowledge Graph Page Content - Client-side only component
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';

const BasicContent: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Knowledge Graph
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Basic Knowledge Graph Interface
        </Typography>
        <Typography variant="body1">
          This is a minimal Knowledge Graph page to test basic functionality.
        </Typography>
      </Paper>
    </Box>
  );
};

export default BasicContent;
