import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, CircleDashed, Pencil, Trash2, UserRound } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseTaskLabels, priorityLabel, statusLabel, type TaskPriority, type TaskStatus } from "./task-utils";

export interface TaskListItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  start_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  scope?: "personal" | "general";
}

interface TaskListSectionProps {
  title: string;
  subtitle: string;
  tasks: TaskListItem[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  onOpenTask: (task: TaskListItem) => void;
  onEditTask: (task: TaskListItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: TaskListItem) => void;
}

const TaskListSection = ({ title, subtitle, tasks, loading, error, isAdmin, onOpenTask, onEditTask, onDeleteTask, onToggleComplete }: TaskListSectionProps) => {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm text-destructive">{error}</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={CircleDashed} title="Sin tareas" description="Cuando haya trabajo asignado aparecerá aquí de forma clara." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const labels = parseTaskLabels(task.category);
            return (
              <article key={task.id} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <button type="button" onClick={() => onOpenTask(task)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", task.status === "completed" ? "bg-success/15 text-foreground" : "bg-primary/10 text-primary")}>{statusLabel[task.status]}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{priorityLabel[task.priority]}</span>
                        {task.scope === "general" ? <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">🟡 General</span> : null}
                        {task.due_date ? <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{format(new Date(task.due_date), "d MMM", { locale: es })}</span> : null}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{task.title}</p>
                        {task.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{task.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {labels.map((label) => <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">#{label}</span>)}
                      </div>
                      {task.assigned_staff_name ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" /> {task.assigned_staff_name}
                        </div>
                      ) : null}
                    </div>
                    {task.status === "completed" ? <CheckCircle2 className="mt-1 h-5 w-5 flex-none text-success" /> : <CircleDashed className="mt-1 h-5 w-5 flex-none text-primary" />}
                  </div>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="h-10 rounded-2xl" onClick={() => onToggleComplete(task)}>
                    {task.status === "completed" ? "Reabrir" : "Completar"}
                  </Button>
                  <Button size="sm" variant="surface" className="h-10 rounded-2xl" onClick={() => onEditTask(task)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  {(isAdmin || task.status !== "completed") ? (
                    <Button size="sm" variant="outline" className="h-10 rounded-2xl" onClick={() => onDeleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TaskListSection;