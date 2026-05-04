import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, CheckCircle2, CircleDashed, Lock, Pencil, Trash2, User2, Users2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseTaskLabels, priorityLabel, statusLabel, type TaskPriority, type TaskStatus } from "./task-utils";
import type { AssignmentMode } from "./TaskComposerDialog";

export interface TaskAssigneeBrief {
  staff_id: string;
  full_name: string;
  is_admin: boolean;
  completed_at: string | null;
}

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
  assignment_mode: AssignmentMode;
  is_private: boolean;
  assignees: TaskAssigneeBrief[];
  current_user_assignee_completed?: boolean;
  current_user_is_assignee?: boolean;
}

interface TaskListSectionProps {
  title: string;
  subtitle: string;
  tasks: TaskListItem[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask: (task: TaskListItem) => void;
  onEditTask: (task: TaskListItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: TaskListItem) => void;
}

const ModeBadge = ({ mode }: { mode: AssignmentMode }) => {
  if (mode === "all") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
        <Building2 className="h-3 w-3" /> Toda la plantilla
      </span>
    );
  }
  if (mode === "group") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        <Users2 className="h-3 w-3" /> Grupo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <User2 className="h-3 w-3" /> Individual
    </span>
  );
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const TaskListSection = ({
  title,
  subtitle,
  tasks,
  loading,
  error,
  isAdmin,
  emptyTitle = "Sin tareas",
  emptyDescription = "Cuando haya trabajo asignado aparecerá aquí de forma clara.",
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
}: TaskListSectionProps) => {
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
        <EmptyState icon={CircleDashed} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const labels = parseTaskLabels(task.category);
            const visibleAssignees = task.assignees.slice(0, 4);
            const remaining = Math.max(0, task.assignees.length - visibleAssignees.length);
            const isAllMode = task.assignment_mode === "all";
            const showCompleted = isAllMode
              ? Boolean(task.current_user_assignee_completed)
              : task.status === "completed";
            return (
              <article key={task.id} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <button type="button" onClick={() => onOpenTask(task)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            showCompleted ? "bg-success/15 text-foreground" : "bg-primary/10 text-primary",
                          )}
                        >
                          {showCompleted ? "Completada" : statusLabel[task.status]}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {priorityLabel[task.priority]}
                        </span>
                        {task.due_date ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            {format(new Date(task.due_date), "d MMM", { locale: es })}
                          </span>
                        ) : null}
                        <ModeBadge mode={task.assignment_mode} />
                        {task.is_private ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            <Lock className="h-3 w-3" /> Privada
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{task.title}</p>
                        {task.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{task.description}</p>
                        ) : null}
                      </div>
                      {labels.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {labels.map((label) => (
                            <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                              #{label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {!isAllMode && task.assignees.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {visibleAssignees.map((assignee) => (
                              <span
                                key={assignee.staff_id}
                                title={assignee.full_name}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold",
                                  assignee.is_admin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                                )}
                              >
                                {initials(assignee.full_name)}
                              </span>
                            ))}
                            {remaining > 0 ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-foreground">
                                +{remaining}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {task.assignees.map((assignee) => assignee.full_name.split(" ")[0]).join(", ")}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {showCompleted ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 flex-none text-success" />
                    ) : (
                      <CircleDashed className="mt-1 h-5 w-5 flex-none text-primary" />
                    )}
                  </div>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* En modo 'all': cada asignado marca su parte. En el resto: estado global. */}
                  {(isAllMode ? task.current_user_is_assignee : true) ? (
                    <Button size="sm" className="h-10 rounded-2xl" onClick={() => onToggleComplete(task)}>
                      {showCompleted ? "Reabrir" : "Completar"}
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <>
                      <Button size="sm" variant="surface" className="h-10 rounded-2xl" onClick={() => onEditTask(task)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-10 rounded-2xl" onClick={() => onDeleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    </>
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
