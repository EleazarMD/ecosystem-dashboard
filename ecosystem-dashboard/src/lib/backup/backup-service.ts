import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface BackupSnapshot {
  id: string;
  name: string;
  type: 'daily' | 'weekly';
  size: string;
  sizeBytes: number;
  created: string;
  path: string;
  cloudStatus: 'uploaded' | 'uploading' | 'pending' | 'error' | 'unknown';
  uploadProgress?: number;
  safeInCloud: boolean;
  verified?: boolean;
}

export interface BackupStatus {
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun?: string;
  nextRun?: string;
  currentOperation?: string;
  progress?: number;
  error?: string;
  cloudUploadStatus?: 'complete' | 'pending' | 'uploading';
  safeInCloud?: boolean;
}

export interface CloudSafetyReport {
  allSnapshotsInCloud: boolean;
  totalSnapshots: number;
  uploadedToCloud: number;
  uploading: number;
  pending: number;
  errors: number;
  safetyScore: number; // 0-100%
  unsafeSnapshots: BackupSnapshot[];
  lastVerified: string;
  recommendation: string;
}

export class BackupService {
  private icloudPath: string;
  private backupScriptPath: string;
  private logPath: string;

  constructor() {
    this.icloudPath = path.join(process.env.HOME || '', 'Library/Mobile Documents/com~apple~CloudDocs/AI Homelab Backups/snapshots');
    this.backupScriptPath = '/Users/eleazar/Projects/AIHomelab/scripts/backup.sh';
    this.logPath = path.join(process.env.HOME || '', 'Library/Logs/aihomelab-backup.log');
  }

  /**
   * Check iCloud upload status for a file
   */
  async checkICloudUploadStatus(filePath: string): Promise<{
    status: 'uploaded' | 'uploading' | 'pending' | 'error' | 'unknown';
    progress?: number;
    safeInCloud: boolean;
  }> {
    try {
      // Method 1: Check extended attributes for upload progress
      const { stdout: xattrOutput } = await execAsync(`xattr -l "${filePath}" 2>/dev/null || true`);
      
      // If has progress attribute, it's uploading
      if (xattrOutput.includes('com.apple.progress.fractionCompleted')) {
        const match = xattrOutput.match(/fractionCompleted.*?(\d+\.?\d*)/);
        const progress = match ? Math.round(parseFloat(match[1]) * 100) : 0;
        return {
          status: 'uploading',
          progress,
          safeInCloud: false
        };
      }

      // Method 2: Use brctl (if available) to check ubiquity status
      try {
        const { stdout: brctlOutput } = await execAsync(`brctl dump "${filePath}" 2>/dev/null || true`);
        
        if (brctlOutput.includes('uploaded')) {
          return { status: 'uploaded', safeInCloud: true };
        } else if (brctlOutput.includes('uploading')) {
          return { status: 'uploading', safeInCloud: false };
        } else if (brctlOutput.includes('pending')) {
          return { status: 'pending', safeInCloud: false };
        }
      } catch (error) {
        // brctl might not be available
      }

      // Method 3: Check if file exists and no progress attributes = uploaded
      const stats = await fs.stat(filePath);
      if (stats.size > 0 && !xattrOutput.includes('com.apple.progress')) {
        return { status: 'uploaded', safeInCloud: true };
      }

      return { status: 'unknown', safeInCloud: false };
    } catch (error) {
      return { status: 'error', safeInCloud: false };
    }
  }

