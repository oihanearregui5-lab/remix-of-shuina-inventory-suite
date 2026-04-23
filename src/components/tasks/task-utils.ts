export type TaskStatus = "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const priorityLabel: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const statusLabel: Record<TaskStatus, string> = {
  planned: "Pendiente",
  in_progress: "En curso",
  blocked: "Bloqueada",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const parseTaskLabels = (value: string | null | undefined) =>
  (value ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

export const serializeTaskLabels = (labels: string[]) => labels.map((label) => label.trim()).filter(Boolean).join(", ");