import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUIMode } from "@/hooks/useUIMode";
import PageHeader from "@/components/shared/PageHeader";
import ChatChannelDialog, { type ChatChannelDialogMode, type ChatChannelDialogSubmitValues } from "@/components/chat/ChatChannelDialog";
import ChatChannelList from "@/components/chat/ChatChannelList";
import ChatConversation from "@/components/chat/ChatConversation";
import { Button } from "@/components/ui/button";
import type { ChannelSummary, ChatChannelItem, ChatMessageItem, StaffMemberOption } from "@/components/chat/chat-types";
import { toast } from "sonner";
import { normalizeChatQuery, validateChatDraft } from "@/lib/chat-utils";

const buildDirectKey = (userA: string, userB: string) => [userA, userB].sort().join(":");

const ChatHubView = () => {
  const { user, profile, isAdmin } = useAuth();
  const { isSimple } = useUIMode();
  const db = supabase as any;
  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [staff, setStaff] = useState<StaffMemberOption[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [channelSummaries, setChannelSummaries] = useState<Record<string, ChannelSummary>>({});
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [userIdToStaffName, setUserIdToStaffName] = useState<Record<string, string>>({});
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelDialogMode, setChannelDialogMode] = useState<ChatChannelDialogMode>("create-group");
  const [activeChannelDraft, setActiveChannelDraft] = useState<{ id: string | null; name: string; description: string; memberUserIds: string[] }>({
    id: null,
    name: "",
    description: "",
    memberUserIds: [],
  });
  const [savingChannel, setSavingChannel] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
    void fetchStaff();
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
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channel_members" }, () => {
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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const persistLastSeen = (nextValue: Record<string, string>) => {
    setLastSeenMap(nextValue);
    if (lastSeenStorageKey) window.localStorage.setItem(lastSeenStorageKey, JSON.stringify(nextValue));
  };

  const fetchStaff = async () => {
    const { data } = await db
      .from("staff_directory")
      .select("id, full_name, linked_user_id")
      .eq("active", true)
      .order("full_name", { ascending: true });

    const rows = (data ?? []) as StaffMemberOption[];
    setStaff(rows);
    const map: Record<string, string> = {};
    rows.forEach((row) => {
      if (row.linked_user_id) map[row.linked_user_id] = row.full_name;
    });
    setUserIdToStaffName(map);
  };

  const fetchAuthorNames = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean))).filter((id) => !authorNames[id]);
    if (uniqueIds.length === 0) return;
    const { data } = await db.from("profiles").select("user_id, full_name").in("user_id", uniqueIds);
    if (!data) return;
    setAuthorNames((current) => ({
      ...current,
      ...Object.fromEntries(
        (data as Array<{ user_id: string; full_name: string }>).map((profileItem) => [profileItem.user_id, profileItem.full_name || "Equipo"]),
      ),
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
          lastAuthorName: row.author_user_id === user?.id ? profile?.full_name || "Tú" : authorNames[row.author_user_id] || userIdToStaffName[row.author_user_id] || null,
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

  /**
   * Trae los canales visibles para el usuario actual:
   * - Canales públicos (visibility='public' o sin visibility para compatibilidad)
   * - Canales privados donde el usuario sea miembro
   * - Todos los canales si es admin
   * Luego resuelve el displayName de los directos al nombre del otro miembro.
   */
  const fetchChannelsAndSummaries = async () => {
    if (!user) return;
    setLoadingChannels(true);

    // 1) Membresías del usuario
    const { data: memberships } = await db
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", user.id);
    const memberChannelIds = ((memberships ?? []) as Array<{ channel_id: string }>).map((m) => m.channel_id);

    // 2) Canales
    const { data: allChannels, error } = await db
      .from("chat_channels")
      .select("id, slug, name, description, created_at, kind, visibility, direct_message_key")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadingChannels(false);
      return toast.error("No se pudieron cargar las conversaciones");
    }

    const fullList = (allChannels ?? []) as ChatChannelItem[];

    // 3) Filtrado: público o miembro o admin
    const visibleChannels = fullList.filter((channel) => {
      if (isAdmin) return true;
      const isPublic = !channel.visibility || channel.visibility === "public";
      if (isPublic) return true;
      return memberChannelIds.includes(channel.id);
    });

    // 4) Para los directos: traer a los miembros y resolver el nombre del otro usuario
    const directChannelIds = visibleChannels.filter((c) => c.kind === "direct").map((c) => c.id);
    let directOtherNameByChannel: Record<string, string> = {};
    if (directChannelIds.length > 0) {
      const { data: directMembers } = await db
        .from("chat_channel_members")
        .select("channel_id, user_id")
        .in("channel_id", directChannelIds);
      const membersByChannel = new Map<string, string[]>();
      ((directMembers ?? []) as Array<{ channel_id: string; user_id: string }>).forEach((m) => {
        const arr = membersByChannel.get(m.channel_id) ?? [];
        arr.push(m.user_id);
        membersByChannel.set(m.channel_id, arr);
      });
      const otherUserIds = new Set<string>();
      for (const [channelId, userIds] of membersByChannel.entries()) {
        const other = userIds.find((id) => id !== user.id);
        if (other) {
          otherUserIds.add(other);
          directOtherNameByChannel[channelId] = other; // temporal: id, a resolver abajo
        }
      }
      // Resolver nombres desde staff_directory + profiles como fallback
      const otherIds = Array.from(otherUserIds);
      if (otherIds.length > 0) {
        const [{ data: staffRows }, { data: profileRows }] = await Promise.all([
          db.from("staff_directory").select("full_name, linked_user_id").in("linked_user_id", otherIds),
          db.from("profiles").select("user_id, full_name").in("user_id", otherIds),
        ]);
        const nameByUserId: Record<string, string> = {};
        ((staffRows ?? []) as Array<{ full_name: string; linked_user_id: string }>).forEach((r) => {
          if (r.linked_user_id) nameByUserId[r.linked_user_id] = r.full_name;
        });
        ((profileRows ?? []) as Array<{ user_id: string; full_name: string }>).forEach((r) => {
          if (!nameByUserId[r.user_id]) nameByUserId[r.user_id] = r.full_name || "Usuario";
        });
        for (const [channelId, otherId] of Object.entries(directOtherNameByChannel)) {
          directOtherNameByChannel[channelId] = nameByUserId[otherId] || "Usuario";
        }
      }
    }

    // 5) Componer los canales con displayName
    const composed: ChatChannelItem[] = visibleChannels.map((channel) => ({
      ...channel,
      displayName: channel.kind === "direct" ? directOtherNameByChannel[channel.id] || "Chat directo" : channel.name,
    }));

    setChannels(composed);
    setLastChannelsSnapshot(composed);
    setActiveChannelId((current) => current || composed[0]?.id || "");
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

  const openCreateGroup = () => {
    setChannelDialogMode("create-group");
    setActiveChannelDraft({ id: null, name: "", description: "", memberUserIds: [] });
    setChannelDialogOpen(true);
  };

  const openCreateDirect = () => {
    setChannelDialogMode("create-direct");
    setActiveChannelDraft({ id: null, name: "", description: "", memberUserIds: [] });
    setChannelDialogOpen(true);
  };

  const openEditChannel = async (channel: ChatChannelItem) => {
    // Traer miembros actuales
    const { data: members } = await db
      .from("chat_channel_members")
      .select("user_id")
      .eq("channel_id", channel.id);
    const memberIds = ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    setChannelDialogMode("edit");
    setActiveChannelDraft({ id: channel.id, name: channel.name, description: channel.description || "", memberUserIds: memberIds });
    setChannelDialogOpen(true);
  };

  const saveChannel = async (values: ChatChannelDialogSubmitValues) => {
    if (!user) return;
    setSavingChannel(true);

    try {
      if (values.mode === "create-direct") {
        if (values.memberUserIds.length !== 1) {
          toast.error("Selecciona un trabajador");
          return;
        }
        const otherUserId = values.memberUserIds[0];
        const directKey = buildDirectKey(user.id, otherUserId);

        // ¿Ya existe?
        const { data: existing } = await db
          .from("chat_channels")
          .select("id")
          .eq("direct_message_key", directKey)
          .maybeSingle();

        if (existing?.id) {
          setActiveChannelId(existing.id);
          setShowConversationOnMobile(true);
          setChannelDialogOpen(false);
          await fetchChannelsAndSummaries();
          return;
        }

        // Crear canal directo
        const slug = `dm-${directKey.slice(0, 16)}-${Date.now()}`;
        const { data: created, error: createError } = await db
          .from("chat_channels")
          .insert({
            name: "",
            slug,
            description: null,
            kind: "direct",
            visibility: "private",
            direct_message_key: directKey,
            created_by_user_id: user.id,
          })
          .select("id")
          .single();

        if (createError || !created?.id) {
          toast.error("No se pudo crear el chat directo");
          return;
        }

        // Añadir los 2 miembros
        const { error: membersError } = await db.from("chat_channel_members").insert([
          { channel_id: created.id, user_id: user.id, membership_role: "admin", created_by_user_id: user.id },
          { channel_id: created.id, user_id: otherUserId, membership_role: "member", created_by_user_id: user.id },
        ]);

        if (membersError) {
          toast.error("Chat creado pero no se pudieron añadir los miembros");
          return;
        }

        toast.success("Chat abierto");
        setActiveChannelId(created.id);
        setShowConversationOnMobile(true);
        setChannelDialogOpen(false);
        await fetchChannelsAndSummaries();
        return;
      }

      if (values.mode === "create-group") {
        if (!values.name.trim()) {
          toast.error("El grupo necesita un nombre");
          return;
        }
        const slug = values.name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40) + "-" + Date.now().toString().slice(-4);
        const { data: created, error: createError } = await db
          .from("chat_channels")
          .insert({
            name: values.name.trim(),
            slug,
            description: values.description.trim() || null,
            kind: "group",
            visibility: "private",
            created_by_user_id: user.id,
          })
          .select("id")
          .single();

        if (createError || !created?.id) {
          toast.error("No se pudo crear el grupo");
          return;
        }

        // Añadir creador + miembros
        const uniqueMembers = Array.from(new Set([user.id, ...values.memberUserIds]));
        const rows = uniqueMembers.map((uid) => ({
          channel_id: created.id,
          user_id: uid,
          membership_role: uid === user.id ? "admin" : "member",
          created_by_user_id: user.id,
        }));
        const { error: membersError } = await db.from("chat_channel_members").insert(rows);
        if (membersError) {
          toast.error("Grupo creado pero no se pudieron añadir los miembros");
          return;
        }

        toast.success("Grupo creado");
        setActiveChannelId(created.id);
        setShowConversationOnMobile(true);
        setChannelDialogOpen(false);
        await fetchChannelsAndSummaries();
        return;
      }

      // edit
      if (!activeChannelDraft.id) return;
      const { error: updateError } = await db
        .from("chat_channels")
        .update({ name: values.name.trim(), description: values.description.trim() || null })
        .eq("id", activeChannelDraft.id);

      if (updateError) {
        toast.error("No se pudo editar el grupo");
        return;
      }

      // Actualizar miembros: borrar los que se eliminaron, insertar los nuevos
      const { data: existingMembers } = await db
        .from("chat_channel_members")
        .select("user_id")
        .eq("channel_id", activeChannelDraft.id);
      const existingIds = new Set(((existingMembers ?? []) as Array<{ user_id: string }>).map((m) => m.user_id));
      const desiredIds = new Set([user.id, ...values.memberUserIds]);

      const toRemove = Array.from(existingIds).filter((id) => !desiredIds.has(id));
      const toAdd = Array.from(desiredIds).filter((id) => !existingIds.has(id));

      if (toRemove.length > 0) {
        await db.from("chat_channel_members").delete().eq("channel_id", activeChannelDraft.id).in("user_id", toRemove);
      }
      if (toAdd.length > 0) {
        await db
          .from("chat_channel_members")
          .insert(toAdd.map((uid) => ({ channel_id: activeChannelDraft.id, user_id: uid, membership_role: "member", created_by_user_id: user.id })));
      }

      toast.success("Grupo actualizado");
      setChannelDialogOpen(false);
      await fetchChannelsAndSummaries();
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
    const trimmed = draft.trim();
    if (editingMessageId) {
      const validationError = validateChatDraft(draft);
      if (validationError) { setChatError(validationError); return toast.error(validationError); }
      setSending(true);
      const { error } = await db.from("chat_messages").update({ message: trimmed }).eq("id", editingMessageId);
      setSending(false);
      if (error) { setChatError("No se pudo guardar el cambio."); return toast.error("No se pudo editar el mensaje"); }
      setDraft(""); setEditingMessageId(null); setChatError(null);
      void fetchMessages(activeChannelId, true);
      return;
    }
    if (!trimmed && !pendingFile) { setChatError("Escribe un mensaje o adjunta una imagen."); return; }
    setSending(true);
    const { data: created, error } = await db.from("chat_messages")
      .insert({ channel_id: activeChannelId, author_user_id: user.id, message: trimmed || "📷 Imagen" })
      .select("id").single();
    if (error || !created) {
      setSending(false);
      setChatError("No se pudo enviar el mensaje.");
      return toast.error("No se pudo enviar el mensaje");
    }
    if (pendingFile) {
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${activeChannelId}/${created.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, pendingFile);
      if (upErr) {
        toast.error("Mensaje enviado pero la imagen falló");
      } else {
        await db.from("chat_message_attachments").insert({
          message_id: created.id,
          channel_id: activeChannelId,
          storage_path: path,
          mime_type: pendingFile.type,
          file_size: pendingFile.size,
          uploaded_by_user_id: user.id,
        });
      }
    }
    setSending(false);
    setDraft(""); setPendingFile(null); setChatError(null);
    void fetchMessages(activeChannelId, true);
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await db.from("chat_messages").delete().eq("id", messageId);
    if (error) return toast.error("No se pudo eliminar el mensaje");
    void fetchMessages(activeChannelId, true);
  };

  const activeChannel = useMemo(() => channels.find((channel) => channel.id === activeChannelId) ?? null, [channels, activeChannelId]);
  const filteredChannels = useMemo(() => {
    const query = normalizeChatQuery(channelQuery);
    return channels.filter((channel) => {
      const summary = channelSummaries[channel.id];
      const searchable = [channel.displayName, channel.name, channel.description ?? "", channel.slug, summary?.lastMessage ?? ""]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesUnread = !unreadOnly || (summary?.unreadCount ?? 0) > 0;
      return matchesQuery && matchesUnread;
    });
  }, [channelQuery, channelSummaries, channels, unreadOnly]);
  const unreadChannels = useMemo(() => Object.values(channelSummaries).filter((summary) => summary.unreadCount > 0).length, [channelSummaries]);
  const activeChannelSummary = activeChannel ? channelSummaries[activeChannel.id] : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader eyebrow="Chat" title="Conversaciones internas" description="Grupos del equipo y chats directos con otros compañeros." />

      {!isSimple && (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Conversaciones</p><p className="mt-2 text-lg font-semibold text-foreground">{channels.length}</p></div>
          <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sin leer</p><p className="mt-2 text-lg font-semibold text-foreground">{unreadChannels}</p></div>
          <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Conversación activa</p><p className="mt-2 text-lg font-semibold text-foreground">{activeChannel?.displayName || activeChannel?.name || "Ninguna"}</p><p className="mt-1 text-sm text-muted-foreground">{activeChannelSummary?.lastMessageAt ? `Último movimiento ${new Date(activeChannelSummary.lastMessageAt).toLocaleString("es-ES")}` : "Sin mensajes recientes"}</p></div>
        </section>
      )}

      {!isSimple && (
        <section className="panel-surface p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-primary" />
              <input value={channelQuery} onChange={(event) => setChannelQuery(event.target.value)} placeholder="Buscar conversación o último mensaje" className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
            <Button type="button" variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => setUnreadOnly((current) => !current)}>
              <Filter className="h-4 w-4" /> Solo sin leer
            </Button>
          </div>
        </section>
      )}

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
          onCreateGroup={openCreateGroup}
          onCreateDirect={openCreateDirect}
          onEdit={(c) => void openEditChannel(c)}
          onDelete={(channel) => void deleteChannel(channel)}
        />

        <div className={showConversationOnMobile ? "block" : "hidden md:block"}>
          <ChatConversation
            pendingFile={pendingFile}
            onPendingFileChange={setPendingFile}
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
        initialValues={{ name: activeChannelDraft.name, description: activeChannelDraft.description, memberUserIds: activeChannelDraft.memberUserIds }}
        staff={staff}
        currentUserId={user?.id ?? null}
        onOpenChange={setChannelDialogOpen}
        onSubmit={(values) => void saveChannel(values)}
      />
    </div>
  );
};

export default ChatHubView;
