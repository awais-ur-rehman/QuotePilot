import { env } from "../config/env";
import { parseSSEChunk } from "../utils/sse-parser";
import { TinyFishError } from "../utils/errors";
import { logger } from "../utils/logger";
import type { TinyFishEvent, TinyFishRequest, TinyFishRunResponse } from "../types";

const BASE_URL = "https://agent.tinyfish.ai/v1";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max

function getHeaders(): Record<string, string> {
  return {
    "X-API-Key": env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  };
}

/**
 * runSSE — fires /automation/run-sse and yields typed events as they arrive.
 * Use this for user-facing real-time progress.
 */
export async function* runSSE(
  request: TinyFishRequest
): AsyncGenerator<TinyFishEvent> {
  const response = await fetch(`${BASE_URL}/automation/run-sse`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new TinyFishError(`TinyFish SSE request failed: ${response.status} ${text}`);
  }

  if (!response.body) {
    throw new TinyFishError("TinyFish SSE response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const events = parseSSEChunk(text);

      for (const event of events) {
        logger.debug("TinyFish SSE event", { type: event.type });
        yield event;

        // Stop reading after COMPLETE
        if (event.type === "COMPLETE") {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * runSync — fires /automation/run (blocking) for simple tasks.
 * Returns the final result JSON directly.
 */
export async function runSync(request: TinyFishRequest): Promise<TinyFishRunResponse> {
  const response = await fetch(`${BASE_URL}/automation/run`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new TinyFishError(`TinyFish sync request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<TinyFishRunResponse>;
}

/**
 * runAsync — fires /automation/run-async and returns the run_id immediately.
 * Use pollRun() to check completion.
 */
export async function runAsync(request: TinyFishRequest): Promise<string> {
  const response = await fetch(`${BASE_URL}/automation/run-async`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new TinyFishError(`TinyFish async request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { run_id: string };
  return data.run_id;
}

/**
 * pollRun — polls GET /runs/:runId until COMPLETED or FAILED.
 */
export async function pollRun(runId: string): Promise<TinyFishRunResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${BASE_URL}/runs/${runId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new TinyFishError(`TinyFish poll failed: ${response.status} ${text}`, runId);
    }

    const run = (await response.json()) as TinyFishRunResponse;

    if (run.status === "COMPLETED") return run;
    if (run.status === "FAILED") {
      throw new TinyFishError(
        run.error?.message ?? "TinyFish run failed",
        runId
      );
    }

    logger.debug(`Polling run ${runId}: status=${run.status} attempt=${attempt + 1}`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new TinyFishError(`TinyFish run ${runId} timed out after ${MAX_POLL_ATTEMPTS} polls`, runId);
}

/**
 * cancelRun — cancels a running agent.
 */
export async function cancelRun(runId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/runs/${runId}/cancel`, {
    method: "POST",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new TinyFishError(`TinyFish cancel failed: ${response.status} ${text}`, runId);
  }

  logger.info(`Cancelled TinyFish run ${runId}`);
}

/**
 * runMultiple — dispatches multiple SSE runs concurrently.
 * Uses Promise.allSettled so one failure doesn't block others.
 * Returns an array of { status, events | reason } for each request.
 */
export async function runMultiple(
  requests: Array<TinyFishRequest & { id: string }>
): Promise<Array<{ id: string; status: "fulfilled" | "rejected"; events?: TinyFishEvent[]; error?: string }>> {
  const tasks = requests.map(async ({ id, ...req }) => {
    const events: TinyFishEvent[] = [];
    for await (const event of runSSE(req)) {
      events.push(event);
    }
    return { id, events };
  });

  const results = await Promise.allSettled(tasks);

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return { id: result.value.id, status: "fulfilled" as const, events: result.value.events };
    }
    return {
      id: requests[i].id,
      status: "rejected" as const,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}
