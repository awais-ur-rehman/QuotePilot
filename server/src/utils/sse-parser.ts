import type { TinyFishEvent } from "../types";

/**
 * Parse a raw SSE chunk into individual events.
 * TinyFish sends lines like: `data: { "type": "PROGRESS", ... }`
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
      const event = JSON.parse(jsonStr) as TinyFishEvent;
      events.push(event);
    } catch {
      // Ignore malformed lines
    }
  }

  return events;
}
