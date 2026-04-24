import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  formatChatDayLabel,
  formatChatTimestamp,
  normalizeChatQuery,
  validateChatDraft,
} from "@/lib/chat-utils";

describe("chat-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatChatTimestamp", () => {
    it("devuelve cadena vacía si no hay valor", () => {
      expect(formatChatTimestamp(null)).toBe("");
    });

    it("formatea como hora HH:mm si es hoy", () => {
      const today = new Date("2025-01-15T09:30:00").toISOString();
      expect(formatChatTimestamp(today)).toMatch(/^\d{2}:\d{2}$/);
    });

    it("devuelve 'Ayer' si la fecha es ayer", () => {
      const yesterday = new Date("2025-01-14T09:30:00").toISOString();
      expect(formatChatTimestamp(yesterday)).toBe("Ayer");
    });
  });

  describe("formatChatDayLabel", () => {
    it("devuelve 'Hoy' para fecha actual", () => {
      expect(formatChatDayLabel(new Date("2025-01-15T08:00:00").toISOString())).toBe("Hoy");
    });

    it("devuelve 'Ayer' para el día previo", () => {
      expect(formatChatDayLabel(new Date("2025-01-14T08:00:00").toISOString())).toBe("Ayer");
    });
  });

  describe("normalizeChatQuery", () => {
    it("aplica trim y minúsculas", () => {
      expect(normalizeChatQuery("  HOLA Mundo  ")).toBe("hola mundo");
    });
  });

  describe("validateChatDraft", () => {
    it("rechaza mensajes vacíos", () => {
      expect(validateChatDraft("   ")).toMatch(/Escribe un mensaje/);
    });

    it("rechaza mensajes que superan el máximo", () => {
      const big = "a".repeat(CHAT_MESSAGE_MAX_LENGTH + 1);
      expect(validateChatDraft(big)).toMatch(/Máximo/);
    });

    it("acepta un mensaje válido", () => {
      expect(validateChatDraft("Hola equipo")).toBeNull();
    });
  });
});
