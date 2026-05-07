export type Chapter = { time: number; title: string };

export const CHAPTERS: Chapter[] = [
  { time: 0, title: "Introducción" },
  { time: 66, title: "Tu tarjeta de acceso" },
  { time: 130, title: "Cómo poner la app en el móvil" },
  { time: 204, title: "La primera vez que entras" },
  { time: 268, title: "Lo primero que ves dentro" },
  { time: 345, title: "Cómo está organizada la app" },
  { time: 448, title: "Resumen de mi jornada" },
  { time: 540, title: "Tareas" },
  { time: 614, title: "Partes de trabajo" },
  { time: 740, title: "Calendario y vacaciones" },
  { time: 818, title: "Chat" },
  { time: 847, title: "Notas" },
  { time: 875, title: "Mi cuenta y notificaciones" },
  { time: 948, title: "Si algo no funciona" },
  { time: 994, title: "Cierre" },
];

export const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
