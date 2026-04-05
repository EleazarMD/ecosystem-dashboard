import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";
import dns from "dns";

const execAsync = promisify(exec);
const dnsLookup = promisify(dns.lookup);
const dnsReverse = promisify(dns.reverse);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

// Known homelab services with their default ports
const HOMELAB_SERVICES: Record<string, { host: string; port: number }> = {
  "hermes-core": { host: "100.108.41.22", port: 8780 },
  "ai-gateway": { host: "localhost", port: 8777 },
  "openclaw": { host: "localhost", port: 18793 },
  "nova-agent": { host: "localhost", port: 18800 },
  "ecosystem-dashboard": { host: "localhost", port: 8404 },
  "ai-inferencing": { host: "localhost", port: 9000 },
};

async function pingCheck(target: string, timeout: number = 5): Promise<any> {
  try {
    const { stdout } = await execAsync(`ping -c 3 -W ${timeout} ${target}`);
    
    // Parse ping output for stats
    const lines = stdout.split("\n");
    const statsLine = lines.find((l) => l.includes("min/avg/max"));
    const lossLine = lines.find((l) => l.includes("packet loss"));
    
    let stats = null;
    if (statsLine) {
      const match = statsLine.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
      if (match) {
        stats = {
          min: parseFloat(match[1]),
          avg: parseFloat(match[2]),
          max: parseFloat(match[3]),
          stddev: parseFloat(match[4]),
        };
      }
    }

    let packetLoss = null;
    if (lossLine) {
      const match = lossLine.match(/([\d.]+)% packet loss/);
      if (match) {
        packetLoss = parseFloat(match[1]);
      }
    }

    return {
      check: "ping",
      target,
      status: "reachable",
      latency_ms: stats,
      packet_loss_percent: packetLoss,
      raw_output: stdout,
    };
  } catch (error) {
    return {
      check: "ping",
      target,
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function portCheck(
  target: string,
  port: number,
  timeout: number = 5
): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `timeout ${timeout} bash -c 'cat < /dev/null > /dev/tcp/${target}/${port}' 2>&1 && echo "open" || echo "closed"`
    );

    const isOpen = stdout.trim() === "open";

    return {
      check: "port",
      target,
      port,
      status: isOpen ? "open" : "closed",
    };
  } catch (error) {
    return {
      check: "port",
      target,
      port,
      status: "closed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function httpCheck(
  target: string,
  port: number = 80,
  timeout: number = 5
): Promise<any> {
  const url = `http://${target}:${port}`;
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout * 1000),
    });
    const endTime = Date.now();

    return {
      check: "http",
      target,
      port,
      url,
      status: "reachable",
      http_status: response.status,
      http_status_text: response.statusText,
      latency_ms: endTime - startTime,
    };
  } catch (error) {
    return {
      check: "http",
      target,
      port,
      url,
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function dnsCheck(target: string): Promise<any> {
  try {
    const result = await dnsLookup(target);
    
    let reverse = null;
    try {
      const reverseResult = await dnsReverse(result.address);
      reverse = reverseResult[0];
    } catch {
      // Reverse lookup failed, not critical
    }

    return {
      check: "dns",
      target,
      status: "resolved",
      address: result.address,
      family: result.family === 4 ? "IPv4" : "IPv6",
      reverse_dns: reverse,
    };
  } catch (error) {
    return {
      check: "dns",
      target,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fullCheck(target: string, port?: number, timeout: number = 5): Promise<any> {
  const results: any = {
    check: "full",
    target,
    timestamp: new Date().toISOString(),
  };

  // DNS check
  results.dns = await dnsCheck(target);

  // Ping check
  results.ping = await pingCheck(target, timeout);

  // Port check if port specified
  if (port) {
    results.port = await portCheck(target, port, timeout);
    results.http = await httpCheck(target, port, timeout);
  }

  // Overall status
  const allPassed =
    results.dns.status === "resolved" &&
    results.ping.status === "reachable" &&
    (!port || results.port.status === "open");

  results.overall_status = allPassed ? "healthy" : "degraded";

  return results;
}

async function matrixCheck(timeout: number = 5): Promise<any> {
  const services = Object.keys(HOMELAB_SERVICES);
  const results: any[] = [];

  for (const service of services) {
    const { host, port } = HOMELAB_SERVICES[service];
    const check = await fullCheck(host, port, timeout);
    results.push({
      service,
      ...check,
    });
  }

  const healthy = results.filter((r) => r.overall_status === "healthy").length;
  const degraded = results.filter((r) => r.overall_status === "degraded").length;

  return {
    check: "matrix",
    total_services: services.length,
    healthy,
    degraded,
    services: results,
    timestamp: new Date().toISOString(),
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

  const { check, target, port, timeout = "5" } = req.query;

  if (!check || typeof check !== "string") {
    return res.status(400).json({ error: "Check type required" });
  }

  const timeoutNum = parseInt(timeout as string, 10) || 5;
  const portNum = port ? parseInt(port as string, 10) : undefined;

  try {
    let result;

    switch (check) {
      case "ping":
        if (!target || typeof target !== "string") {
          return res.status(400).json({ error: "Target required for ping check" });
        }
        result = await pingCheck(target, timeoutNum);
        break;

      case "port":
        if (!target || typeof target !== "string" || !portNum) {
          return res.status(400).json({ error: "Target and port required for port check" });
        }
        result = await portCheck(target, portNum, timeoutNum);
        break;

      case "http":
        if (!target || typeof target !== "string") {
          return res.status(400).json({ error: "Target required for http check" });
        }
        result = await httpCheck(target, portNum || 80, timeoutNum);
        break;

      case "dns":
        if (!target || typeof target !== "string") {
          return res.status(400).json({ error: "Target required for dns check" });
        }
        result = await dnsCheck(target);
        break;

      case "full":
        if (!target || typeof target !== "string") {
          return res.status(400).json({ error: "Target required for full check" });
        }
        result = await fullCheck(target, portNum, timeoutNum);
        break;

      case "matrix":
        result = await matrixCheck(timeoutNum);
        break;

      default:
        return res.status(400).json({ error: `Unknown check type: ${check}` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in network check API:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
