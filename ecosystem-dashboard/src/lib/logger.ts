/**
 * Browser-safe logger module
 * 
 * This module provides a consistent logging interface that works both in Node.js and browser environments.
 * In Node.js, it uses winston. In the browser, it uses console methods with similar formatting.
 */

// Define log levels and colors (similar to winston defaults)
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

// Define the logger interface
interface Logger {
  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  http: (message: string, ...meta: any[]) => void;
  verbose: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
  silly: (message: string, ...meta: any[]) => void;
}

// Browser implementation using console
class BrowserLogger implements Logger {
  error(message: string, ...meta: any[]) {
    console.error(`[ERROR] ${message}`, ...meta);
  }

  warn(message: string, ...meta: any[]) {
    console.warn(`[WARN] ${message}`, ...meta);
  }

  info(message: string, ...meta: any[]) {
    console.info(`[INFO] ${message}`, ...meta);
  }

  http(message: string, ...meta: any[]) {
    console.log(`[HTTP] ${message}`, ...meta);
  }

  verbose(message: string, ...meta: any[]) {
    console.log(`[VERBOSE] ${message}`, ...meta);
  }

  debug(message: string, ...meta: any[]) {
    console.debug(`[DEBUG] ${message}`, ...meta);
  }

  silly(message: string, ...meta: any[]) {
    console.log(`[SILLY] ${message}`, ...meta);
  }
}

// Server implementation using winston - only loaded in Node.js environments
class ServerLogger implements Logger {
  private winston: any;

  constructor() {
    // Dynamically import winston only on the server
    if (typeof window === 'undefined') {
      try {
        // This will only execute on the server side
        const winston = require('winston');
        this.winston = winston.createLogger({
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              ),
            }),
          ],
        });
      } catch (error) {
        console.error('Failed to initialize winston logger:', error);
        // Fallback to browser logger if winston fails to load
        this.winston = null;
      }
    } else {
      this.winston = null;
    }
  }

  private log(level: LogLevel, message: string, ...meta: any[]) {
    if (this.winston) {
      this.winston[level](message, ...meta);
    } else {
      // Fallback to browser logger
      const browserLogger = new BrowserLogger();
      browserLogger[level](message, ...meta);
    }
  }

  error(message: string, ...meta: any[]) {
    this.log('error', message, ...meta);
  }

  warn(message: string, ...meta: any[]) {
    this.log('warn', message, ...meta);
  }

  info(message: string, ...meta: any[]) {
    this.log('info', message, ...meta);
  }

  http(message: string, ...meta: any[]) {
    this.log('http', message, ...meta);
  }

  verbose(message: string, ...meta: any[]) {
    this.log('verbose', message, ...meta);
  }

  debug(message: string, ...meta: any[]) {
    this.log('debug', message, ...meta);
  }

  silly(message: string, ...meta: any[]) {
    this.log('silly', message, ...meta);
  }
}

// Create and export the appropriate logger based on environment
let logger: Logger;

// In a browser environment, use the browser logger
if (typeof window !== 'undefined') {
  logger = new BrowserLogger();
} else {
  // In a Node.js environment, use the server logger with winston
  logger = new ServerLogger();
}

export default logger;
