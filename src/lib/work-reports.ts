export interface WorkReportMetricsItem {
  id: string;
  worker_name: string;
  action: string | null;
  description: string;
  machine: string | null;
  observations: string | null;
  started_at: string;
  ended_at: string | null;
}

export const EXPECTED_DAILY_HOURS = 8;

export const getWorkReportDurationHours = (report: Pick<WorkReportMetricsItem, "started_at" | "ended_at">, now = new Date()) => {
  const startedAt = new Date(report.started_at).getTime();
  const endedAt = report.ended_at ? new Date(report.ended_at).getTime() : now.getTime();
  const diff = (endedAt - startedAt) / 36e5;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
};

export const formatWorkHours = (hours: number) => `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;

export const getDurationState = (hours: number) => {
  if (hours >= EXPECTED_DAILY_HOURS + 1) return "high" as const;
  if (hours < 1) return "short" as const;
  return "normal" as const;
};

export const buildWorkReportsCsv = (reports: WorkReportMetricsItem[]) => {
  const escapeCsv = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Trabajador", "Acción", "Descripción", "Máquina", "Inicio", "Fin", "Horas", "Observaciones"],
    ...reports.map((report) => [
      report.worker_name,
      report.action ?? "",
      report.description,
      report.machine ?? "",
      report.started_at,
      report.ended_at ?? "",
      getWorkReportDurationHours(report).toFixed(2),
      report.observations ?? "",
    ]),
  ];

  return rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
};