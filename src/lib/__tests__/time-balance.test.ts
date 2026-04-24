import { describe, it, expect } from "vitest";
import {
  DAILY_TARGET_MINUTES,
  countWorkingDays,
  formatMinutes,
  getWorkedMinutes,
  summarizeEntriesForRange,
} from "@/lib/time-balance";

describe("time-balance", () => {
  describe("getWorkedMinutes", () => {
    it("calcula la diferencia entre clock_in y clock_out", () => {
      const minutes = getWorkedMinutes({
        clock_in: "2025-01-15T08:00:00Z",
        clock_out: "2025-01-15T16:30:00Z",
      });
      expect(minutes).toBe(8 * 60 + 30);
    });

    it("usa now cuando no hay clock_out", () => {
      const now = new Date("2025-01-15T10:00:00Z");
      const minutes = getWorkedMinutes(
        { clock_in: "2025-01-15T08:00:00Z", clock_out: null },
        now,
      );
      expect(minutes).toBe(120);
    });

    it("nunca devuelve negativos si clock_out es anterior a clock_in", () => {
      const minutes = getWorkedMinutes({
        clock_in: "2025-01-15T16:00:00Z",
        clock_out: "2025-01-15T08:00:00Z",
      });
      expect(minutes).toBe(0);
    });
  });

  describe("formatMinutes", () => {
    it("formatea positivos como 'Xh Ym'", () => {
      expect(formatMinutes(125)).toBe("2h 5m");
      expect(formatMinutes(0)).toBe("0h 0m");
    });

    it("conserva signo negativo", () => {
      expect(formatMinutes(-90)).toBe("-1h 30m");
    });
  });

  describe("countWorkingDays", () => {
    it("cuenta solo días laborales (lunes a viernes)", () => {
      // Lunes 13 a domingo 19 de enero de 2025 → 5 días laborales
      const start = new Date("2025-01-13T00:00:00");
      const end = new Date("2025-01-19T23:59:59");
      expect(countWorkingDays(start, end)).toBe(5);
    });

    it("excluye sábado y domingo", () => {
      // Sábado y domingo
      const start = new Date("2025-01-18T00:00:00");
      const end = new Date("2025-01-19T23:59:59");
      expect(countWorkingDays(start, end)).toBe(0);
    });
  });

  describe("summarizeEntriesForRange", () => {
    it("calcula balance positivo cuando se trabaja más de lo esperado", () => {
      // Lunes 13 a viernes 17 enero 2025 (5 laborales)
      const start = new Date("2025-01-13T00:00:00");
      const end = new Date("2025-01-17T23:59:59");
      const entries = Array.from({ length: 5 }).map((_, idx) => ({
        clock_in: new Date(2025, 0, 13 + idx, 8, 0, 0).toISOString(),
        clock_out: new Date(2025, 0, 13 + idx, 17, 0, 0).toISOString(),
      }));
      const summary = summarizeEntriesForRange(entries, start, end);
      expect(summary.workedDays).toBe(5);
      expect(summary.workedMinutes).toBe(5 * 9 * 60);
      expect(summary.expectedMinutes).toBe(5 * DAILY_TARGET_MINUTES);
      expect(summary.balanceMinutes).toBe(60 * 5);
      expect(summary.overtimeMinutes).toBe(60 * 5);
      expect(summary.missingMinutes).toBe(0);
    });

    it("ignora entradas fuera del rango", () => {
      const start = new Date("2025-01-13T00:00:00");
      const end = new Date("2025-01-17T23:59:59");
      const summary = summarizeEntriesForRange(
        [
          {
            clock_in: "2024-12-30T08:00:00Z",
            clock_out: "2024-12-30T16:00:00Z",
          },
        ],
        start,
        end,
      );
      expect(summary.workedDays).toBe(0);
      expect(summary.workedMinutes).toBe(0);
    });
  });
});
