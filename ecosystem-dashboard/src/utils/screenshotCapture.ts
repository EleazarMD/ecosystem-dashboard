/**
 * Screenshot Capture Utility
 * Handles browser screenshot capture for AI vision analysis
 */

export interface ScreenshotOptions {
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  fullPage?: boolean;
  element?: HTMLElement;
}

export interface ScreenshotResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  timestamp: Date;
}

export class ScreenshotCapture {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor() {
    // Only initialize DOM elements on client side
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d')!;
    }
  }

  private ensureClientSide(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('ScreenshotCapture can only be used on the client side');
    }
    if (!this.canvas || !this.context) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d')!;
    }
  }

  /**
   * Capture screenshot using html2canvas approach
   */
  async captureElement(element: HTMLElement, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    this.ensureClientSide();
    
    const {
      quality = 0.9,
      format = 'png',
    } = options;

    try {
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(element, {
        allowTaint: true,
        useCORS: true,
        scale: 1.0, // Full scale for better MedGemma vision analysis
        backgroundColor: null,
        removeContainer: true,
        logging: false,
        width: Math.min(element.offsetWidth, 1200), // Higher resolution for medical analysis
        height: Math.min(element.offsetHeight, 800), // Higher resolution for medical analysis
      });

      // Use PNG for both blob and dataUrl for consistent format
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      const imageDataUrl = canvas.toDataURL('image/png');

      return {
        dataUrl: imageDataUrl,
        blob,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      throw new Error(`Screenshot capture failed: ${error}`);
    }
  }

  /**
   * Capture full page screenshot
   */
  async captureFullPage(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    this.ensureClientSide();
    return this.captureElement(document.documentElement, {
      ...options,
      fullPage: true,
    });
  }

  /**
   * Capture visible viewport
   */
  async captureViewport(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    this.ensureClientSide();
    return this.captureElement(document.body, options);
  }

  /**
   * Capture specific dashboard area
   */
  async captureDashboardContent(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    this.ensureClientSide();
    // Try to find main content area
    const mainContent = document.querySelector('main') || 
                       document.querySelector('[role="main"]') ||
                       document.querySelector('.dashboard-content') ||
                       document.body;

    return this.captureElement(mainContent as HTMLElement, options);
  }

  /**
   * Convert blob to base64 for API transmission
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Prepare screenshot for AI analysis
   */
  async prepareForAI(element?: HTMLElement, options: ScreenshotOptions = {}): Promise<{
    base64: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      timestamp: string;
      captureType: string;
    };
  }> {
    let result: ScreenshotResult;
    let captureType: string;

    if (element) {
      result = await this.captureElement(element, options);
      captureType = 'element';
    } else {
      result = await this.captureDashboardContent(options);
      captureType = 'dashboard';
    }

    const base64 = await this.blobToBase64(result.blob);

    return {
      base64,
      metadata: {
        width: result.width,
        height: result.height,
        format: options.format || 'png',
        timestamp: result.timestamp.toISOString(),
        captureType,
      },
    };
  }
}

// Singleton instance - only create on client side
export const screenshotCapture = typeof window !== 'undefined' ? new ScreenshotCapture() : null;
