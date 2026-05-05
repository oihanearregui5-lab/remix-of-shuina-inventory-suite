/**
 * Devuelve "#000" o "#fff" según el contraste del color de fondo.
 * Acepta hex de 6 dígitos. Si no es válido, devuelve "#000".
 */
export function getContrastTextColor(hexColor: string | undefined | null): string {
  if (!hexColor) return "#000";
  const hex = hexColor.replace("#", "").trim();
  if (hex.length !== 6) return "#000";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return "#000";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000" : "#fff";
}

export const DEFAULT_WORKER_COLOR = "#6B7280";
