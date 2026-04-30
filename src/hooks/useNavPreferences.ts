import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY_BASE = "transtubari-nav-prefs";

export type NavScope = "worker" | "admin";

export interface NavPreferences {
  hidden: string[];
  order: string[];
}

const EMPTY: NavPreferences = { hidden: [], order: [] };

const storageKey = (scope: NavScope) => `${STORAGE_KEY_BASE}-${scope}`;

const readLocal = (scope: NavScope): NavPreferences => {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
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

const writeLocal = (scope: NavScope, prefs: NavPreferences) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(scope), JSON.stringify(prefs));
};

/**
 * Hook de preferencias de menú con scopes separados (admin / worker).
 *
 * Cada scope guarda su propio `hidden` y `order` en localStorage Y en BD
 * (tabla user_nav_preferences con columna `scope`).
 *
 * Cambios en el state son INMEDIATOS (no esperan a la BD).
 * La sincronización con BD ocurre en background con debounce de 400ms
 * para evitar saturar el servidor cuando el usuario hace toggles rápidos.
 *
 * IMPORTANTE: la BD NUNCA pisa al state local cuando el usuario está
 * editando. Solo se carga de BD una vez al montar (con user.id).
 */
export const useNavPreferences = (scope: NavScope) => {
  const { user } = useAuth();
  const [prefs, setPrefsState] = useState<NavPreferences>(() => readLocal(scope));
  const [loaded, setLoaded] = useState(false);

  // Si el scope cambia (cambias de admin a worker), recargamos local
  useEffect(() => {
    setPrefsState(readLocal(scope));
  }, [scope]);

  // Carga inicial de BD (solo una vez por user+scope)
  const loadedFromBD = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const key = `${user?.id}|${scope}`;
    if (!user?.id || loadedFromBD.current === key) {
      setLoaded(true);
      return;
    }
    const load = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("user_nav_preferences")
          .select("hidden_sections, section_order")
          .eq("user_id", user.id)
          .eq("scope", scope)
          .maybeSingle();
        if (!active) return;
        if (!error && data) {
          const remote: NavPreferences = {
            hidden: data.hidden_sections ?? [],
            order: data.section_order ?? [],
          };
          // Aplicamos lo de BD aunque venga vacío. Es la fuente de verdad.
          setPrefsState(remote);
          writeLocal(scope, remote);
        }
        loadedFromBD.current = key;
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
  }, [user?.id, scope]);

  // Debounced persistencia a BD
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistToDB = useCallback(
    (next: NavPreferences) => {
      if (!user?.id) return;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        void (supabase as any)
          .from("user_nav_preferences")
          .upsert(
            {
              user_id: user.id,
              scope,
              hidden_sections: next.hidden,
              section_order: next.order,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,scope" },
          );
      }, 400);
    },
    [user?.id, scope],
  );

  /**
   * Aplica un cambio. Es síncrono para el state local + localStorage.
   * La BD se actualiza con debounce.
   */
  const setPrefs = useCallback(
    (updater: NavPreferences | ((prev: NavPreferences) => NavPreferences)) => {
      setPrefsState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: NavPreferences) => NavPreferences)(prev) : updater;
        writeLocal(scope, next);
        persistToDB(next);
        return next;
      });
    },
    [scope, persistToDB],
  );

  const toggleHidden = useCallback(
    (key: string) => {
      setPrefs((prev) => {
        const isHidden = prev.hidden.includes(key);
        return {
          ...prev,
          hidden: isHidden ? prev.hidden.filter((k) => k !== key) : [...prev.hidden, key],
        };
      });
    },
    [setPrefs],
  );

  const moveSection = useCallback(
    (key: string, direction: "up" | "down", allKeys: string[]) => {
      setPrefs((prev) => {
        const current = [
          ...prev.order.filter((k) => allKeys.includes(k)),
          ...allKeys.filter((k) => !prev.order.includes(k)),
        ];
        const idx = current.indexOf(key);
        if (idx < 0) return prev;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= current.length) return prev;
        const next = [...current];
        [next[idx], next[target]] = [next[target], next[idx]];
        return { ...prev, order: next };
      });
    },
    [setPrefs],
  );

  const reset = useCallback(() => {
    setPrefs(EMPTY);
  }, [setPrefs]);

  return {
    prefs,
    loaded,
    toggleHidden,
    moveSection,
    reset,
    savePrefs: setPrefs,
  };
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
