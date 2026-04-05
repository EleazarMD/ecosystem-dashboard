/**
 * Global TypeScript declarations for AI Homelab Ecosystem Dashboard
 */

declare global {
  interface Window {
    /**
     * Flag to indicate if AI Gateway is available
     * Set by the AI Gateway client
     */
    __AI_GATEWAY_AVAILABLE__?: boolean;
    
    /**
     * Flag used for testing purposes only
     * To differentiate between different test scenarios
     */
    __TEST_CHECKING_FLAG?: boolean;
  }
}

export {};
