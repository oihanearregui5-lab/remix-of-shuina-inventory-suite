import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Pencil, SendHorizonal, Trash2, X } from "lucide-react";
import { useMemo, useRef, type RefObject } from "react";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatChannelItem, ChatMessageItem } from "./chat-types";
import { CHAT_MESSAGE_MAX_LENGTH, formatChatDayLabel } from "@/lib/chat-utils";

interface ChatConversationProps {
  channel: ChatChannelItem | null;
  currentUserId?: string;
  currentUserName?: string | null;
  isAdmin: boolean;
  messages: ChatMessageItem[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  draft: string;
  editingMessageId: string | null;
  authorNames: Record<string, string>;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStartEdit: (message: ChatMessageItem) => void;
  onCancelEdit: () => void;
  onDeleteMessage: (messageId: string) => void;
  listRef: RefObject<HTMLDivElement>;
}

const ChatConversation = ({ channel, currentUserId, currentUserName, isAdmin, messages, loading, sending, error, draft, editingMessageId, authorNames, pendingFile, onPendingFileChange, onBack, onDraftChange, onSend, onStartEdit, onCancelEdit, onDeleteMessage, listRef }: ChatConversationProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const title = useMemo(() => {
    if (!channel) return "Selecciona una conversación";
    const name = channel.displayName || channel.name;
    if (channel.kind === "direct") return name;
    if (channel.kind === "group") return name;
    return `# ${name}`;
  }, [channel]);
  const groupedMessages = useMemo(() => {
    const groups: Array<{ day: string; items: ChatMessageItem[] }> = [];
    messages.forEach((message) => {
      const dayKey = new Date(message.created_at).toDateString();
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.day !== dayKey) {
        groups.push({ day: dayKey, items: [message] });
        return;
      }
      lastGroup.items.push(message);
    });
    return groups;
  }, [messages]);

  const pendingPreview = useMemo(() => (pendingFile ? URL.createObjectURL(pendingFile) : null), [pendingFile]);

  const canSend = !!channel && !sending && (!!draft.trim() || !!pendingFile);

  return (
    <section className="panel-surface flex min-h-[70vh] flex-col overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl md:hidden" onClick={onBack} aria-label="Volver a chats">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{channel?.description || "Conversación del equipo en tiempo real."}</p>
          </div>
        </div>
      </div>

      <div ref={listRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-muted/25 px-3 py-4 md:px-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
              <div className="h-20 w-[78%] animate-pulse rounded-[24px] bg-muted" />
            </div>
          ))
        ) : !channel ? (
          <EmptyState icon={ArrowLeft} title="Abre un chat" description="Toca un canal para ver mensajes y responder al instante." />
        ) : messages.length === 0 ? (
          <EmptyState icon={SendHorizonal} title="Todavía no hay mensajes" description="Envía el primero para iniciar la conversación." />
        ) : (
          groupedMessages.map((group) => (
            <div key={group.day} className="space-y-3">
              <div className="flex justify-center">
                <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">{formatChatDayLabel(group.items[0].created_at)}</span>
              </div>
              {group.items.map((message) => {
                const own = message.author_user_id === currentUserId;
                const edited = message.updated_at !== message.created_at;
                const authorName = own ? currentUserName || "Tú" : authorNames[message.author_user_id] || "Equipo";
                const attachments = message.attachments ?? [];

                return (
                  <article key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[86%] rounded-[24px] px-4 py-3 shadow-[var(--shadow-soft)]", own ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border/80 bg-card text-foreground")}>
                      <div className="flex items-center justify-between gap-4 text-[11px] opacity-80">
                        <span className="truncate font-medium">{authorName}</span>
                        <span>{format(new Date(message.created_at), "HH:mm", { locale: es })}</span>
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.signed_url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-xl border border-white/20 bg-black/10"
                            >
                              {att.signed_url ? (
                                <img src={att.signed_url} alt="Adjunto" className="h-32 w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-32 w-full items-center justify-center text-xs">Imagen</div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                      {message.message && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] opacity-80">
                        <span>{edited ? "Editado" : "Enviado"}</span>
                        {(own || isAdmin) ? (
                          <div className="flex items-center gap-1">
                            {own && attachments.length === 0 ? (
                              <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full px-2 font-medium" onClick={() => onStartEdit(message)}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                            ) : null}
                            <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full px-2 font-medium" onClick={() => onDeleteMessage(message.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Borrar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border bg-background px-3 py-3 md:px-4">
        {error ? <p className="mb-2 text-xs font-medium text-destructive">{error}</p> : null}
        {editingMessageId ? (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span>Editando mensaje</span>
            <button type="button" className="font-medium text-foreground" onClick={onCancelEdit}>Cancelar</button>
          </div>
        ) : null}
        {pendingFile && pendingPreview ? (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-2">
            <img src={pendingPreview} alt="Adjunto" className="h-14 w-14 flex-none rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{pendingFile.name}</p>
              <p className="text-[11px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onPendingFileChange(null)} aria-label="Quitar adjunto">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPendingFileChange(f);
              e.target.value = "";
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 flex-none rounded-2xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={!channel || sending || !!editingMessageId}
            aria-label="Adjuntar imagen"
            title="Adjuntar imagen"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            placeholder={pendingFile ? "Añade un mensaje (opcional)" : "Escribe un mensaje"}
            className="min-h-[52px] rounded-[22px] border-border bg-card px-4 py-3 text-sm"
            disabled={!channel || sending}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
          />
          <Button size="icon" className="h-12 w-12 flex-none rounded-2xl" onClick={() => void onSend()} disabled={!canSend} aria-label={editingMessageId ? "Guardar mensaje" : "Enviar mensaje"}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-end text-[11px] text-muted-foreground">{draft.trim().length}/{CHAT_MESSAGE_MAX_LENGTH}</div>
      </div>
    </section>
  );
};

export default ChatConversation;

