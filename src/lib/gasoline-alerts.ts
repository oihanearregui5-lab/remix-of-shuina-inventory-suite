export interface GasolineLikeRecord {
  id: string;
  cardId: string;
  date: string;
  station: string;
  amount: number | string;
  liters: number | string | null;
  vehicle: string;
}

export interface GasolineAlertItem {
  id: string;
  recordId: string;
  cardId: string;
  title: string;
  description: string;
  severity: "warning" | "danger";
}

export const parseFuelNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getFuelUnitPrice = (record: GasolineLikeRecord) => {
  const amount = parseFuelNumber(record.amount);
  const liters = parseFuelNumber(record.liters);
  if (amount <= 0 || liters <= 0) return null;
  return amount / liters;
};

export const validateFuelDraft = (record: Pick<GasolineLikeRecord, "date" | "station" | "amount" | "liters" | "vehicle">) => {
  const amount = parseFuelNumber(record.amount);
  const liters = parseFuelNumber(record.liters);

  if (!record.date) return "Indica la fecha del repostaje";
  if (!record.station.trim()) return "Indica la gasolinera";
  if (amount <= 0) return "El importe debe ser mayor que 0";
  if (liters < 0) return "Los litros no pueden ser negativos";
  if (!record.vehicle.trim()) return "Indica el vehículo o matrícula";
  if (liters > 0) {
    const unitPrice = amount / liters;
    if (unitPrice > 3.5) return "El importe por litro parece incoherente";
  }
  return null;
};

export const buildGasolineAlerts = (records: GasolineLikeRecord[]) => {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const alerts: GasolineAlertItem[] = [];

  sorted.forEach((record, index) => {
    const amount = parseFuelNumber(record.amount);
    const liters = parseFuelNumber(record.liters);
    const unitPrice = getFuelUnitPrice(record);
    const previousSameCard = sorted.slice(index + 1).find((item) => item.cardId === record.cardId);

    if (amount >= 150) {
      alerts.push({
        id: `${record.id}-high-amount`,
        recordId: record.id,
        cardId: record.cardId,
        title: "Importe alto",
        description: `Este repostaje sube a ${amount.toFixed(2)} €, revisa si corresponde al uso habitual de la tarjeta.`,
        severity: "danger",
      });
    }

    if (liters >= 90) {
      alerts.push({
        id: `${record.id}-high-liters`,
        recordId: record.id,
        cardId: record.cardId,
        title: "Carga muy grande",
        description: `Se han registrado ${liters.toFixed(2)} litros. Conviene revisar vehículo y ticket.`,
        severity: "warning",
      });
    }

    if (unitPrice !== null && (unitPrice > 2.2 || unitPrice < 0.9)) {
      alerts.push({
        id: `${record.id}-unit-price`,
        recordId: record.id,
        cardId: record.cardId,
        title: "Precio por litro fuera de rango",
        description: `El cálculo sale a ${unitPrice.toFixed(2)} €/l y merece revisión.`,
        severity: "warning",
      });
    }

    if (previousSameCard) {
      const diffMs = Math.abs(new Date(record.date).getTime() - new Date(previousSameCard.date).getTime());
      const diffHours = diffMs / 36e5;
      if (diffHours <= 24) {
        alerts.push({
          id: `${record.id}-rapid-repeat`,
          recordId: record.id,
          cardId: record.cardId,
          title: "Cargas muy seguidas",
          description: `La misma tarjeta vuelve a tener un repostaje con solo ${diffHours.toFixed(1)} h de diferencia.`,
          severity: "warning",
        });
      }
    }
  });

  return alerts;
};
