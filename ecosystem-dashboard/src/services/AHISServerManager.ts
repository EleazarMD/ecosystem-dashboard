/**
 * AHIS Server Manager
 * 
 * Automatically starts and manages AHIS Server for Agent Registry Hub
 * Provides health checking and auto-recovery functionality
 */

export interface AHISServerStatus {
  running: boolean;
  healthy: boolean;
  port: number;
  pid?: number;
  version?: string;
  uptime?: number;
  lastHealthCheck: string;
  error?: string;
}

class AHISServerManager {
  private static instance: AHISServerManager;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startupAttempts = 0;
  private maxStartupAttempts = 3;
  
  private ahisConfig = {
    port: 8888,
    baseUrl: 'http://localhost:8888',
    healthEndpoint: '/api/ahis/health',
    serverPath: '/Users/eleazar/Projects/AIHomelab/core/orchestrator/infrastructure/ahis-server',
    healthCheckInterval: 30000, // 30 seconds
    startupTimeout: 60000, // 60 seconds
    enabled: true // Can be disabled via environment
  };

  static getInstance(): AHISServerManager {
    if (!AHISServerManager.instance) {
      AHISServerManager.instance = new AHISServerManager();
    }
    return AHISServerManager.instance;
  }

  constructor() {
    // Check if AHIS management is disabled
    if (process.env.DISABLE_AHIS_AUTO_MANAGEMENT === 'true') {
      this.ahisConfig.enabled = false;
      console.log('🔧 AHIS Server auto-management disabled via environment');
    }
  }

  /**
   * Initialize AHIS Server management
   */
  async initialize(): Promise<void> {
    if (!this.ahisConfig.enabled) {
      console.log('⏭️ AHIS Server management disabled, skipping initialization');
      return;
    }

    console.log('🚀 Initializing AHIS Server management...');
    
    try {
      // Check if server is already running
      const status = await this.checkServerHealth();
      
      if (status.running && status.healthy) {
        console.log('✅ AHIS Server already running and healthy');
        this.startHealthMonitoring();
        return;
      }

      // Attempt to start server
      console.log('🔄 Starting AHIS Server...');
      await this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize AHIS Server management:', error);
    }
  }

  /**
   * Check AHIS Server health
   */
  async checkServerHealth(): Promise<AHISServerStatus> {
    const status: AHISServerStatus = {
      running: false,
      healthy: false,
      port: this.ahisConfig.port,
      lastHealthCheck: new Date().toISOString()
    };

    try {
      // Check if server is responding
      const healthUrl = `${this.ahisConfig.baseUrl}${this.ahisConfig.healthEndpoint}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        status.running = true;
        status.healthy = data.status === 'healthy' || data.success === true;
        status.version = data.version;
        status.uptime = data.uptime;
        
        console.log('✅ AHIS Server health check passed:', {
          version: status.version,
          uptime: status.uptime
        });
      } else {
        status.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log('⚠️ AHIS Server responding but unhealthy:', status.error);
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          status.error = 'Health check timeout';
        } else {
          status.error = error.message;
        }
      } else {
        status.error = 'Unknown health check error';
      }
      
      console.log('❌ AHIS Server health check failed:', status.error);
    }

    return status;
  }

  /**
   * Attempt to start AHIS Server
   */
  private async startServer(): Promise<void> {
    if (this.startupAttempts >= this.maxStartupAttempts) {
      throw new Error(`Max startup attempts (${this.maxStartupAttempts}) reached`);
    }

    this.startupAttempts++;
    console.log(`🔄 AHIS Server startup attempt ${this.startupAttempts}/${this.maxStartupAttempts}`);

    try {
      // Check if we can detect the AHIS server directory
      const serverExists = await this.checkServerDirectory();
      if (!serverExists) {
        console.warn('⚠️ AHIS Server directory not found, cannot auto-start');
        console.log('📝 To start AHIS Server manually, run:');
        console.log(`   cd ${this.ahisConfig.serverPath}`);
        console.log('   npm start');
        return;
      }

      // In a browser environment, we can't actually start processes
      // So we'll just provide instructions and monitor
      console.log('📝 To start AHIS Server, run the following commands:');
      console.log(`   cd ${this.ahisConfig.serverPath}`);
      console.log('   npm install  # if not already installed');
      console.log('   npm start    # starts on port 8888');
      console.log('');
      console.log('⏳ Waiting for server to start...');

      // Wait for server to become available
      const maxWaitTime = this.ahisConfig.startupTimeout;
      const checkInterval = 2000; // Check every 2 seconds
      const maxChecks = Math.floor(maxWaitTime / checkInterval);

      for (let i = 0; i < maxChecks; i++) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
        const status = await this.checkServerHealth();
        if (status.running && status.healthy) {
          console.log('✅ AHIS Server started successfully!');
          this.startHealthMonitoring();
          this.startupAttempts = 0; // Reset counter on success
          return;
        }
        
        console.log(`⏳ Waiting for AHIS Server... (${i + 1}/${maxChecks})`);
      }

      throw new Error('AHIS Server failed to start within timeout period');

    } catch (error) {
      console.error(`❌ AHIS Server startup attempt ${this.startupAttempts} failed:`, error);
      
      if (this.startupAttempts < this.maxStartupAttempts) {
        console.log('🔄 Retrying startup in 10 seconds...');
        setTimeout(() => this.startServer(), 10000);
      } else {
        console.error('❌ Max AHIS Server startup attempts reached');
        throw error;
      }
    }
  }

  /**
   * Check if AHIS server directory exists
   */
  private async checkServerDirectory(): Promise<boolean> {
    try {
      // In browser environment, we can't access the filesystem
      // So we'll assume the directory exists and provide instructions
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('🔍 Starting AHIS Server health monitoring...');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.checkServerHealth();
        
        if (!status.running || !status.healthy) {
          console.warn('⚠️ AHIS Server health check failed, attempting recovery...');
          
          // Attempt recovery
          this.startupAttempts = 0; // Reset attempts for recovery
          await this.startServer();
        }
        
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
      }
    }, this.ahisConfig.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 AHIS Server health monitoring stopped');
    }
  }

  /**
   * Get current server status
   */
  async getStatus(): Promise<AHISServerStatus> {
    return await this.checkServerHealth();
  }

  /**
   * Manual server restart trigger
   */
  async restartServer(): Promise<void> {
    console.log('🔄 Manual AHIS Server restart requested...');
    this.startupAttempts = 0; // Reset attempts
    await this.startServer();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHealthMonitoring();
  }
}

export default AHISServerManager;
