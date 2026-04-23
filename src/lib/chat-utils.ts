import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

export const CHAT_MESSAGE_MAX_LENGTH = 1500;

export const formatChatTimestamp = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (isToday(date)) return format(date, "HH:mm", { locale: es });
  if (isYesterday(date)) return "Ayer";
  return format(date, "d MMM", { locale: es });
};

export const formatChatDayLabel = (value: string) => {
  const date = new Date(value);
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

export const normalizeChatQuery = (value: string) => value.trim().toLowerCase();

export const validateChatDraft = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Escribe un mensaje antes de enviarlo.";
  if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) return `Máximo ${CHAT_MESSAGE_MAX_LENGTH} caracteres por mensaje.`;
  return null;
};