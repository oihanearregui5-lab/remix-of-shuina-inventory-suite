import { differenceInDays, parseISO } from "date-fns";

export type ExpirySeverity = "expired" | "urgent" | "soon" | "ok" | "none";

export interface ExpiryInfo {
  severity: ExpirySeverity;
  days: number | null;
  date: string | null;
}

export const evaluateExpiry = (value: string | null | undefined): ExpiryInfo => {
  if (!value) return { severity: "none", days: null, date: null };
  try {
    const days = differenceInDays(parseISO(value), new Date());
    let severity: ExpirySeverity = "ok";
    if (days < 0) severity = "expired";
    else if (days <= 15) severity = "urgent";
    else if (days <= 45) severity = "soon";
    return { severity, days, date: value };
  } catch {
    return { severity: "none", days: null, date: value };
  }
};

export const severityToneClass: Record<ExpirySeverity, string> = {
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  urgent: "bg-warning/20 text-foreground border-warning/40",
  soon: "bg-secondary/20 text-foreground border-secondary/40",
  ok: "bg-success/10 text-success border-success/30",
  none: "bg-muted text-muted-foreground border-border",
};

export const severityRank: Record<ExpirySeverity, number> = {
  expired: 4,
  urgent: 3,
  soon: 2,
  ok: 1,
  none: 0,
};
