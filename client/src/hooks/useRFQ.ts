import { useCallback, useEffect, useRef, useState } from "react";
import { rfqApi } from "../services/api";
import type { RFQ } from "../types";

export function useRFQList() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rfqApi.list();
      setRfqs((res.data as RFQ[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { rfqs, loading, error, refetch: fetch };
}

export function useRFQ(id: string | null) {
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await rfqApi.get(id);
      setRfq(res.data as RFQ);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Poll every 3s while running
  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (rfq?.status === "running") {
      pollRef.current = setInterval(fetch, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [rfq?.status, fetch]);

  return { rfq, loading, error, refetch: fetch };
}
