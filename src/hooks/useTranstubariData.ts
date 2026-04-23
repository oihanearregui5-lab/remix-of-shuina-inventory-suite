import { useEffect, useState } from "react";
import { loadExcel, type TranstubariData } from "@/lib/transtubari-parser";

const DATA_URL = "/data/transtubari-datos-2026.xlsx";

export const useTranstubariData = () => {
  const [data, setData] = useState<TranstubariData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await loadExcel(DATA_URL);
        if (!mounted) return;
        setData(nextData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el Excel de jornadas");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
};

export default useTranstubariData;