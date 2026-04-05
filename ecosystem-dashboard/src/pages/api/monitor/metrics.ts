import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);
const readFile = promisify(fs.readFile);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

async function getCPUMetrics(detail: string = "summary"): Promise<any> {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  const usage = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    const used = total - idle;
    return Math.round((used / total) * 100);
  });

  const avgUsage = Math.round(usage.reduce((a, b) => a + b, 0) / usage.length);

  const result: any = {
    metric: "cpu",
    cores: cpus.length,
    average_usage_percent: avgUsage,
    load_average: {
      "1min": loadAvg[0],
      "5min": loadAvg[1],
      "15min": loadAvg[2],
    },
  };

  if (detail === "full") {
    result.per_core_usage = usage;
    result.model = cpus[0].model;
    result.speed_mhz = cpus[0].speed;
  }

  return result;
}

async function getRAMMetrics(detail: string = "summary"): Promise<any> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = Math.round((usedMem / totalMem) * 100);

  const result: any = {
    metric: "ram",
    total_gb: Math.round((totalMem / 1024 / 1024 / 1024) * 10) / 10,
    used_gb: Math.round((usedMem / 1024 / 1024 / 1024) * 10) / 10,
    free_gb: Math.round((freeMem / 1024 / 1024 / 1024) * 10) / 10,
    usage_percent: usagePercent,
  };

  if (detail === "full") {
    try {
      const { stdout } = await execAsync("free -m");
      const lines = stdout.split("\n");
      const swapLine = lines.find((l) => l.startsWith("Swap:"));
      if (swapLine) {
        const parts = swapLine.split(/\s+/);
        result.swap = {
          total_mb: parseInt(parts[1], 10),
          used_mb: parseInt(parts[2], 10),
          free_mb: parseInt(parts[3], 10),
        };
      }
    } catch {
      // Swap info not available
    }
  }

  return result;
}

async function getGPUMetrics(detail: string = "summary"): Promise<any> {
  try {
    const { stdout } = await execAsync(
      "nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv,noheader,nounits"
    );

    const gpus = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [index, name, util, memUsed, memTotal, temp, power] = line.split(", ");
        return {
          index: parseInt(index, 10),
          name: name.trim(),
          utilization_percent: parseInt(util, 10),
          memory_used_mb: parseInt(memUsed, 10),
          memory_total_mb: parseInt(memTotal, 10),
          memory_usage_percent: Math.round(
            (parseInt(memUsed, 10) / parseInt(memTotal, 10)) * 100
          ),
          temperature_c: parseInt(temp, 10),
          power_draw_w: parseFloat(power),
        };
      });

    const result: any = {
      metric: "gpu",
      count: gpus.length,
      gpus,
    };

    if (detail === "full") {
      try {
        const { stdout: processOut } = await execAsync(
          "nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader,nounits"
        );
        if (processOut.trim()) {
          result.processes = processOut
            .trim()
            .split("\n")
            .map((line) => {
              const [pid, name, mem] = line.split(", ");
              return {
                pid: parseInt(pid, 10),
                name: name.trim(),
                memory_mb: parseInt(mem, 10),
              };
            });
        }
      } catch {
        // No GPU processes
      }
    }

    return result;
  } catch (error) {
    return {
      metric: "gpu",
      status: "unavailable",
      error: "nvidia-smi not found or no GPUs detected",
    };
  }
}

async function getDiskMetrics(detail: string = "summary"): Promise<any> {
  try {
    const { stdout } = await execAsync("df -h / /home");
    const lines = stdout.split("\n").slice(1); // Skip header

    const mounts = lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(/\s+/);
        return {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usage_percent: parseInt(parts[4], 10),
          mount: parts[5],
        };
      });

    const result: any = {
      metric: "disk",
      mounts,
    };

    if (detail === "full") {
      try {
        const { stdout: ioOut } = await execAsync("iostat -x 1 2 | tail -n +4");
        result.io_stats = ioOut.trim();
      } catch {
        // iostat not available
      }
    }

    return result;
  } catch (error) {
    return {
      metric: "disk",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getServiceMetrics(detail: string = "summary"): Promise<any> {
  try {
    const { stdout } = await execAsync(
      "docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}|{{.BlockIO}}'"
    );

    const services = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [name, cpu, mem, net, block] = line.split("|");
        return {
          name,
          cpu: cpu.trim(),
          memory: mem.trim(),
          ...(detail === "full" && {
            network_io: net.trim(),
            block_io: block.trim(),
          }),
        };
      });

    return {
      metric: "services",
      count: services.length,
      services,
    };
  } catch (error) {
    return {
      metric: "services",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getSummary(): Promise<any> {
  const [cpu, ram, gpu, disk] = await Promise.all([
    getCPUMetrics("summary"),
    getRAMMetrics("summary"),
    getGPUMetrics("summary"),
    getDiskMetrics("summary"),
  ]);

  return {
    metric: "summary",
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime_hours: Math.round(os.uptime() / 3600),
    cpu,
    ram,
    gpu,
    disk,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const serviceKey = req.headers["x-internal-service-key"];
  if (serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { metric, detail = "summary" } = req.query;

  if (!metric || typeof metric !== "string") {
    return res.status(400).json({ error: "Metric type required" });
  }

  try {
    let result;

    switch (metric) {
      case "cpu":
        result = await getCPUMetrics(detail as string);
        break;
      case "ram":
        result = await getRAMMetrics(detail as string);
        break;
      case "gpu":
        result = await getGPUMetrics(detail as string);
        break;
      case "disk":
        result = await getDiskMetrics(detail as string);
        break;
      case "network":
        result = { metric: "network", status: "not_implemented" };
        break;
      case "services":
        result = await getServiceMetrics(detail as string);
        break;
      case "summary":
        result = await getSummary();
        break;
      default:
        return res.status(400).json({ error: `Unknown metric: ${metric}` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in monitor metrics API:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
