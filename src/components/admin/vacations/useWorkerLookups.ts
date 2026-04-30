import { useMemo } from "react";
import type { Worker as ExcelWorker } from "@/lib/transtubari-parser";
import type { WorkerItem } from "./vacation-types";
import { normalizeKey } from "./journeys-constants";

interface StaffMemberItem {
  id: string;
  full_name: string;
  color_tag: string | null;
}

const colorTagToHex = (colorTag: string | null | undefined) => {
  const palette: Record<string, string> = {
    red: "#ef4444",
    indigo: "#6366f1",
    teal: "#14b8a6",
    slate: "#64748b",
    amber: "#f59e0b",
    blue: "#3b82f6",
    emerald: "#10b981",
    orange: "#f97316",
    violet: "#8b5cf6",
    cyan: "#06b6d4",
    rose: "#f43f5e",
    lime: "#84cc16",
    yellow: "#eab308",
  };

  return colorTag ? palette[colorTag] ?? "hsl(var(--muted))" : "hsl(var(--muted))";
};

export interface DisplayWorker {
  id: string;
  assignmentId: string | null;
  name: string;
  initials: string;
  color: string;
  defaultShift?: string;
  appWorkerId: string | null;
}

export const useWorkerLookups = (excelWorkers: ExcelWorker[], appWorkers: WorkerItem[], staffMembers: StaffMemberItem[] = []) => {
  return useMemo(() => {
    const excelById = new Map(excelWorkers.map((worker) => [worker.id, worker]));
    const appByNormalized = new Map<string, WorkerItem>();
    const staffById = new Map(staffMembers.map((staff) => [staff.id, staff]));
    const staffByNormalized = new Map<string, StaffMemberItem>();

    appWorkers.forEach((worker) => {
      [worker.id, worker.name, worker.display_name].forEach((value) => {
        appByNormalized.set(normalizeKey(value), worker);
      });
    });

    staffMembers.forEach((staff) => {
      [staff.id, staff.full_name].forEach((value) => {
        staffByNormalized.set(normalizeKey(value), staff);
      });
    });

    const resolveExcelWorker = (workerId: string | null | undefined) =>
      workerId ? excelById.get(workerId) ?? null : null;

    const resolveAppWorker = (workerId: string | null | undefined) =>
      workerId ? appByNormalized.get(normalizeKey(workerId)) ?? null : null;

    const resolveStaffMember = (workerId: string | null | undefined) =>
      workerId ? staffById.get(workerId) ?? staffByNormalized.get(normalizeKey(workerId)) ?? null : null;

    const getDisplayWorker = (workerId: string | null | undefined): DisplayWorker | null => {
      const excelWorker = resolveExcelWorker(workerId);
      const staffMember = resolveStaffMember(workerId);
      const appWorker = resolveAppWorker(workerId) ?? resolveAppWorker(staffMember?.full_name) ?? null;

      if (!excelWorker && !appWorker && !staffMember) return null;

      const displayName = excelWorker?.name ?? appWorker?.display_name ?? appWorker?.name ?? staffMember?.full_name ?? workerId ?? "Sin asignar";
      const initialsSource = excelWorker?.initials ?? appWorker?.display_name ?? appWorker?.name ?? staffMember?.full_name ?? "?";

      return {
        id: appWorker?.id ?? excelWorker?.id ?? staffMember?.id ?? workerId ?? "",
        assignmentId: staffMember?.id ?? null,
        name: displayName,
        initials: initialsSource.slice(0, 2).toUpperCase(),
        color: excelWorker?.color ?? appWorker?.color_hex ?? colorTagToHex(staffMember?.color_tag),
        defaultShift: excelWorker?.defaultShift ?? appWorker?.shift_default,
        appWorkerId: appWorker?.id ?? null,
      };
    };

    return { resolveExcelWorker, resolveAppWorker, resolveStaffMember, getDisplayWorker };
  }, [appWorkers, excelWorkers, staffMembers]);
};