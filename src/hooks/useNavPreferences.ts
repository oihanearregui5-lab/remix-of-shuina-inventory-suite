import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "transtubari-nav-prefs";

export interface NavPreferences {
  hidden: string[];
  order: string[];
}

const EMPTY: NavPreferences = { hidden: [], order: [] };

const readLocal = (): NavPreferences => {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden.filter((x: unknown) => typeof x === "string") : [],
      order: Array.isArray(parsed?.order) ? parsed.order.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return EMPTY;
  }
};

const writeLocal = (prefs: NavPreferences) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

export const useNavPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefsState] = useState<NavPreferences>(() => readLocal());
  const [loaded, setLoaded] = useState(false);

  // Cargar de BD si hay user (con fallback silencioso a localStorage).
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.id) {
        setLoaded(true);
        return;
      }
      try {
        const { data, error } = await (supabase as any)
          .from("user_nav_preferences")
          .select("hidden_sections, section_order")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        if (!error && data) {
          const next: NavPreferences = {
            hidden: data.hidden_sections ?? [],
            order: data.section_order ?? [],
          };
          setPrefsState(next);
          writeLocal(next);
        }
      } catch {
        // silencio: usamos localStorage
      } finally {
        if (active) setLoaded(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const persist = useCallback(
    async (next: NavPreferences) => {
      setPrefsState(next);
      writeLocal(next);
      if (!user?.id) return;
      try {
        await (supabase as any)
          .from("user_nav_preferences")
          .upsert(
            {
              user_id: user.id,
              hidden_sections: next.hidden,
              section_order: next.order,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      } catch {
        // silencio
      }
    },
    [user?.id],
  );

  const toggleHidden = useCallback(
    (key: string) => {
      const isHidden = prefs.hidden.includes(key);
      const hidden = isHidden ? prefs.hidden.filter((k) => k !== key) : [...prefs.hidden, key];
      void persist({ ...prefs, hidden });
    },
    [persist, prefs],
  );

  const moveSection = useCallback(
    (key: string, direction: "up" | "down", allKeys: string[]) => {
      // Construir orden actual (preferencias + faltantes al final).
      const current = [
        ...prefs.order.filter((k) => allKeys.includes(k)),
        ...allKeys.filter((k) => !prefs.order.includes(k)),
      ];
      const idx = current.indexOf(key);
      if (idx < 0) return;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= current.length) return;
      const next = [...current];
      [next[idx], next[target]] = [next[target], next[idx]];
      void persist({ ...prefs, order: next });
    },
    [persist, prefs],
  );

  const reset = useCallback(() => {
    void persist(EMPTY);
  }, [persist]);

  return { prefs, loaded, toggleHidden, moveSection, reset };
};

/**
 * Aplica preferencias a una lista de keys: filtra ocultas y reordena.
 * Las keys no listadas en `order` mantienen su posición original al final.
 */
export const applyNavPrefs = <T extends string>(allKeys: T[], prefs: NavPreferences): T[] => {
  const visible = allKeys.filter((k) => !prefs.hidden.includes(k));
  const ordered: T[] = [];
  for (const k of prefs.order) {
    if (visible.includes(k as T) && !ordered.includes(k as T)) ordered.push(k as T);
  }
  for (const k of visible) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  return ordered;
};
