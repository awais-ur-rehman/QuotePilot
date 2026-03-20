import { useEffect, useRef, useState } from "react";
import type { AgentStreamEvent } from "../types";

export interface UseSSEResult {
  events: AgentStreamEvent[];
  vendorStatuses: Map<string, AgentStreamEvent["type"]>;
  connected: boolean;
}

export function useSSE(rfqId: string | null): UseSSEResult {
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [vendorStatuses, setVendorStatuses] = useState<Map<string, AgentStreamEvent["type"]>>(
    () => new Map()
  );
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!rfqId) return;

    const source = new EventSource(`/api/agent/stream/${rfqId}`);
    sourceRef.current = source;

    source.onopen = () => setConnected(true);

    source.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as AgentStreamEvent;

        if (event.type === "HEARTBEAT") return;

        setEvents((prev) => [...prev, event]);

        if (event.vendorId && (event.type === "COMPLETE" || event.type === "ERROR")) {
          setVendorStatuses((prev) => new Map(prev).set(event.vendorId, event.type));
        }
        if (event.vendorId && event.type === "STARTED") {
          setVendorStatuses((prev) => new Map(prev).set(event.vendorId, "STARTED"));
        }
        if (event.vendorId && event.type === "PROGRESS") {
          setVendorStatuses((prev) => new Map(prev).set(event.vendorId, "PROGRESS"));
        }
      } catch {
        // ignore malformed
      }
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [rfqId]);

  return { events, vendorStatuses, connected };
}
