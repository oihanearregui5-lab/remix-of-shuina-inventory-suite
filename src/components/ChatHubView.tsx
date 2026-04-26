import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import ChatChannelDialog, { type ChatChannelDialogMode, type ChatChannelDialogSubmitValues } from "@/components/chat/ChatChannelDialog";
import ChatChannelList from "@/components/chat/ChatChannelList";
import ChatConversation from "@/components/chat/ChatConversation";
import { Button } from "@/components/ui/button";
import type { ChannelSummary, ChatChannelItem, ChatMessageItem, StaffMemberOption } from "@/components/chat/chat-types";
import { toast } from "sonner";
import { normalizeChatQuery, validateChatDraft } from "@/lib/chat-utils";

const ChatHubView = () => {
  const { user, profile, isAdmin } = useAuth();
  const db = supabase as any;
  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [channelSummaries, setChannelSummaries] = useState<Record<string, ChannelSummary>>({});
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMemberOption[]>([]);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelDialogMode, setChannelDialogMode] = useState<ChatChannelDialogMode>("create-group");
  const [channelDialogInitial, setChannelDialogInitial] = useState<{ name: string; description: string; memberUserIds: string[] }>({ name: "", description: "", memberUserIds: [] });
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [showConversationOnMobile, setShowConversationOnMobile] = useState(false);
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [lastChannelsSnapshot, setLastChannelsSnapshot] = useState<ChatChannelItem[]>([]);
  const [channelQuery, setChannelQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSeenStorageKey = user ? `chat-last-seen-${user.id}` : null;

  useEffect(() => {
    if (!user) return;
    if (lastSeenStorageKey) {
      try {
        setLastSeenMap(JSON.parse(window.localStorage.getItem(lastSeenStorageKey) ?? "{}"));
      } catch {
        setLastSeenMap({});
      }
    }
    void fetchChannelsAndSummaries();
    void fetchStaff();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subscription = db
      .channel("chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        void fetchChannelSummaries();
        if (activeChannelId) void fetchMessages(activeChannelId, false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channels" }, () => {
        void fetchChannelsAndSummaries();
      })
      .subscribe();

    return () => {
      db.removeChannel(subscription);
    };
  }, [user, activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) return;
    void fetchMessages(activeChannelId, true);
  }, [activeChannelId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const persistLastSeen = (nextValue: Record<string, string>) => {
    setLastSeenMap(nextValue);
    if (lastSeenStorageKey) window.localStorage.setItem(lastSeenStorageKey, JSON.stringify(nextValue));
  };

  const fetchAuthorNames = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean))).filter((id) => !authorNames[id]);
    if (uniqueIds.length === 0) return;
    const { data } = await db.from("profiles").select("user_id, full_name").in("user_id", uniqueIds);
    if (!data) return;
    setAuthorNames((current) => ({
      ...current,
      ...Object.fromEntries(data.map((profileItem: { user_id: string; full_name: string }) => [profileItem.user_id, profileItem.full_name || "Equipo"])),
    }));
  };

  const fetchChannelSummaries = async () => {
    const { data } = await db
      .from("chat_messages")
      .select("channel_id, author_user_id, message, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (data ?? []) as Array<{ channel_id: string; author_user_id: string; message: string; created_at: string }>;
    void fetchAuthorNames(rows.map((item) => item.author_user_id));

    const summaries: Record<string, ChannelSummary> = {};
    for (const row of rows) {
      if (!summaries[row.channel_id]) {
        summaries[row.channel_id] = {
          channelId: row.channel_id,
          lastMessage: row.message,
          lastMessageAt: row.created_at,
          lastAuthorName: row.author_user_id === user?.id ? profile?.full_name || "Tú" : authorNames[row.author_user_id] || null,
          unreadCount: 0,
        };
      }
      const seenAt = lastSeenMap[row.channel_id];
      if (row.author_user_id !== user?.id && (!seenAt || new Date(row.created_at) > new Date(seenAt))) {
        summaries[row.channel_id].unreadCount += 1;
      }
    }
    for (const channel of lastChannelsSnapshot) {
      if (!summaries[channel.id]) {
        summaries[channel.id] = {
          channelId: channel.id,
          lastMessage: null,
          lastMessageAt: null,
          lastAuthorName: null,
          unreadCount: 0,
        };
      }
    }
    setChannelSummaries(summaries);
  };

  const fetchStaff = async () => {
    const { data } = await db
      .from("staff_directory")
      .select("id, full_name, linked_user_id")
      .eq("active", true)
      .not("linked_user_id", "is", null)
      .order("full_name");
    setStaff((data ?? []) as StaffMemberOption[]);
  };

  const decorateChannel = (channel: ChatChannelItem): ChatChannelItem => {
    if (channel.kind !== "direct" || !channel.direct_message_key || !user) return channel;
    // direct_message_key: "<userA>:<userB>"
    const [userA, userB] = channel.direct_message_key.split(":");
    const otherUserId = userA === user.id ? userB : userA;
    const otherStaff = staff.find((person) => person.linked_user_id === otherUserId);
    const otherName = otherStaff?.full_name || authorNames[otherUserId] || channel.name;
    return {
      ...channel,
      displayName: otherName,
      displayInitial: otherName.charAt(0).toUpperCase(),
    };
  };

  const fetchChannelsAndSummaries = async () => {
    setLoadingChannels(true);
    const { data, error } = await db
      .from("chat_channels")
      .select("id, slug, name, description, kind, visibility, direct_message_key, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadingChannels(false);
      return toast.error("No se pudieron cargar los canales");
    }
    const loaded = (data ?? []) as ChatChannelItem[];
    setChannels(loaded);
    setLastChannelsSnapshot(loaded);
    setActiveChannelId((current) => current || loaded[0]?.id || "");
    await fetchChannelSummaries();
    setLoadingChannels(false);
  };

  const fetchMessages = async (channelId: string, markAsSeen: boolean) => {
    setLoadingMessages(true);
    const { data, error } = await db
      .from("chat_messages")
      .select("id, channel_id, author_user_id, message, created_at, updated_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(250);

    if (error) {
      setLoadingMessages(false);
      return toast.error("No se pudieron cargar los mensajes");
    }

    const loadedMessages = (data ?? []) as ChatMessageItem[];
    setMessages(loadedMessages);
    void fetchAuthorNames(loadedMessages.map((item) => item.author_user_id));

    if (markAsSeen && loadedMessages.length > 0) {
      const latestMessageAt = loadedMessages[loadedMessages.length - 1].created_at;
      const nextSeen = { ...lastSeenMap, [channelId]: latestMessageAt };
      persistLastSeen(nextSeen);
    }

    setLoadingMessages(false);
    setChatError(null);
    void fetchChannelSummaries();
  };

  const openCreateGroup = async () => {
    if (staff.length === 0) await fetchStaff();
    setChannelDialogMode("create-group");
    setEditingChannelId(null);
    setChannelDialogInitial({ name: "", description: "", memberUserIds: [] });
    setChannelDialogOpen(true);
  };

  const openCreateDirect = async () => {
    if (staff.length === 0) await fetchStaff();
    setChannelDialogMode("create-direct");
    setEditingChannelId(null);
    setChannelDialogInitial({ name: "", description: "", memberUserIds: [] });
    setChannelDialogOpen(true);
  };

  const openEditChannel = async (channel: ChatChannelItem) => {
    if (staff.length === 0) await fetchStaff();
    // Cargar miembros actuales
    const { data } = await db.from("chat_channel_members").select("user_id").eq("channel_id", channel.id);
    const memberUserIds = ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id).filter((id) => id !== user?.id);
    setChannelDialogMode("edit");
    setEditingChannelId(channel.id);
    setChannelDialogInitial({
      name: channel.name,
      description: channel.description || "",
      memberUserIds,
    });
    setChannelDialogOpen(true);
  };

  const handleChannelDialogSubmit = async (values: ChatChannelDialogSubmitValues) => {
    if (!user) return;
    setSavingChannel(true);
    try {
      if (values.mode === "create-direct") {
        const recipientUserId = values.memberUserIds[0];
        if (!recipientUserId) return;
        const { data, error } = await db.rpc("get_or_create_direct_channel", { _other_user_id: recipientUserId });
        if (error) {
          toast.error("No se pudo abrir la conversación");
          return;
        }
        setChannelDialogOpen(false);
        await fetchChannelsAndSummaries();
        if (typeof data === "string") {
          setActiveChannelId(data);
          setShowConversationOnMobile(true);
        }
        return;
      }

      if (values.mode === "create-group") {
        if (!values.name.trim()) return;
        const { data, error } = await db.rpc("create_private_group", {
          _name: values.name.trim(),
          _description: values.description.trim() || null,
          _member_ids: values.memberUserIds,
        });
        if (error) {
          toast.error("No se pudo crear el grupo");
          return;
        }
        toast.success("Grupo creado");
        setChannelDialogOpen(false);
        await fetchChannelsAndSummaries();
        if (typeof data === "string") setActiveChannelId(data);
        return;
      }

      // edit
      if (!editingChannelId || !values.name.trim()) return;
      const slug = values.name.trim().toLowerCase().replace(/\s+/g, "-");
      const { error } = await db
        .from("chat_channels")
        .update({ name: values.name.trim(), slug, description: values.description.trim() || null })
        .eq("id", editingChannelId);
      if (error) {
        toast.error("No se pudo editar el canal");
        return;
      }
      // Sincronizar miembros (solo para grupos)
      const channel = channels.find((item) => item.id === editingChannelId);
      if (channel && channel.kind === "group") {
        const { data: existing } = await db
          .from("chat_channel_members")
          .select("user_id")
          .eq("channel_id", editingChannelId);
        const existingIds = new Set(((existing ?? []) as Array<{ user_id: string }>).map((m) => m.user_id));
        const desiredIds = new Set([user.id, ...values.memberUserIds]);
        const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
        const toRemove = [...existingIds].filter((id) => !desiredIds.has(id) && id !== user.id);
        for (const userId of toAdd) {
          await db.from("chat_channel_members").insert({
            channel_id: editingChannelId,
            user_id: userId,
            created_by_user_id: user.id,
            membership_role: "member",
          });
        }
        if (toRemove.length > 0) {
          await db.from("chat_channel_members").delete().eq("channel_id", editingChannelId).in("user_id", toRemove);
        }
      }
      toast.success("Canal actualizado");
      setChannelDialogOpen(false);
      void fetchChannelsAndSummaries();
    } finally {
      setSavingChannel(false);
    }
  };

  const deleteChannel = async (channel: ChatChannelItem) => {
    const { error } = await db.from("chat_channels").delete().eq("id", channel.id);
    if (error) return toast.error("No se pudo eliminar el canal");
    toast.success("Canal eliminado");
    if (activeChannelId === channel.id) setShowConversationOnMobile(false);
    setActiveChannelId((current) => (current === channel.id ? "" : current));
    setMessages([]);
    void fetchChannelsAndSummaries();
  };

  const sendMessage = async () => {
    if (!user || !activeChannelId) return;
    const validationError = validateChatDraft(draft);
    if (validationError) {
      setChatError(validationError);
      return toast.error(validationError);
    }
    setSending(true);
    const query = editingMessageId
      ? db.from("chat_messages").update({ message: draft.trim() }).eq("id", editingMessageId)
      : db.from("chat_messages").insert({ channel_id: activeChannelId, author_user_id: user.id, message: draft.trim() });
    const { error } = await query;
    setSending(false);
    if (error) {
      setChatError(editingMessageId ? "No se pudo guardar el cambio." : "No se pudo enviar el mensaje.");
      return toast.error(editingMessageId ? "No se pudo editar el mensaje" : "No se pudo enviar el mensaje");
    }
    setDraft("");
    setEditingMessageId(null);
    setChatError(null);
    void fetchMessages(activeChannelId, true);
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await db.from("chat_messages").delete().eq("id", messageId);
    if (error) return toast.error("No se pudo eliminar el mensaje");
    void fetchMessages(activeChannelId, true);
  };

  const decoratedChannels = useMemo(() => channels.map(decorateChannel), [channels, staff, user, authorNames]);
  const activeChannel = useMemo(() => decoratedChannels.find((channel) => channel.id === activeChannelId) ?? null, [decoratedChannels, activeChannelId]);
  const filteredChannels = useMemo(() => {
    const query = normalizeChatQuery(channelQuery);
    return decoratedChannels.filter((channel) => {
      const summary = channelSummaries[channel.id];
      const searchable = [channel.name, channel.displayName ?? "", channel.description ?? "", channel.slug, summary?.lastMessage ?? ""].join(" ").toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesUnread = !unreadOnly || (summary?.unreadCount ?? 0) > 0;
      return matchesQuery && matchesUnread;
    });
  }, [channelQuery, channelSummaries, decoratedChannels, unreadOnly]);
  const unreadChannels = useMemo(() => Object.values(channelSummaries).filter((summary) => summary.unreadCount > 0).length, [channelSummaries]);
  const activeChannelSummary = activeChannel ? channelSummaries[activeChannel.id] : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Chat" title="Conversaciones internas" description="Canales más útiles, lectura rápida de actividad y seguimiento operativo del equipo." />
      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Canales</p><p className="mt-2 text-lg font-semibold text-foreground">{channels.length}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sin leer</p><p className="mt-2 text-lg font-semibold text-foreground">{unreadChannels}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Canal activo</p><p className="mt-2 text-lg font-semibold text-foreground">{activeChannel?.displayName ?? activeChannel?.name ?? "Ninguno"}</p><p className="mt-1 text-sm text-muted-foreground">{activeChannelSummary?.lastMessageAt ? `Último movimiento ${new Date(activeChannelSummary.lastMessageAt).toLocaleString("es-ES")}` : "Sin mensajes recientes"}</p></div>
      </section>
      <section className="panel-surface p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 text-primary" />
            <input value={channelQuery} onChange={(event) => setChannelQuery(event.target.value)} placeholder="Buscar canal o último mensaje" className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          <Button type="button" variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => setUnreadOnly((current) => !current)}><Filter className="h-4 w-4" /> Solo sin leer</Button>
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-[340px_1fr]">
        <ChatChannelList
          activeChannelId={activeChannelId}
          channels={filteredChannels}
          summaries={channelSummaries}
          isAdmin={isAdmin}
          loading={loadingChannels}
          hiddenOnMobile={showConversationOnMobile}
          onSelect={(channelId) => {
            setActiveChannelId(channelId);
            setShowConversationOnMobile(true);
          }}
          onCreateGroup={() => void openCreateGroup()}
          onCreateDirect={() => void openCreateDirect()}
          onEdit={(channel) => void openEditChannel(channel)}
          onDelete={(channel) => void deleteChannel(channel)}
        />

        <div className={showConversationOnMobile ? "block" : "hidden md:block"}>
          <ChatConversation
            channel={activeChannel}
            currentUserId={user?.id}
            currentUserName={profile?.full_name}
            isAdmin={isAdmin}
            messages={messages}
            loading={loadingMessages}
            sending={sending}
            error={chatError}
            draft={draft}
            editingMessageId={editingMessageId}
            authorNames={authorNames}
            listRef={listRef}
            onBack={() => setShowConversationOnMobile(false)}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onStartEdit={(message) => {
              setEditingMessageId(message.id);
              setDraft(message.message);
            }}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setDraft("");
            }}
            onDeleteMessage={(messageId) => void deleteMessage(messageId)}
          />
        </div>
      </section>

      <ChatChannelDialog
        open={channelDialogOpen}
        loading={savingChannel}
        mode={channelDialogMode}
        initialValues={channelDialogInitial}
        staff={staff}
        currentUserId={user?.id ?? null}
        onOpenChange={setChannelDialogOpen}
        onSubmit={(values) => void handleChannelDialogSubmit(values)}
      />
    </div>
  );
};

export default ChatHubView;
