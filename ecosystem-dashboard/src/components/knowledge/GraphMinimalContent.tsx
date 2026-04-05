/**
 * Minimal Knowledge Graph Page Content - Client-side only component
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

const GraphMinimalContent: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">
        Knowledge Graph Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        This is a minimal test version.
      </Typography>
    </Box>
  );
};

export default GraphMinimalContent;
