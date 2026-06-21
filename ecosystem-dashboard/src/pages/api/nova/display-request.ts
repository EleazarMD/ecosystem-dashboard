/**
 * /api/nova/display-request
 *
 * POST — create a nova_conversation_display approval on the STANDALONE approval
 *        service (port 8407) — the single source of truth the iPhone reads and
 *        approves from. Previously this wrote to the dashboard's own Postgres
 *        (split-brain: the iPhone polls 8407 and never saw the request, so the
 *        privacy lock never unlocked and the Tesla screen stayed dark).
 * GET  — poll status of an existing approval by ?id=<approvalId> via 8407.
 */
import type { NextApiRequest, NextApiResponse } from "next";

const APPROVAL_SERVICE_URL =
  process.env.APPROVAL_SERVICE_URL || "http://localhost:8407";
const APPROVAL_API_KEY =
  process.env.APPROVAL_SERVICE_API_KEY ||
  process.env.NOVA_MIRROR_API_KEY ||
  "ai-gateway-api-key-2024";
const CANONICAL_USER_ID =
  process.env.ADMIN_USER_ID || "dfd9379f-a9cd-4241-99e7-140f5e89e3cd";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: poll an existing approval via 8407
  if (req.method === "GET") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing ?id param" });
    }
    try {
      const r = await fetch(
        `${APPROVAL_SERVICE_URL}/api/approvals/${encodeURIComponent(id)}`,
        { headers: { "X-API-Key": APPROVAL_API_KEY, "X-User-ID": CANONICAL_USER_ID } }
      );
      if (r.status === 404) return res.status(404).json({ error: "Not found" });
      if (!r.ok)
        return res.status(502).json({ error: "Approval service error", status: r.status });
      const data = await r.json();
      return res.status(200).json({ approval: data.approval ?? data });
    } catch (error) {
      console.error("[Nova/display-request] poll error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST: create a new approval request on 8407
  if (req.method === "POST") {
    try {
      const { user_id, vehicle } = req.body ?? {};
      const userId = user_id || CANONICAL_USER_ID;
      const r = await fetch(`${APPROVAL_SERVICE_URL}/api/approvals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": APPROVAL_API_KEY,
          "X-User-ID": userId,
        },
        body: JSON.stringify({
          action_type: "nova_conversation_display",
          user_id: userId,
          agent: { id: "nova", name: "Nova", type: "voice_agent" },
          title: "Vehicle Screen — Display Nova Conversation",
          ai_reasoning:
            "A display device in the vehicle is requesting access to view the active Nova conversation. Approve only if you are the driver and no one else should see this session.",
          ai_confidence: 1.0,
          context: "tesla_dashboard",
          payload: { user_id: userId, vehicle: vehicle ?? "Tesla", source: "tesla_dashboard" },
        }),
      });
      if (!r.ok) {
        console.error("[Nova/display-request] create failed:", r.status);
        return res.status(502).json({ error: "Approval service error", status: r.status });
      }
      const data = await r.json();
      const approval = data.approval ?? data;
      if (approval?.status === "executed" || approval?.status === "approved") {
        return res.status(201).json({ approval, auto_approved: true });
      }
      return res.status(202).json({ approval, message: "Awaiting approval on iPhone" });
    } catch (error) {
      console.error("[Nova/display-request] create error:", error);
      return res
        .status(500)
        .json({ error: "Internal server error", message: (error as Error).message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