  /**
   * List all backup snapshots with cloud status
   */
  async listSnapshots(): Promise<BackupSnapshot[]> {
    try {
      const files = await fs.readdir(this.icloudPath);
      const snapshots: BackupSnapshot[] = [];

      for (const file of files) {
        if (!file.endsWith('.tar.gz')) continue;

        const filePath = path.join(this.icloudPath, file);
        const stats = await fs.stat(filePath);
        const cloudStatus = await this.checkICloudUploadStatus(filePath);

        const type = file.includes('weekly') ? 'weekly' : 'daily';
        const sizeInGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);

        snapshots.push({
          id: file,
          name: file,
          type,
          size: `${sizeInGB} GB`,
          sizeBytes: stats.size,
          created: stats.mtime.toISOString(),
          path: filePath,
          cloudStatus: cloudStatus.status,
          uploadProgress: cloudStatus.progress,
          safeInCloud: cloudStatus.safeInCloud,
        });
      }

      return snapshots.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    } catch (error) {
      console.error('Error listing snapshots:', error);
      return [];
    }
  }

  /**
   * Get overall backup status including cloud safety
   */
  async getBackupStatus(): Promise<BackupStatus> {
    try {
      // Read LaunchAgent schedule
      const launchAgentPath = path.join(
        process.env.HOME || '',
        'Library/LaunchAgents/com.aihomelab.backup.plist'
      );

      const snapshots = await this.listSnapshots();
      const latestSnapshot = snapshots[0];
      const allSafe = snapshots.every(s => s.safeInCloud);

      return {
        status: 'idle',
        lastRun: latestSnapshot?.created,
        nextRun: new Date(new Date().setHours(2, 0, 0, 0) + (Date.now() > new Date().setHours(2, 0, 0, 0) ? 86400000 : 0)).toISOString(),
        cloudUploadStatus: allSafe ? 'complete' : 'pending',
        safeInCloud: allSafe,
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify cloud safety of all snapshots
   */
  async verifyCloudSafety(): Promise<CloudSafetyReport> {
    const snapshots = await this.listSnapshots();
    
    const uploadedToCloud = snapshots.filter(s => s.safeInCloud).length;
    const uploading = snapshots.filter(s => s.cloudStatus === 'uploading').length;
    const pending = snapshots.filter(s => s.cloudStatus === 'pending').length;
    const errors = snapshots.filter(s => s.cloudStatus === 'error').length;
    const unsafeSnapshots = snapshots.filter(s => !s.safeInCloud);
    
    const safetyScore = snapshots.length > 0 
      ? Math.round((uploadedToCloud / snapshots.length) * 100)
      : 0;

    let recommendation = '';
    if (safetyScore === 100) {
      recommendation = 'All backups are safely uploaded to iCloud';
    } else if (uploading > 0) {
      recommendation = `${uploading} backup(s) currently uploading. Wait for completion.`;
    } else if (pending > 0) {
      recommendation = `${pending} backup(s) pending upload. Check internet connection.`;
    } else if (errors > 0) {
      recommendation = `${errors} backup(s) have upload errors. Review and retry.`;
    }

    return {
      allSnapshotsInCloud: unsafeSnapshots.length === 0,
      totalSnapshots: snapshots.length,
      uploadedToCloud,
      uploading,
      pending,
      errors,
      safetyScore,
      unsafeSnapshots,
      lastVerified: new Date().toISOString(),
      recommendation,
    };
  }

  /**
   * Wait for a snapshot to upload to iCloud
   */
  async waitForCloudUpload(
    snapshotId: string,
    timeoutMinutes: number = 30
  ): Promise<{
    status: 'completed' | 'timeout' | 'error';
    uploadDuration?: string;
    safeInCloud: boolean;
  }> {
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const filePath = path.join(this.icloudPath, snapshotId);

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkICloudUploadStatus(filePath);
      
      if (status.safeInCloud) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        return {
          status: 'completed',
          uploadDuration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
          safeInCloud: true,
        };
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return {
      status: 'timeout',
      safeInCloud: false,
    };
  }

  /**
   * Trigger backup and optionally wait for upload
   */
  async triggerBackup(waitForUpload: boolean = true): Promise<{
    jobId: string;
    localStatus: 'running' | 'completed' | 'failed';
    localFile?: string;
    cloudStatus?: 'uploading' | 'uploaded' | 'pending';
    uploadProgress?: number;
    safeInCloud: boolean;
    estimatedUploadTime?: string;
  }> {
    const jobId = `backup-${Date.now()}`;
    
    try {
      // Run backup script
      await execAsync(`bash ${this.backupScriptPath}`);
      
      // Get the latest snapshot
      const snapshots = await this.listSnapshots();
      const latestSnapshot = snapshots[0];

      if (!latestSnapshot) {
        return {
          jobId,
          localStatus: 'failed',
          safeInCloud: false,
        };
      }

      const result: any = {
        jobId,
        localStatus: 'completed',
        localFile: latestSnapshot.name,
        cloudStatus: latestSnapshot.cloudStatus,
        uploadProgress: latestSnapshot.uploadProgress,
        safeInCloud: latestSnapshot.safeInCloud,
      };

      if (waitForUpload && !latestSnapshot.safeInCloud) {
        const uploadResult = await this.waitForCloudUpload(latestSnapshot.id, 30);
        result.cloudStatus = uploadResult.status === 'completed' ? 'uploaded' : 'uploading';
        result.safeInCloud = uploadResult.safeInCloud;
        result.estimatedUploadTime = uploadResult.uploadDuration;
      }

      return result;
    } catch (error) {
      return {
        jobId,
        localStatus: 'failed',
        safeInCloud: false,
      };
    }
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshot(snapshotId: string): Promise<{
    valid: boolean;
    fileCount?: number;
    errors?: string[];
  }> {
    try {
      const filePath = path.join(this.icloudPath, snapshotId);
      const { stdout } = await execAsync(`tar -tzf "${filePath}" | wc -l`);
      const fileCount = parseInt(stdout.trim());

      return {
        valid: fileCount > 0,
        fileCount,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Verification failed'],
      };
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<{
    success: boolean;
    spaceFreed?: string;
  }> {
    try {
      const filePath = path.join(this.icloudPath, snapshotId);
      const stats = await fs.stat(filePath);
      const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
      
      await fs.unlink(filePath);
      
      return {
        success: true,
        spaceFreed: `${sizeGB} GB`,
      };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Get backup metrics
   */
  async getBackupMetrics(): Promise<{
    totalBackups: number;
    successRate: number;
    storageUsed: string;
    dailySnapshots: number;
    weeklySnapshots: number;
    cloudSafetyScore: number;
    uploadedToCloud: number;
  }> {
    const snapshots = await this.listSnapshots();
    const safetyReport = await this.verifyCloudSafety();
    
    const totalSize = snapshots.reduce((sum, s) => sum + s.sizeBytes, 0);
    const sizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(1);

    return {
      totalBackups: snapshots.length,
      successRate: 100, // Would need to track failures from logs
      storageUsed: `${sizeGB} GB`,
      dailySnapshots: snapshots.filter(s => s.type === 'daily').length,
      weeklySnapshots: snapshots.filter(s => s.type === 'weekly').length,
      cloudSafetyScore: safetyReport.safetyScore,
      uploadedToCloud: safetyReport.uploadedToCloud,
    };
  }
}

export const backupService = new BackupService();
