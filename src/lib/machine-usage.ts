export interface MachineUsageReport {
  id: string;
  machine: string | null;
  worker_name: string;
  started_at: string;
  ended_at: string | null;
}

export interface MachineMatcher {
  id: string;
  display_name: string;
  license_plate: string | null;
  asset_code: string | null;
}

export interface MachineUsageTimelineItem {
  id: string;
  workerName: string;
  startedAt: string;
  endedAt: string | null;
  durationHours: number;
  isActive: boolean;
}

export interface MachineUsageSummary {
  machineId: string;
  matchedReports: MachineUsageReport[];
  activeReport: MachineUsageReport | null;
  totalHours: number;
  totalHours30d: number;
  sessions30d: number;
  uniqueOperators: number;
  lastOperator: string | null;
  lastActivityAt: string | null;
  recentTimeline: MachineUsageTimelineItem[];
}

const normalizeMachineText = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getDurationHours = (startedAt: string, endedAt: string | null, now = new Date()) => {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : now.getTime();
  const diff = (end - start) / 36e5;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
};

export const matchMachineReport = (machine: MachineMatcher, reportMachine: string | null) => {
  const target = normalizeMachineText(reportMachine);
  if (!target) return false;

  const candidates = [machine.display_name, machine.license_plate, machine.asset_code]
    .map((value) => normalizeMachineText(value))
    .filter((value) => value.length >= 3);

  return candidates.some((candidate) => target === candidate || target.includes(candidate) || candidate.includes(target));
};

export const buildMachineUsageSummary = (
  machine: MachineMatcher,
  reports: MachineUsageReport[],
  now = new Date(),
): MachineUsageSummary => {
  const matchedReports = reports
    .filter((report) => matchMachineReport(machine, report.machine))
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const last30dThreshold = now.getTime() - 30 * 24 * 36e5;
  const reports30d = matchedReports.filter((report) => new Date(report.started_at).getTime() >= last30dThreshold);
  const activeReport = matchedReports.find((report) => !report.ended_at) ?? null;
  const recentTimeline = matchedReports.slice(0, 5).map((report) => ({
    id: report.id,
    workerName: report.worker_name,
    startedAt: report.started_at,
    endedAt: report.ended_at,
    durationHours: getDurationHours(report.started_at, report.ended_at, now),
    isActive: !report.ended_at,
  }));

  return {
    machineId: machine.id,
    matchedReports,
    activeReport,
    totalHours: matchedReports.reduce((sum, report) => sum + getDurationHours(report.started_at, report.ended_at, now), 0),
    totalHours30d: reports30d.reduce((sum, report) => sum + getDurationHours(report.started_at, report.ended_at, now), 0),
    sessions30d: reports30d.length,
    uniqueOperators: new Set(matchedReports.map((report) => report.worker_name.trim()).filter(Boolean)).size,
    lastOperator: matchedReports[0]?.worker_name ?? null,
    lastActivityAt: matchedReports[0]?.started_at ?? null,
    recentTimeline,
  };
};

export const formatHoursCompact = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)} h`;