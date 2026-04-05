import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

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
  const { lines = "100", filter } = req.query;

  if (!container || typeof container !== "string") {
    return res.status(400).json({ error: "Container name required" });
  }

  if (!MANAGED_CONTAINERS.includes(container)) {
    return res.status(404).json({
      error: `Container '${container}' not found in managed containers`,
      managed: MANAGED_CONTAINERS,
    });
  }

  try {
    const numLines = parseInt(lines as string, 10) || 100;
    const maxLines = Math.min(numLines, 1000); // Cap at 1000 lines

    let command = `docker logs ${container} --tail ${maxLines} 2>&1`;

    if (filter && typeof filter === "string") {
      const escapedFilter = filter.replace(/'/g, "'\\''");
      command += ` | grep -i '${escapedFilter}'`;
    }

    const { stdout, stderr } = await execAsync(command);

    const logs = stdout || stderr || "No logs available";

    return res.status(200).json({
      container,
      lines: maxLines,
      filter: filter || null,
      logs,
    });
  } catch (error) {
    console.error(`Error fetching logs for ${container}:`, error);
    
    if (error instanceof Error && 'code' in error && error.code === 1) {
      // Container not found or not running
      return res.status(404).json({
        error: `Container '${container}' not found or not running`,
      });
    }

    return res.status(500).json({
      error: "Failed to fetch logs",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
