import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { describeSupabaseError, shouldRetryError } from "@/lib/error-utils";

describe("error-utils", () => {
  describe("describeSupabaseError", () => {
    it("usa el fallback cuando no hay error", () => {
      expect(describeSupabaseError(null)).toMatch(/inesperado/i);
    });

    it("traduce códigos conocidos de Supabase", () => {
      expect(describeSupabaseError({ code: "23505", message: "duplicate key" })).toMatch(/Ya existe/i);
      expect(describeSupabaseError({ code: "42501", message: "denied" })).toMatch(/permisos/i);
    });

    it("usa el message del error si no hay código conocido", () => {
      expect(describeSupabaseError(new Error("Boom"))).toBe("Boom");
    });

    it("avisa de fallo de red en 'Failed to fetch'", () => {
      const error = new Error("Failed to fetch");
      expect(describeSupabaseError(error)).toMatch(/servidor/i);
    });
  });

  describe("shouldRetryError", () => {
    beforeEach(() => {
      // Forzamos navigator.onLine = true en cada test
      vi.stubGlobal("navigator", { onLine: true });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("no reintenta más de 2 veces", () => {
      expect(shouldRetryError(2, new Error("network"))).toBe(false);
    });

    it("no reintenta sin conexión", () => {
      vi.stubGlobal("navigator", { onLine: false });
      expect(shouldRetryError(0, new Error("network"))).toBe(false);
    });

    it("reintenta errores de red", () => {
      expect(shouldRetryError(0, new Error("Failed to fetch"))).toBe(true);
    });

    it("no reintenta errores conocidos de Supabase", () => {
      expect(shouldRetryError(0, { code: "23505", message: "duplicate" })).toBe(false);
    });

    it("reintenta errores 5xx", () => {
      expect(shouldRetryError(0, { status: 503 })).toBe(true);
    });
  });
});
