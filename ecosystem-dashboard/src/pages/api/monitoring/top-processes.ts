/**
 * Top Processes API
 * Returns top CPU and memory consuming processes with orphan/runaway detection
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: number;
  ppid: number;
  user: string;
  cpuPercent: number;
  memPercent: number;
  memRSS: number; // MB
  stat: string;
  elapsed: string;
  command: string;
  isOrphan: boolean;
  isZombie: boolean;
  isRunaway: boolean;
}

interface TopProcessesResponse {
  success: boolean;
  processes: ProcessInfo[];
  zombieCount: number;
  orphanCount: number;
  runawayCount: number;
  loadAverage: number[];
  timestamp: string;
  error?: string;
}

// Known system daemons with PPID=1 that are legitimate
const LEGITIMATE_PPID1 = new Set([
  'systemd', 'dockerd', 'containerd', 'tailscaled', 'warp-svc',
  'NetworkManager', 'redis-server', 'nvidia-persistenced', 'snapd',
  'rsyslogd', 'cron', 'sshd', 'ModemManager', 'accounts-daemon',
  'avahi-daemon', 'bluetoothd', 'polkitd', 'udisksd', 'unattended-upgr',
  'systemd-journal', 'systemd-udevd', 'systemd-oomd', 'systemd-resolve',
  'systemd-timesyn', 'systemd-logind', 'dbus-daemon', 'power-profiles',
  'switcheroo-cont', 'boltd', 'wpa_supplicant', 'gnome-remote-de',
]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopProcessesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false, processes: [], zombieCount: 0, orphanCount: 0,
      runawayCount: 0, loadAverage: [], timestamp: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  try {
    const { stdout: psOut } = await execAsync(
      `ps -eo pid,ppid,user,%cpu,%mem,rss,stat,etime,comm --no-headers --sort=-%cpu | head -40`,
      { timeout: 10000 }
    );

    const { stdout: loadOut } = await execAsync(`cat /proc/loadavg`);
    const loadAverage = loadOut.trim().split(' ').slice(0, 3).map(parseFloat);

    const processes: ProcessInfo[] = [];

    for (const line of psOut.trim().split('\n').filter(Boolean)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const pid = parseInt(parts[0]);
      const ppid = parseInt(parts[1]);
      const user = parts[2];
      const cpuPercent = parseFloat(parts[3]);
      const memPercent = parseFloat(parts[4]);
      const memRSS = Math.round(parseInt(parts[5]) / 1024); // kB -> MB
      const stat = parts[6];
      const elapsed = parts[7];
      const command = parts.slice(8).join(' ');

      const isZombie = stat.includes('Z');
      const isOrphan = ppid === 1 && !LEGITIMATE_PPID1.has(command.substring(0, 15));
      const isRunaway = cpuPercent > 150 && !command.includes('VLLM::');

      processes.push({
        pid, ppid, user, cpuPercent, memPercent, memRSS,
        stat, elapsed, command, isOrphan, isZombie, isRunaway,
      });
    }

    const zombieCount = processes.filter(p => p.isZombie).length;
    const orphanCount = processes.filter(p => p.isOrphan).length;
    const runawayCount = processes.filter(p => p.isRunaway).length;

    return res.status(200).json({
      success: true,
      processes,
      zombieCount,
      orphanCount,
      runawayCount,
      loadAverage,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      processes: [],
      zombieCount: 0,
      orphanCount: 0,
      runawayCount: 0,
      loadAverage: [],
      timestamp: new Date().toISOString(),
      error: e.message,
    });
  }
}
