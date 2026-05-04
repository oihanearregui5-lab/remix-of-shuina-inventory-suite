import { Bell, Check, ClipboardList, Fuel, MessageSquare, ReceiptText, Trash2, Truck, CalendarRange, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications, type NotificationKind } from "@/hooks/useNotifications";

interface NotificationsBellProps {
  variant?: "default" | "compact";
  onNavigate?: (link: string) => void;
}

const kindIcon: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  task_assigned: ClipboardList,
  chat_message: MessageSquare,
  vacation_response: CalendarRange,
  machine_incident: Truck,
  work_report: FileText,
  delivery_note: ReceiptText,
  fuel_alert: Fuel,
};

const kindAccent: Record<NotificationKind, string> = {
  task_assigned: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  chat_message: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  vacation_response: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  machine_incident: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  work_report: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  delivery_note: "bg-primary/15 text-primary",
  fuel_alert: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const NotificationsBell = ({ onNavigate }: NotificationsBellProps) => {
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();

  const handleClick = (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) markRead(id);
    if (link && onNavigate) onNavigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notificaciones"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => markAllRead()}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Marcar todas
              </Button>
            ) : null}
            {notifications.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => clearAll()}
                title="Vaciar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Sin notificaciones</p>
              <p className="mt-1 text-xs text-muted-foreground">Te avisaremos cuando haya algo nuevo.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {notifications.map((n) => {
                const Icon = kindIcon[n.kind] ?? Bell;
                const accent = kindAccent[n.kind] ?? "bg-muted text-muted-foreground";
                return (
                  <li key={n.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => handleClick(n.id, n.link, n.is_read)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                        !n.is_read && "bg-primary/5",
                      )}
                    >
                      <span className={cn("mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full", accent)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-snug text-foreground", !n.is_read && "font-semibold")}>
                            {n.title}
                          </p>
                          {!n.is_read ? (
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary" aria-hidden />
                          ) : null}
                        </div>
                        {n.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      className="absolute right-2 top-2 hidden rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:flex group-hover:opacity-100"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
