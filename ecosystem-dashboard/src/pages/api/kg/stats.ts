import type { NextApiRequest, NextApiResponse } from "next";

const PCG_BASE_URL = process.env.PCG_URL || "http://localhost:8765";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const resp = await fetch(`${PCG_BASE_URL}/api/kg/stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `PCG ${resp.status}` });
    }
    const data = await resp.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "PCG unreachable", details: error instanceof Error ? error.message : String(error) });
  }
}
