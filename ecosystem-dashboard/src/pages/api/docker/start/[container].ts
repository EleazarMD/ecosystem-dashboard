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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { container } = req.query;

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
    const { stdout, stderr } = await execAsync(`docker start ${container}`);

    return res.status(200).json({
      success: true,
      container,
      action: "start",
      output: stdout || stderr,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error starting ${container}:`, error);
    return res.status(500).json({
      error: "Failed to start container",
      container,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
