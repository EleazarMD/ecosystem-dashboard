import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";
const HERMES_CORE_URL = process.env.HERMES_CORE_URL || "http://localhost:8780";

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

interface HealthStatus {
  container: string;
  docker_status: string;
  docker_health?: string;
  application_health?: {
    status: string;
    details?: any;
  };
}

async function getDockerHealth(containerName: string): Promise<HealthStatus> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format '{{.State.Status}}|{{.State.Health.Status}}' ${containerName} 2>/dev/null || echo "not_found"`
    );

    if (stdout.trim() === "not_found") {
      return {
        container: containerName,
        docker_status: "not_found",
      };
    }

    const [status, health] = stdout.trim().split("|");

    return {
      container: containerName,
      docker_status: status,
      docker_health: health !== "<no value>" ? health : undefined,
    };
  } catch (error) {
    return {
      container: containerName,
      docker_status: "error",
    };
  }
}

async function probeHermesHealth(): Promise<any> {
  try {
    const response = await fetch(`${HERMES_CORE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { status: "unhealthy", http_status: response.status };
    }

    const data = await response.json();
    return { status: "healthy", ...data };
  } catch (error) {
    return {
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getApplicationHealth(
  containerName: string
): Promise<any | null> {
  // Application-level health probes for specific services
  switch (containerName) {
    case "hermes-core":
      return await probeHermesHealth();

    // Add more application probes here as needed
    // case "ai-gateway":
    //   return await probeAIGatewayHealth();

    default:
      return null;
  }
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

  const { container } = req.query;

  if (!container || typeof container !== "string") {
    return res.status(400).json({ error: "Container name required" });
  }

  if (container === "all") {
    // Get health for all containers
    try {
      const healthChecks = await Promise.all(
        MANAGED_CONTAINERS.map(async (c) => {
          const dockerHealth = await getDockerHealth(c);
          const appHealth = await getApplicationHealth(c);

          return {
            ...dockerHealth,
            ...(appHealth && { application_health: appHealth }),
          };
        })
      );

      const summary = {
        total: MANAGED_CONTAINERS.length,
        healthy: healthChecks.filter(
          (h) =>
            h.docker_status === "running" &&
            (!h.docker_health || h.docker_health === "healthy") &&
            (!h.application_health || h.application_health.status === "healthy")
        ).length,
        unhealthy: healthChecks.filter(
          (h) =>
            h.docker_health === "unhealthy" ||
            h.application_health?.status === "unhealthy"
        ).length,
        stopped: healthChecks.filter((h) => h.docker_status !== "running")
          .length,
        containers: healthChecks,
      };

      return res.status(200).json(summary);
    } catch (error) {
      console.error("Error checking health for all containers:", error);
      return res.status(500).json({
        error: "Failed to check health",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!MANAGED_CONTAINERS.includes(container)) {
    return res.status(404).json({
      error: `Container '${container}' not found in managed containers`,
      managed: MANAGED_CONTAINERS,
    });
  }

  try {
    const dockerHealth = await getDockerHealth(container);
    const appHealth = await getApplicationHealth(container);

    const health: HealthStatus = {
      ...dockerHealth,
      ...(appHealth && { application_health: appHealth }),
    };

    return res.status(200).json(health);
  } catch (error) {
    console.error(`Error checking health for ${container}:`, error);
    return res.status(500).json({
      error: "Failed to check health",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
