import { MessageSquareMore, Pencil, Plus, Trash2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChannelSummary, ChatChannelItem } from "./chat-types";
import { formatChatTimestamp } from "@/lib/chat-utils";

interface ChatChannelListProps {
  activeChannelId: string;
  channels: ChatChannelItem[];
  summaries: Record<string, ChannelSummary>;
  isAdmin: boolean;
  loading: boolean;
  onSelect: (channelId: string) => void;
  onCreate: () => void;
  onEdit: (channel: ChatChannelItem) => void;
  onDelete: (channel: ChatChannelItem) => void;
  hiddenOnMobile?: boolean;
}

const ChatChannelList = ({ activeChannelId, channels, summaries, isAdmin, loading, onSelect, onCreate, onEdit, onDelete, hiddenOnMobile }: ChatChannelListProps) => {
  return (
    <aside className={cn("panel-surface min-h-[70vh] overflow-hidden p-0", hiddenOnMobile && "hidden md:block")}>
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Conversaciones</p>
            <p className="text-xs text-muted-foreground">Canales, grupos y mensajes directos.</p>
          </div>
          <Button size="icon" variant="surface" className="h-11 w-11 rounded-2xl" onClick={onCreate} aria-label="Nueva conversación">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 p-2">
        {loading ? (
          <div className="space-y-2 px-2 py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="p-3">
            <EmptyState icon={MessageSquareMore} title="Sin chats" description="Crea un canal para empezar a hablar con el equipo." />
          </div>
        ) : (
          channels.map((channel) => {
            const summary = summaries[channel.id];
            const unreadCount = summary?.unreadCount ?? 0;
            const isActive = channel.id === activeChannelId;

            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onSelect(channel.id)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-3 text-left transition-all",
                  isActive ? "border-primary/20 bg-primary/10 shadow-[var(--shadow-soft)]" : "border-transparent bg-card hover:bg-muted/55"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    {channel.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-foreground">{channel.name}</p>
                      <span className="flex-none text-[11px] text-muted-foreground">{formatChatTimestamp(summary?.lastMessageAt ?? null)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {summary?.lastMessage ? `${summary.lastAuthorName ? `${summary.lastAuthorName}: ` : ""}${summary.lastMessage}` : channel.description || "Sin mensajes todavía."}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">{channel.slug}</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 ? <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-semibold text-primary-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background text-muted-foreground" onClick={(event) => { event.stopPropagation(); onEdit(channel); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </span>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background text-muted-foreground" onClick={(event) => { event.stopPropagation(); onDelete(channel); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default ChatChannelList;