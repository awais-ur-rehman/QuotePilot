import { useQuery, useQueryClient } from "@tanstack/react-query";
import { rfqApi } from "../services/api";
import type { RFQ } from "../types";

export function useRFQList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfqs"],
    queryFn: async () => {
      const res = await rfqApi.list();
      return (res.data as RFQ[]) ?? [];
    },
    refetchInterval: (query) => {
      const rfqs = query.state.data ?? [];
      return rfqs.some((r) => r.status === "running") ? 5000 : false;
    },
  });

  return {
    rfqs: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
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
