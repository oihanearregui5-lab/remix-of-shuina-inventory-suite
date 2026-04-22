export interface StaffMemberSeed {
  name: string;
  role: "worker" | "manager";
  area: string;
}

export interface MachineSeed {
  id: string;
  name: string;
  plate: string;
  family: string;
  image: string;
  focus: string[];
  status: "active" | "maintenance" | "repair" | "inspection";
}

export const staffSeed: StaffMemberSeed[] = [
  { name: "Andry", role: "worker", area: "Operaciones" },
  { name: "Fran", role: "worker", area: "Operaciones" },
  { name: "Lyuben", role: "worker", area: "Operaciones" },
  { name: "Misael", role: "worker", area: "Operaciones" },
  { name: "Manuel", role: "worker", area: "Operaciones" },
  { name: "Olek", role: "worker", area: "Operaciones" },
  { name: "Silvestre", role: "worker", area: "Operaciones" },
  { name: "Silvio", role: "worker", area: "Operaciones" },
  { name: "Hamid", role: "worker", area: "Operaciones" },
  { name: "Raquel", role: "manager", area: "Administración" },
  { name: "David", role: "manager", area: "Jefatura" },
  { name: "Abel", role: "manager", area: "Encargado" },
  { name: "Jon", role: "manager", area: "Encargado" },
];

export const machineSeed: MachineSeed[] = [
  { id: "r-1624-bcj", name: "Bañera Juanito", plate: "R 1624 BCJ", family: "Bañera", image: "", focus: ["ITV", "aceite hidráulico", "aceite motor"], status: "active" },
  { id: "7050-kcz", name: "Camión 7050 KCZ", plate: "7050 KCZ", family: "Camión", image: "", focus: ["ITV", "neumáticos", "mantenimiento general"], status: "active" },
  { id: "3971-bkd", name: "Camionico Nissan", plate: "3971 BKD", family: "Camión ligero", image: "camionico-nissan-3971bkd", focus: ["aceite motor", "frenos", "ITV"], status: "active" },
  { id: "r-1460-bdd", name: "R 1460 BDD", plate: "R 1460 BDD", family: "Camión", image: "", focus: ["mantenimiento general", "ITV", "luces"], status: "maintenance" },
  { id: "6219-hwp", name: "6219 HWP", plate: "6219 HWP", family: "Camión", image: "", focus: ["aceite motor", "aceite hidráulico", "frenos"], status: "active" },
  { id: "r-8050-bdg", name: "R 8050 BDG", plate: "R 8050 BDG", family: "Camión", image: "", focus: ["ITV", "ruedas", "mantenimiento preventivo"], status: "inspection" },
  { id: "wirtgen-2100", name: "Wirtgen 2100", plate: "Sin matrícula", family: "Fresadora", image: "wirtgen-2100", focus: ["tambor", "refrigeración", "aceite hidráulico"], status: "active" },
  { id: "volvo-l220", name: "Pala Volvo vieja 220", plate: "Sin matrícula", family: "Pala cargadora", image: "pala-volvo-vieja-220", focus: ["cazo", "aceite hidráulico", "engrase"], status: "repair" },
  { id: "wirtgen-2200-sm", name: "Wirtgen 2200 SM", plate: "Sin matrícula", family: "Fresadora", image: "wirtgen-2200-sm", focus: ["cinta", "tambores", "ITV interna"], status: "active" },
  { id: "volvo-l150", name: "Volvo nueva 150", plate: "Sin matrícula", family: "Pala cargadora", image: "volvo-nueva-150", focus: ["aceite motor", "engrase", "neumáticos"], status: "active" },
  { id: "liebherr-900", name: "Liebherr 900", plate: "Sin matrícula", family: "Excavadora", image: "liebherr-900", focus: ["hidráulica", "balancín", "anticongelante"], status: "maintenance" },
  { id: "retro-hitachi", name: "Retro Hitachi", plate: "Sin matrícula", family: "Retroexcavadora", image: "retro-hitachi", focus: ["aceite motor", "engrase", "itv interna"], status: "active" },
  { id: "9508-dpb", name: "9508 DPB", plate: "9508 DPB", family: "Camión", image: "", focus: ["mantenimiento general", "ITV", "luces"], status: "active" },
  { id: "wirtgen-2200-holandesa", name: "Wirtgen 2200 holandesa", plate: "Sin matrícula", family: "Fresadora", image: "", focus: ["cinta", "fresado", "aceite hidráulico"], status: "inspection" },
  { id: "na-9464-af", name: "Iveco", plate: "NA-9464-AF", family: "Camión", image: "", focus: ["ITV", "frenos", "aceite motor"], status: "active" },
  { id: "komatsu", name: "Komatsu", plate: "Sin matrícula", family: "Maquinaria pesada", image: "komatsu", focus: ["hidráulica", "orugas", "engrase"], status: "active" },
  { id: "5480-jxp", name: "Scania", plate: "5480-JXP", family: "Camión", image: "", focus: ["ITV", "aceite motor", "adblue"], status: "maintenance" },
  { id: "r6823bdp", name: "Bañera Tisvol", plate: "R6823BDP", family: "Bañera", image: "banera-tisvol-r6823bdp", focus: ["chasis", "ejes", "ITV"], status: "active" },
  { id: "3930-jjd", name: "Scania azul", plate: "3930 JJD", family: "Camión", image: "scania-azul-3930jjd", focus: ["ITV", "mantenimiento general", "neumáticos"], status: "active" },
  { id: "retro-volvo-360c", name: "Retro Volvo 360C", plate: "Sin matrícula", family: "Retroexcavadora", image: "", focus: ["hidráulica", "engrase", "anticongelante"], status: "repair" },
];

export const complianceHighlights = [
  "Registro diario de inicio y fin de jornada por persona.",
  "Conservación histórica de los fichajes para consulta y exportación.",
  "Trazabilidad de incidencias, pausas y correcciones desde administración.",
  "Acceso móvil para fichaje en obra con geolocalización cuando el trabajador la permite.",
];