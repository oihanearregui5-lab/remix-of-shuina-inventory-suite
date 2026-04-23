import { BellRing, Clock3, ClipboardList, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReminderSection, SmartReminder } from "@/hooks/useSmartReminders";

interface SmartRemindersPanelProps {
  reminders: SmartReminder[];
  onNavigate?: (section: ReminderSection) => void;
  compact?: boolean;
}

const toneClasses: Record<SmartReminder["tone"], string> = {
  info: "border-border bg-muted/35",
  warning: "border-primary/20 bg-primary/5",
  danger: "border-destructive/20 bg-destructive/5",
};

const iconBySection: Record<ReminderSection, typeof Clock3> = {
  fichajes: Clock3,
  tasks: ClipboardList,
  workReports: FileWarning,
};

const SmartRemindersPanel = ({ reminders, onNavigate, compact = false }: SmartRemindersPanelProps) => {
  if (reminders.length === 0) return null;

  return (
    <section className="panel-surface space-y-3 p-4 md:p-5">
      <div className="flex items-center gap-2">
        <BellRing className="h-4.5 w-4.5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Recordatorios</h2>
          {!compact ? <p className="text-sm text-muted-foreground">Avisos automáticos para que no se queden cosas abiertas o paradas.</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        {reminders.map((reminder) => {
          const Icon = iconBySection[reminder.section];

          return (
            <article key={reminder.id} className={`rounded-xl border p-4 ${toneClasses[reminder.tone]}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-background p-2 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{reminder.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{reminder.description}</p>
                  </div>
                </div>

                {onNavigate ? (
                  <Button variant="outline" size="sm" className="min-w-[140px] self-start" onClick={() => onNavigate(reminder.section)}>
                    {reminder.cta}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SmartRemindersPanel;