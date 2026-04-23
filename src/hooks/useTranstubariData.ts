import { useQuery } from "@tanstack/react-query";
import { loadExcel, type TranstubariData } from "@/lib/transtubari-parser";

const DATA_URL = "/data/transtubari-datos-2026.xlsx";

export const useTranstubariData = () => {
  const query = useQuery<TranstubariData>({
    queryKey: ["transtubari-data", DATA_URL],
    queryFn: () => loadExcel(DATA_URL),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
};

export default useTranstubariData;