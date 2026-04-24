import { describe, it, expect } from "vitest";
import {
  buildWorkReportsCsv,
  formatWorkHours,
  getDurationState,
  getWorkReportDurationHours,
} from "@/lib/work-reports";

describe("work-reports", () => {
  describe("getWorkReportDurationHours", () => {
    it("convierte la diferencia entre fechas a horas", () => {
      const hours = getWorkReportDurationHours({
        started_at: "2025-01-15T08:00:00Z",
        ended_at: "2025-01-15T12:30:00Z",
      });
      expect(hours).toBeCloseTo(4.5, 5);
    });

    it("usa now cuando no hay ended_at", () => {
      const now = new Date("2025-01-15T10:00:00Z");
      const hours = getWorkReportDurationHours(
        { started_at: "2025-01-15T08:00:00Z", ended_at: null },
        now,
      );
      expect(hours).toBe(2);
    });

    it("devuelve 0 cuando la diferencia es negativa o inválida", () => {
      expect(
        getWorkReportDurationHours({
          started_at: "2025-01-15T16:00:00Z",
          ended_at: "2025-01-15T08:00:00Z",
        }),
      ).toBe(0);
    });
  });

  describe("formatWorkHours", () => {
    it("usa un decimal por debajo de 10 horas", () => {
      expect(formatWorkHours(4.5)).toBe("4.5 h");
    });

    it("redondea sin decimales a partir de 10 horas", () => {
      expect(formatWorkHours(12.4)).toBe("12 h");
    });
  });

  describe("getDurationState", () => {
    it("devuelve 'short' por debajo de 1h", () => {
      expect(getDurationState(0.5)).toBe("short");
    });

    it("devuelve 'normal' en jornada estándar", () => {
      expect(getDurationState(6)).toBe("normal");
    });

    it("devuelve 'high' en horas extra", () => {
      expect(getDurationState(9.5)).toBe("high");
    });
  });

  describe("buildWorkReportsCsv", () => {
    it("genera cabecera y fila escapando comillas", () => {
      const csv = buildWorkReportsCsv([
        {
          id: "1",
          worker_name: 'Juan "El Topo"',
          action: "carga",
          description: "Carga de áridos",
          machine: "Camión 1",
          observations: null,
          started_at: "2025-01-15T08:00:00Z",
          ended_at: "2025-01-15T10:00:00Z",
        },
      ]);
      const lines = csv.split("\n");
      expect(lines[0]).toContain("Trabajador");
      expect(lines[0]).toContain("Horas");
      expect(lines[1]).toContain('"Juan ""El Topo"""');
      expect(lines[1]).toContain('"2.00"');
    });
  });
});
