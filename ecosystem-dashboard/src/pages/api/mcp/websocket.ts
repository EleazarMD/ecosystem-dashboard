/**
 * DEPRECATED: MCP Server WebSocket API Route
 * 
 * This API route has been deprecated in favor of the AHIS WebSocket API route.
 * It is maintained temporarily for backward compatibility but will be removed in a future release.
 * 
 * Please update your code to use /api/ahis/websocket instead.
 */
import deprecationHandler from './deprecated';

// Export the deprecation handler as the default handler
export default deprecationHandler;

// Export the config to disable body parsing for WebSocket routes
export const config = {
  api: {
    bodyParser: false,
  },
};
