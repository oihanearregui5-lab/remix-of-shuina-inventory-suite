import { useMemo } from "react";
import type { Worker as ExcelWorker } from "@/lib/transtubari-parser";
import type { WorkerItem } from "./vacation-types";
import { normalizeKey } from "./journeys-constants";

export interface DisplayWorker {
  id: string;
  name: string;
  initials: string;
  color: string;
  defaultShift?: string;
  appWorkerId: string | null;
}

export const useWorkerLookups = (excelWorkers: ExcelWorker[], appWorkers: WorkerItem[]) => {
  return useMemo(() => {
    const excelById = new Map(excelWorkers.map((worker) => [worker.id, worker]));
    const appByNormalized = new Map<string, WorkerItem>();

    appWorkers.forEach((worker) => {
      [worker.id, worker.name, worker.display_name].forEach((value) => {
        appByNormalized.set(normalizeKey(value), worker);
      });
    });

    const resolveExcelWorker = (workerId: string | null | undefined) =>
      workerId ? excelById.get(workerId) ?? null : null;

    const resolveAppWorker = (workerId: string | null | undefined) =>
      workerId ? appByNormalized.get(normalizeKey(workerId)) ?? null : null;

    const getDisplayWorker = (workerId: string | null | undefined): DisplayWorker | null => {
      const excelWorker = resolveExcelWorker(workerId);
      const appWorker = resolveAppWorker(workerId);

      if (!excelWorker && !appWorker) return null;

      return {
        id: workerId ?? "",
        name: excelWorker?.name ?? appWorker?.display_name ?? appWorker?.name ?? workerId ?? "Sin asignar",
        initials: excelWorker?.initials ?? appWorker?.display_name.slice(0, 2).toUpperCase() ?? "?",
        color: excelWorker?.color ?? appWorker?.color_hex ?? "hsl(var(--muted))",
        defaultShift: excelWorker?.defaultShift ?? appWorker?.shift_default,
        appWorkerId: appWorker?.id ?? null,
      };
    };

    return { resolveExcelWorker, resolveAppWorker, getDisplayWorker };
  }, [appWorkers, excelWorkers]);
};