import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

// Managed containers in AI Homelab
const MANAGED_CONTAINERS = [
  "hermes-core",
  "hermes-chromadb",
  "hermes-neo4j",
  "openclaw",
  "openclaw-novnc",
  "openclaw-inference",
  "ai-gateway-postgres",
  "ai-gateway-redis",
  "ai-inferencing",
  "comfyui",
  "nim-embeddings",
  "story-intelligence",
  "story-neo4j",
  "story-pgvector",
];

interface ContainerStatus {
  name: string;
  status: string;
  state: string;
  health?: string;
  uptime?: string;
  cpu?: string;
  memory?: string;
  ports?: string[];
}

async function getContainerStatus(
  containerName: string,
  detail: string = "summary"
): Promise<ContainerStatus | null> {
  try {
    // Get basic status
    const { stdout: statusOut } = await execAsync(
      `docker inspect --format '{{.State.Status}}|{{.State.Health.Status}}|{{.State.StartedAt}}' ${containerName} 2>/dev/null || echo "not_found"`
    );

    if (statusOut.trim() === "not_found") {
      return null;
    }

    const [state, health, startedAt] = statusOut.trim().split("|");

    const status: ContainerStatus = {
      name: containerName,
      status: state === "running" ? "running" : "stopped",
      state,
      health: health !== "<no value>" ? health : undefined,
    };

    // Calculate uptime
    if (startedAt && state === "running") {
      const started = new Date(startedAt);
      const now = new Date();
      const uptimeMs = now.getTime() - started.getTime();
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      status.uptime = `${hours}h ${minutes}m`;
    }

    // Get resource usage if detail is full or metrics
    if (detail === "full" || detail === "metrics") {
      try {
        const { stdout: statsOut } = await execAsync(
          `docker stats ${containerName} --no-stream --format '{{.CPUPerc}}|{{.MemUsage}}' 2>/dev/null || echo ""`
        );

        if (statsOut.trim()) {
          const [cpu, memory] = statsOut.trim().split("|");
          status.cpu = cpu;
          status.memory = memory;
        }
      } catch (error) {
        // Stats not available, skip
      }
    }

    // Get port mappings if detail is full
    if (detail === "full") {
      try {
        const { stdout: portsOut } = await execAsync(
          `docker port ${containerName} 2>/dev/null || echo ""`
        );

        if (portsOut.trim()) {
          status.ports = portsOut
            .trim()
            .split("\n")
            .map((line) => line.trim());
        }
      } catch (error) {
        // Ports not available, skip
      }
    }

    return status;
  } catch (error) {
    console.error(`Error getting status for ${containerName}:`, error);
    return null;
  }
}

async function getAllContainersStatus(
  detail: string = "summary"
): Promise<ContainerStatus[]> {
  const statuses = await Promise.all(
    MANAGED_CONTAINERS.map((container) => getContainerStatus(container, detail))
  );

  return statuses.filter((s): s is ContainerStatus => s !== null);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify internal service key
  const serviceKey = req.headers["x-internal-service-key"];
  if (serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { container, detail = "summary" } = req.query;

    if (container && typeof container === "string" && container !== "all") {
      // Single container status
      if (!MANAGED_CONTAINERS.includes(container)) {
        return res.status(404).json({
          error: `Container '${container}' not found in managed containers`,
          managed: MANAGED_CONTAINERS,
        });
      }

      const status = await getContainerStatus(
        container,
        detail as string
      );

      if (!status) {
        return res.status(404).json({
          error: `Container '${container}' not found or not running`,
        });
      }

      return res.status(200).json(status);
    } else {
      // All containers status
      const statuses = await getAllContainersStatus(detail as string);

      const summary = {
        total: MANAGED_CONTAINERS.length,
        running: statuses.filter((s) => s.status === "running").length,
        stopped: statuses.filter((s) => s.status === "stopped").length,
        healthy: statuses.filter((s) => s.health === "healthy").length,
        unhealthy: statuses.filter((s) => s.health === "unhealthy").length,
        containers: statuses,
      };

      return res.status(200).json(summary);
    }
  } catch (error) {
    console.error("Error in docker status API:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
