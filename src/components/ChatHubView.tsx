import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Hash, Pencil, Plus, SendHorizonal, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ChatChannelItem { id: string; slug: string; name: string; description: string | null }
interface ChatMessageItem { id: string; channel_id: string; author_user_id: string; message: string; created_at: string }

const ChatHubView = () => {
  const { user, profile, isAdmin } = useAuth();
  const db = supabase as any;
  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (user) void fetchChannels(); }, [user]);
  useEffect(() => {
    if (!activeChannelId) return;
    void fetchMessages(activeChannelId);
    const channel = db.channel(`chat-${activeChannelId}`).on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` }, () => void fetchMessages(activeChannelId)).subscribe();
    return () => { db.removeChannel(channel); };
  }, [activeChannelId]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const fetchChannels = async () => {
    const { data, error } = await db.from("chat_channels").select("id, slug, name, description").order("name");
    if (error) return toast.error("No se pudieron cargar los canales");
    const loaded = (data ?? []) as ChatChannelItem[];
    setChannels(loaded);
    if (!activeChannelId && loaded[0]?.id) setActiveChannelId(loaded[0].id);
  };

  const fetchMessages = async (channelId: string) => {
    const { data, error } = await db.from("chat_messages").select("id, channel_id, author_user_id, message, created_at").eq("channel_id", channelId).order("created_at", { ascending: true }).limit(200);
    if (error) return toast.error("No se pudieron cargar los mensajes");
    setMessages((data ?? []) as ChatMessageItem[]);
  };

  const saveChannel = async () => {
    if (!user || !isAdmin || !channelName.trim()) return;
    const slug = channelName.trim().toLowerCase().replace(/\s+/g, "-");
    const { error } = await db.from("chat_channels").insert({ name: channelName.trim(), slug, description: channelDescription.trim() || null, created_by_user_id: user.id });
    if (error) return toast.error("No se pudo crear el canal");
    setChannelName("");
    setChannelDescription("");
    toast.success("Canal creado");
    void fetchChannels();
  };

  const deleteChannel = async (channelId: string) => {
    const { error } = await db.from("chat_channels").delete().eq("id", channelId);
    if (error) return toast.error("No se pudo eliminar el canal");
    toast.success("Canal eliminado");
    setActiveChannelId("");
    setMessages([]);
    void fetchChannels();
  };

  const sendMessage = async () => {
    if (!user || !activeChannelId || !draft.trim()) return;
    const query = editingMessageId
      ? db.from("chat_messages").update({ message: draft.trim() }).eq("id", editingMessageId)
      : db.from("chat_messages").insert({ channel_id: activeChannelId, author_user_id: user.id, message: draft.trim() });
    const { error } = await query;
    if (error) return toast.error(editingMessageId ? "No se pudo editar el mensaje" : "No se pudo enviar el mensaje");
    setDraft("");
    setEditingMessageId(null);
    void fetchMessages(activeChannelId);
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await db.from("chat_messages").delete().eq("id", messageId);
    if (error) return toast.error("No se pudo eliminar el mensaje");
    void fetchMessages(activeChannelId);
  };

  const activeChannel = useMemo(() => channels.find((channel) => channel.id === activeChannelId) ?? null, [channels, activeChannelId]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Chat" title="Canales internos" description="Mensajería rápida tipo chat, preparada para uso diario en móvil." />
      <section className="grid gap-3 xl:grid-cols-[320px_1fr]">
        <aside className="panel-surface p-4">
          {isAdmin && (
            <div className="mb-4 space-y-2 border-b border-border pb-4">
              <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Nuevo canal" />
              <Input value={channelDescription} onChange={(e) => setChannelDescription(e.target.value)} placeholder="Descripción corta" />
              <Button className="w-full" onClick={() => void saveChannel()}><Plus className="h-4 w-4" /> Crear canal</Button>
            </div>
          )}
          <div className="space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className={activeChannelId === channel.id ? "rounded-xl border border-primary bg-primary/10 p-3" : "rounded-xl border border-border bg-background p-3"}>
                <button onClick={() => setActiveChannelId(channel.id)} className="w-full text-left">
                  <p className="flex items-center gap-2 font-medium text-foreground"><Hash className="h-4 w-4 text-primary" /> {channel.name}</p>
                  {channel.description && <p className="mt-1 text-xs text-muted-foreground">{channel.description}</p>}
                </button>
                {isAdmin && activeChannelId === channel.id && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setChannelName(channel.name); setChannelDescription(channel.description || ""); }}><Pencil className="h-4 w-4" /> Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteChannel(channel.id)}><Trash2 className="h-4 w-4" /> Eliminar</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className="panel-surface overflow-hidden p-0">
          <div className="border-b border-border px-4 py-4">
            <p className="font-semibold text-foreground">{activeChannel ? `# ${activeChannel.name}` : "Selecciona un canal"}</p>
            <p className="text-sm text-muted-foreground">{activeChannel?.description || "Conversación interna con edición y borrado de mensajes propios."}</p>
          </div>
          <div ref={listRef} className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && <div className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">Todavía no hay mensajes en este canal.</div>}
            {messages.map((message) => {
              const own = message.author_user_id === user?.id;
              return (
                <div key={message.id} className={own ? "ml-auto max-w-[88%] rounded-[20px] rounded-br-md bg-primary px-4 py-3 text-primary-foreground" : "max-w-[88%] rounded-[20px] rounded-bl-md bg-muted px-4 py-3 text-foreground"}>
                  <div className="flex items-center justify-between gap-3 text-xs opacity-80">
                    <span>{own ? (profile?.full_name || "Tú") : "Equipo"}</span>
                    <span>{format(new Date(message.created_at), "HH:mm · d MMM", { locale: es })}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{message.message}</p>
                  {(own || isAdmin) && (
                    <div className="mt-3 flex gap-2">
                      {own && <button className="text-xs font-medium" onClick={() => { setEditingMessageId(message.id); setDraft(message.message); }}>Editar</button>}
                      <button className="text-xs font-medium" onClick={() => void deleteMessage(message.id)}>Eliminar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border px-4 py-4">
            <div className="grid gap-3">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe un mensaje..." className="min-h-24" />
              <Button onClick={() => void sendMessage()} disabled={!draft.trim() || !activeChannelId}><SendHorizonal className="h-4 w-4" /> {editingMessageId ? "Guardar mensaje" : "Enviar mensaje"}</Button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default ChatHubView;