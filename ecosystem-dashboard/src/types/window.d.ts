/**
 * Custom window interface extensions
 * 
 * This file extends the Window interface to add custom properties
 * used throughout the ecosystem dashboard application.
 */

// Extend the Window interface to add our custom properties
declare interface Window {
  /**
   * Flag indicating whether the AI Gateway is available for MCP communication.
   * This is set by the kg-gateway-initializer when the app starts.
   */
  __AI_GATEWAY_AVAILABLE__?: boolean;
}
