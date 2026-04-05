/**
 * AI Gateway Debug Page - Completely Isolated
 * 
 * This page uses no AI Gateway components or providers to isolate the forEach error
 */

import React from 'react';

export default function AIGatewayDebugPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>AI Gateway Debug Page</h1>
      <p>This page has no AI Gateway imports or providers.</p>
      <p>If this page loads without errors, the issue is in our AI Gateway components.</p>
      <p>If this page still shows the forEach error, the issue is elsewhere in the app.</p>
    </div>
  );
}
