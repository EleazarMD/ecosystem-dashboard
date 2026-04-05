import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

export type BackupConfig = {
  sourceDir: string;
  statusPath: string;
  metricsPath: string;
  logPath: string;
};

export function expandHome(p: string): string {
  if (!p) return p;
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

export const BACKUP_PATHS = {
  sourceDir: expandHome(process.env.BACKUP_SOURCE_DIR || '~/Projects/AIHomelab'),
  statusFile: expandHome('~/Projects/AIHomelab/data/backup/status.json'),
  metricsFile: expandHome('~/Projects/AIHomelab/data/backup/metrics.json'),
  configFile: expandHome('~/Projects/AIHomelab/data/backup/config.json'),
  logFile: expandHome(process.env.BACKUP_LOG_PATH || '~/Library/Logs/aihomelab-backup.log'),
  backupScript: expandHome('~/Projects/AIHomelab/scripts/backup.sh'),
  launchAgent: expandHome('~/Library/LaunchAgents/com.aihomelab.backup.plist'),
  backupDestination: expandHome('~/Library/Mobile Documents/com~apple~CloudDocs/AI Homelab Backups'),
} as const;

export function getBackupConfig(): BackupConfig {
  // Default to the known project path but allow overrides via env
  const defaultSource = BACKUP_PATHS.sourceDir;
  const sourceDir = expandHome(process.env.BACKUP_SOURCE_DIR || defaultSource);
  const statusPath = BACKUP_PATHS.statusFile;
  const metricsPath = BACKUP_PATHS.metricsFile;
  const defaultLog = BACKUP_PATHS.logFile;
  const logPath = expandHome(process.env.BACKUP_LOG_PATH || defaultLog);
  return { sourceDir, statusPath, metricsPath, logPath };
}

export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err: any) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return null;
    throw err;
  }
}

export async function tailFile(filePath: string, lines: number): Promise<{
  lines: string[];
  sizeBytes: number;
  exists: boolean;
}> {
  try {
    const stat = await fsp.stat(filePath);
    const sizeBytes = stat.size;
    const content = await fsp.readFile(filePath, 'utf-8');
    const arr = content.replace(/\r\n/g, '\n').split('\n');
    const tail = arr.slice(-Math.max(0, lines));
    return { lines: tail, sizeBytes, exists: true };
  } catch (err: any) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return { lines: [], sizeBytes: 0, exists: false };
    }
    throw err;
  }
}

export function fileExistsSync(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
