import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import ChatChannelDialog from "@/components/chat/ChatChannelDialog";
import ChatChannelList from "@/components/chat/ChatChannelList";
import ChatConversation from "@/components/chat/ChatConversation";
import type { ChannelSummary, ChatChannelItem, ChatMessageItem } from "@/components/chat/chat-types";
import { toast } from "sonner";

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
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelDialogMode, setChannelDialogMode] = useState<"create" | "edit">("create");
  const [activeChannelDraft, setActiveChannelDraft] = useState<{ id: string | null; name: string; description: string }>({ id: null, name: "", description: "" });
  const [savingChannel, setSavingChannel] = useState(false);
  const [showConversationOnMobile, setShowConversationOnMobile] = useState(false);
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [lastChannelsSnapshot, setLastChannelsSnapshot] = useState<ChatChannelItem[]>([]);
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

  const fetchChannelsAndSummaries = async () => {
    setLoadingChannels(true);
    const { data, error } = await db.from("chat_channels").select("id, slug, name, description, created_at").order("name");
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

  const openCreateChannel = () => {
    setChannelDialogMode("create");
    setActiveChannelDraft({ id: null, name: "", description: "" });
    setChannelDialogOpen(true);
  };

  const openEditChannel = (channel: ChatChannelItem) => {
    setChannelDialogMode("edit");
    setActiveChannelDraft({ id: channel.id, name: channel.name, description: channel.description || "" });
    setChannelDialogOpen(true);
  };

  const saveChannel = async (values: { name: string; description: string }) => {
    if (!user || !isAdmin || !values.name.trim()) return;
    setSavingChannel(true);
    const slug = values.name.trim().toLowerCase().replace(/\s+/g, "-");
    const payload = { name: values.name.trim(), slug, description: values.description.trim() || null };
    const query = channelDialogMode === "edit" && activeChannelDraft.id
      ? db.from("chat_channels").update(payload).eq("id", activeChannelDraft.id)
      : db.from("chat_channels").insert({ ...payload, created_by_user_id: user.id });
    const { error } = await query;
    setSavingChannel(false);
    if (error) return toast.error(channelDialogMode === "edit" ? "No se pudo editar el canal" : "No se pudo crear el canal");
    toast.success(channelDialogMode === "edit" ? "Canal actualizado" : "Canal creado");
    setChannelDialogOpen(false);
    void fetchChannelsAndSummaries();
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
    if (!user || !activeChannelId || !draft.trim()) return;
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

  const activeChannel = useMemo(() => channels.find((channel) => channel.id === activeChannelId) ?? null, [channels, activeChannelId]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Chat" title="Conversaciones internas" description="Diseñado como una app móvil real: un toque para abrir, escribir y responder." />
      <section className="grid gap-3 md:grid-cols-[340px_1fr]">
        <ChatChannelList
          activeChannelId={activeChannelId}
          channels={channels}
          summaries={channelSummaries}
          isAdmin={isAdmin}
          loading={loadingChannels}
          hiddenOnMobile={showConversationOnMobile}
          onSelect={(channelId) => {
            setActiveChannelId(channelId);
            setShowConversationOnMobile(true);
          }}
          onCreate={openCreateChannel}
          onEdit={openEditChannel}
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
        initialValues={{ name: activeChannelDraft.name, description: activeChannelDraft.description }}
        onOpenChange={setChannelDialogOpen}
        onSubmit={(values) => void saveChannel(values)}
      />
    </div>
  );
};

export default ChatHubView;