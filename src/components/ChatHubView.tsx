import { useEffect, useMemo, useState } from "react";
import { Hash, MessageSquareMore, SendHorizonal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ChatChannelItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ChatMessageItem {
  id: string;
  channel_id: string;
  author_user_id: string;
  message: string;
  created_at: string;
}

const ChatHubView = () => {
  const { user, profile } = useAuth();
  const db = supabase as any;
  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetchChannels();
  }, [user]);

  useEffect(() => {
    if (!activeChannelId) return;
    void fetchMessages(activeChannelId);

    const channel = db
      .channel(`chat-${activeChannelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` },
        () => {
          void fetchMessages(activeChannelId);
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [activeChannelId]);

  const fetchChannels = async () => {
    const { data, error } = await db.from("chat_channels").select("id, slug, name, description").order("name", { ascending: true });

    if (error) {
      toast.error("No se pudieron cargar los canales");
      return;
    }

    const loaded = data ?? [];
    setChannels(loaded);
    if (!activeChannelId && loaded[0]?.id) {
      setActiveChannelId(loaded[0].id);
    }
  };

  const fetchMessages = async (channelId: string) => {
    const { data, error } = await db
      .from("chat_messages")
      .select("id, channel_id, author_user_id, message, created_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      toast.error("No se pudieron cargar los mensajes");
      return;
    }

    setMessages(data ?? []);
  };

  const sendMessage = async () => {
    if (!user || !activeChannelId || !draft.trim()) return;
    setSending(true);

    const { error } = await db.from("chat_messages").insert({
      channel_id: activeChannelId,
      author_user_id: user.id,
      message: draft.trim(),
    });

    if (error) {
      toast.error("No se pudo enviar el mensaje");
    } else {
      setDraft("");
      await fetchMessages(activeChannelId);
    }

    setSending(false);
  };

  const activeChannel = useMemo(() => channels.find((channel) => channel.id === activeChannelId) ?? null, [channels, activeChannelId]);

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Chat interno</h1>
        <p className="text-muted-foreground">Comunicación interna estilo canales para coordinar obras, maquinaria y avisos generales.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Hash className="h-4 w-4 text-primary" /> Canales
          </div>
          <div className="space-y-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${activeChannelId === channel.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
              >
                <p className="font-medium"># {channel.name}</p>
                {channel.description && <p className="mt-1 text-xs">{channel.description}</p>}
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">{activeChannel ? `# ${activeChannel.name}` : "Selecciona un canal"}</h2>
            </div>
            {activeChannel?.description && <p className="mt-1 text-sm text-muted-foreground">{activeChannel.description}</p>}
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 && <p className="rounded-lg bg-muted px-4 py-6 text-sm text-muted-foreground">Todavía no hay mensajes en este canal.</p>}
              {messages.map((message) => (
                <div key={message.id} className={`rounded-lg border px-4 py-3 ${message.author_user_id === user?.id ? "border-primary/20 bg-primary/10" : "border-border bg-background"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{message.author_user_id === user?.id ? (profile?.full_name ?? "Tú") : "Equipo Transtubari"}</p>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{message.message}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 border-t border-border pt-4">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe un mensaje al equipo..." className="min-h-24" />
              <Button onClick={sendMessage} disabled={sending || !draft.trim() || !activeChannelId}>
                <SendHorizonal className="h-4 w-4" /> Enviar mensaje
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChatHubView;