#!/usr/bin/env ts-node
/**
 * Pi Code Agent CLI — external runtime entry point for the child agent loop.
 *
 * Reads a single JSON AgentTransportRequest from stdin, runs the PiCode
 * cognitive loop, and emits newline-delimited JSON AgentEvents to stdout.
 *
 * Usage:
 *   echo '{"messages": [...], "intent": "talk", "context": {...}}' | \
 *     npx ts-node src/scripts/picode-agent-cli.ts
 *
 * This lets the agent loop run out-of-process while keeping the same
 * AgentTransport contract and tool implementations.
 */

import { getPiCodeTransport } from '../domains/learning/shared/transports/picode-transport';
import type { AgentTransportRequest } from '../domains/learning/shared/agent-transport';

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString('utf-8').trim();
  if (!input) {
    console.error('[picode-cli] No request on stdin');
    process.exit(1);
  }

  let req: AgentTransportRequest;
  try {
    req = JSON.parse(input) as AgentTransportRequest;
  } catch (error) {
    console.error('[picode-cli] Invalid JSON request:', error);
    process.exit(1);
  }

  const transport = getPiCodeTransport();
  try {
    for await (const event of transport.stream(req)) {
      process.stdout.write(JSON.stringify(event) + '\n');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    process.stdout.write(JSON.stringify({ type: 'error', error: errorMsg }) + '\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[picode-cli] Unhandled error:', error);
  process.exit(1);
});
