import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UnreadCounts {
  chat: number;
  tasks: number;
}

export const useUnreadCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ chat: 0, tasks: 0 });

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCounts({ chat: 0, tasks: 0 });
      return;
    }
    try {
      const [chatRes, tasksRes] = await Promise.all([
        (supabase as any).rpc("count_unread_messages"),
        (supabase as any).rpc("count_pending_tasks"),
      ]);
      setCounts({
        chat: Number(chatRes?.data ?? 0),
        tasks: Number(tasksRes?.data ?? 0),
      });
    } catch {
      // silencio
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();

    if (!user?.id) return;

    const channel = supabase
      .channel("unread-counts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void refresh();
      })
      .subscribe();

    const onChannelRead = () => void refresh();
    window.addEventListener("chat-channel-read", onChannelRead);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("chat-channel-read", onChannelRead);
    };
  }, [user?.id, refresh]);

  const markChannelRead = useCallback(
    async (channelId: string) => {
      try {
        await (supabase as any).rpc("mark_channel_read", { p_channel_id: channelId });
      } finally {
        void refresh();
      }
    },
    [refresh],
  );

  return { counts, refresh, markChannelRead };
};
