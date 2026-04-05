/**
 * DEPRECATED: MCP Server Command Execution API Route
 * 
 * This API route has been deprecated in favor of the AHIS execute API route.
 * It is maintained temporarily for backward compatibility but will be removed in a future release.
 * 
 * Please update your code to use /api/ahis/execute instead.
 */
import deprecationHandler, { config } from './deprecated';

// Export the deprecation handler as the default handler
export default deprecationHandler;

// Export the config to disable body parsing for WebSocket routes
export { config };
