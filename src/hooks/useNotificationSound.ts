import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NOTIFICATION_SOUND_KEY = "transtubari-notification-sound";

const playNotificationBeep = () => {
  try {
    const enabled = localStorage.getItem(NOTIFICATION_SOUND_KEY) !== "0";
    if (!enabled) return;
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.45);
  } catch {
    // silencio
  }
};

export const useNotificationSound = () => {
  const { user } = useAuth();
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("chat-sound-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg && msg.author_user_id !== user.id && msg.id !== lastIdRef.current) {
            lastIdRef.current = msg.id;
            playNotificationBeep();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);
};

export const setNotificationSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(NOTIFICATION_SOUND_KEY, enabled ? "1" : "0");
};

export const isNotificationSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NOTIFICATION_SOUND_KEY) !== "0";
};
