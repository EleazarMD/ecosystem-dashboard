/**
 * Application Startup Service
 * 
 * Manages the initialization and startup sequence for the AI Homelab Dashboard,
 * including AHIS registration, service discovery, and component initialization.
 */

import { ahisRegistrationService } from './AHISRegistrationService';

export class ApplicationStartupService {
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;

  /**
   * Initialize all application services
   */
  async initialize(): Promise<boolean> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return true if already initialized
    if (this.isInitialized) {
      return true;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization sequence
   */
  private async performInitialization(): Promise<boolean> {
    try {
      console.log('🚀 Starting AI Homelab Dashboard initialization...');

      // Step 1: Initialize AHIS Registration Service
      console.log('📋 Step 1: Initializing AHIS Registration Service...');
      const ahisInitialized = await ahisRegistrationService.initialize();
      
      if (ahisInitialized) {
        console.log('✅ AHIS Registration Service initialized successfully');
      } else {
        console.warn('⚠️ AHIS Registration Service initialization failed, continuing in standalone mode');
      }

      // Step 2: Additional service initializations can be added here
      // For example: Knowledge Graph MCP, IDE Memory MCP, etc.

      this.isInitialized = true;
      console.log('✅ AI Homelab Dashboard initialization complete');
      
      return true;

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down AI Homelab Dashboard...');

      // Shutdown AHIS Registration Service
      await ahisRegistrationService.shutdown();

      this.isInitialized = false;
      console.log('✅ AI Homelab Dashboard shutdown complete');

    } catch (error) {
      console.error('❌ Error during application shutdown:', error);
    }
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    isInitialized: boolean;
    ahisStatus: {
      isRegistered: boolean;
      registrationAttempts: number;
      clientConnected: boolean;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      ahisStatus: ahisRegistrationService.getStatus()
    };
  }
}

// Export singleton instance
export const applicationStartupService = new ApplicationStartupService();

// Auto-initialize on import in server environments
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Initialize with a delay to allow the server to fully start
  setTimeout(() => {
    applicationStartupService.initialize().catch(error => {
      console.error('❌ Auto-initialization failed:', error);
    });
  }, 2000); // 2 second delay
}
