import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { rfqApi } from "../services/api";
import type { RFQ, ApiResponse } from "../types";

export function useRFQList() {
  const [limit, setLimit] = useState(20);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfqs", limit],
    queryFn: async () => {
      const res = await rfqApi.list(1, limit);
      return {
        rfqs: (res.data as RFQ[]) ?? [],
        total: (res as ApiResponse<RFQ[]>).pagination?.total ?? 0,
      };
    },
    refetchInterval: (query) => {
      const rfqs = query.state.data?.rfqs ?? [];
      return rfqs.some((r) => r.status === "running") ? 5000 : false;
    },
  });

  const loadMore = () => setLimit((l) => l + 20);
  const hasMore = (data?.total ?? 0) > (data?.rfqs.length ?? 0);

  return {
    rfqs: data?.rfqs ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    loadMore,
    hasMore,
  };
}

export function useRFQ(id: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rfq", id],
    queryFn: async () => {
      const res = await rfqApi.get(id!);
      return res.data as RFQ;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      return query.state.data?.status === "running" ? 8000 : false;
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["rfq", id] });
  };

  return {
    rfq: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
