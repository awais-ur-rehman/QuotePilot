import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { AgentStreamEvent } from "../types";

// Singleton socket — shared across all components
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io("/", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return _socket;
}

export interface UseAgentSocketResult {
  events: AgentStreamEvent[];
  vendorStatuses: Map<string, AgentStreamEvent["type"]>;
  streamingUrls: Map<string, string>;
  connected: boolean;
}

export function useAgentSocket(rfqId: string | null): UseAgentSocketResult {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [vendorStatuses, setVendorStatuses] = useState<Map<string, AgentStreamEvent["type"]>>(
    () => new Map()
  );
  const [streamingUrls, setStreamingUrls] = useState<Map<string, string>>(() => new Map());
  const [connected, setConnected] = useState(false);
  const rfqIdRef = useRef(rfqId);
  rfqIdRef.current = rfqId;

  useEffect(() => {
    if (!rfqId) return;

    const sock = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onAgentEvent = (event: AgentStreamEvent) => {
      if (event.type === "HEARTBEAT") return;

      setEvents((prev) => [...prev, event]);

      if (event.vendorId) {
        setVendorStatuses((prev) => new Map(prev).set(event.vendorId, event.type));
      }

      if (event.type === "STREAMING_URL") {
        const d = event.data as { streamingUrl?: string };
        if (d.streamingUrl && event.vendorId) {
          setStreamingUrls((prev) => new Map(prev).set(event.vendorId, d.streamingUrl!));
        }
      }

      if (event.type === "COMPLETE" || event.type === "ERROR") {
        queryClient.invalidateQueries({ queryKey: ["rfq", rfqId] });
      }
    };

    const onRFQUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["rfq", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("agent:event", onAgentEvent);
    sock.on("rfq:updated", onRFQUpdated);

    if (sock.connected) setConnected(true);
    sock.emit("join:rfq", rfqId);

    return () => {
      sock.emit("leave:rfq", rfqId);
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("agent:event", onAgentEvent);
      sock.off("rfq:updated", onRFQUpdated);
    };
  }, [rfqId, queryClient]);

  return { events, vendorStatuses, streamingUrls, connected };
}
