import type { TinyFishEvent } from "../types";

/**
 * Parse a raw SSE chunk into individual TinyFish events.
 * Normalizes snake_case API field names to camelCase (run_id → runId, etc.)
 */
export function parseSSEChunk(chunk: string): TinyFishEvent[] {
  const events: TinyFishEvent[] = [];
  const lines = chunk.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) continue;

    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;

      // Normalize snake_case → camelCase for TinyFish API field name variants
      // Actual API sends: run_id, streaming_url, result (not result_json)
      const normalized: Record<string, unknown> = { ...raw };
      if ("run_id" in raw) normalized.runId = raw.run_id;
      if ("streaming_url" in raw) normalized.streamingUrl = raw.streaming_url;
      if ("result" in raw) normalized.resultJson = raw.result;        // actual field name
      if ("result_json" in raw) normalized.resultJson = raw.result_json; // fallback

      events.push(normalized as TinyFishEvent);
    } catch {
      // Ignore malformed lines
    }
  }

  return events;
}
