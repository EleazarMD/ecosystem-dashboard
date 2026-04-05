import type { NextApiRequest, NextApiResponse } from "next";

const TRAINING_HUB_URL = "http://localhost:8766";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  // path comes as ["api", "status"] or ["api", "jobs"] etc
  const apiPath = Array.isArray(path) ? path.join("/") : path || "";
  const targetUrl = `${TRAINING_HUB_URL}/${apiPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(503).json({ 
      error: "Training hub unavailable", 
      details: String(error),
      targetUrl 
    });
  }
}
