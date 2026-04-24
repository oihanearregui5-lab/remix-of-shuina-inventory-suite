import { toast } from "sonner";

/**
 * Errores conocidos de Supabase tienen `code`, `message`, `details`, `hint`.
 * Esta función extrae un mensaje legible sin exponer detalles técnicos al usuario.
 */
export interface SupabaseLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const KNOWN_CODE_MESSAGES: Record<string, string> = {
  PGRST301: "No tienes permisos para realizar esta acción.",
  "42501": "No tienes permisos para realizar esta acción.",
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar: hay datos relacionados.",
  "23502": "Falta información obligatoria.",
  "22P02": "Alguno de los datos tiene un formato no válido.",
  "PGRST116": "No se ha encontrado el registro solicitado.",
};

/**
 * Devuelve un mensaje legible para mostrar al usuario a partir de un error
 * de Supabase, fetch o desconocido. Nunca lanza.
 */
export const describeSupabaseError = (error: unknown, fallback = "Ha ocurrido un error inesperado."): string => {
  if (!error) return fallback;

  // Pérdida de conexión
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sin conexión a internet. Comprueba tu red e inténtalo de nuevo.";
  }

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    if (error.name === "AbortError") return "La operación ha tardado demasiado. Inténtalo de nuevo.";
    if (error.message?.toLowerCase().includes("failed to fetch")) {
      return "No se ha podido contactar con el servidor.";
    }
    return error.message || fallback;
  }

  if (typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    if (candidate.code && KNOWN_CODE_MESSAGES[candidate.code]) {
      return KNOWN_CODE_MESSAGES[candidate.code];
    }
    if (candidate.message) return candidate.message;
  }

  return fallback;
};

/**
 * Muestra un toast de error con mensaje legible y registra el error original
 * en consola para depuración (solo en desarrollo).
 */
export const notifyError = (error: unknown, fallback = "Ha ocurrido un error inesperado.") => {
  const description = describeSupabaseError(error, fallback);
  toast.error(description);
  if (import.meta.env.DEV) {
    console.error("[notifyError]", error);
  }
  return description;
};

/**
 * Decide si un error conviene reintentarse (timeouts, 5xx, fallos de red).
 * Útil para `retry` en TanStack Query.
 */
export const shouldRetryError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 2) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (error.message?.toLowerCase().includes("failed to fetch")) return true;
    if (error.message?.toLowerCase().includes("network")) return true;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError & { status?: number };
    // Errores RLS / validación / no encontrado: no reintentar
    if (candidate.code && KNOWN_CODE_MESSAGES[candidate.code]) return false;
    // Errores 5xx: reintentar
    if (typeof candidate.status === "number" && candidate.status >= 500) return true;
  }

  return false;
};
