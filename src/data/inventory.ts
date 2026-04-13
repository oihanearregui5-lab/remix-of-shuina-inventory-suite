export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  quantity: number;
  unit: string;
  minStock: number;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

export const categories: Category[] = [
  { id: "manguera", name: "Manguera", icon: "🔧", itemCount: 0 },
  { id: "conexiones", name: "Conexiones Manguera Flexible", icon: "🔩", itemCount: 0 },
  { id: "adaptadores", name: "Adaptadores", icon: "⚙️", itemCount: 0 },
  { id: "engrase", name: "Engrase", icon: "🛢️", itemCount: 0 },
  { id: "enchufes-rapidos", name: "Enchufes Rápidos Hidráulicos", icon: "🔌", itemCount: 0 },
  { id: "llaves-alta-presion", name: "Llaves de Alta Presión", icon: "🔑", itemCount: 0 },
  { id: "abrazaderas", name: "Abrazaderas", icon: "📎", itemCount: 0 },
  { id: "accesorios", name: "Accesorios para Mangueras", icon: "🧰", itemCount: 0 },
  { id: "maquinaria", name: "Maquinaria Prensado y Corte", icon: "⚡", itemCount: 0 },
];

export const inventoryItems: InventoryItem[] = [
  // MANGUERA
  { id: "m-001", name: "Manguera hidráulica 1 malla R1AT", category: "manguera", quantity: 0, unit: "metros", minStock: 50, description: "Manguera 1 malla acero, SAE 100 R1AT" },
  { id: "m-002", name: "Manguera hidráulica 2 mallas R2AT", category: "manguera", quantity: 0, unit: "metros", minStock: 50, description: "Manguera 2 mallas acero, SAE 100 R2AT" },
  { id: "m-003", name: "Manguera hidráulica 4SP", category: "manguera", quantity: 0, unit: "metros", minStock: 30, description: "Manguera 4 espirales, alta presión" },
  { id: "m-004", name: "Manguera hidráulica R7", category: "manguera", quantity: 0, unit: "metros", minStock: 20, description: "Manguera termoplástica R7" },
  { id: "m-005", name: "Manguera hidráulica R12", category: "manguera", quantity: 0, unit: "metros", minStock: 20, description: "Manguera 4 espirales R12" },
  { id: "m-006", name: "Manguera aire comprimido", category: "manguera", quantity: 0, unit: "metros", minStock: 30 },
  { id: "m-007", name: "Manguera aspiración/impulsión", category: "manguera", quantity: 0, unit: "metros", minStock: 20 },
  { id: "m-008", name: "Manguera teflón PTFE", category: "manguera", quantity: 0, unit: "metros", minStock: 10 },
  { id: "m-009", name: "Manguera alimentaria", category: "manguera", quantity: 0, unit: "metros", minStock: 15 },
  { id: "m-010", name: "Manguera soldadura", category: "manguera", quantity: 0, unit: "metros", minStock: 20 },

  // CONEXIONES MANGUERA FLEXIBLE
  { id: "c-001", name: "Terminal recto hembra DIN 2353", category: "conexiones", quantity: 0, unit: "uds", minStock: 100 },
  { id: "c-002", name: "Terminal recto macho BSP", category: "conexiones", quantity: 0, unit: "uds", minStock: 100 },
  { id: "c-003", name: "Terminal codo 45° hembra", category: "conexiones", quantity: 0, unit: "uds", minStock: 50 },
  { id: "c-004", name: "Terminal codo 90° hembra", category: "conexiones", quantity: 0, unit: "uds", minStock: 50 },
  { id: "c-005", name: "Terminal recto macho JIC", category: "conexiones", quantity: 0, unit: "uds", minStock: 80 },
  { id: "c-006", name: "Terminal brida SAE código 61", category: "conexiones", quantity: 0, unit: "uds", minStock: 30 },
  { id: "c-007", name: "Terminal brida SAE código 62", category: "conexiones", quantity: 0, unit: "uds", minStock: 20 },
  { id: "c-008", name: "Terminal prensado Interlock", category: "conexiones", quantity: 0, unit: "uds", minStock: 40 },
  { id: "c-009", name: "Terminal recto hembra métrica", category: "conexiones", quantity: 0, unit: "uds", minStock: 60 },
  { id: "c-010", name: "Terminal banjo", category: "conexiones", quantity: 0, unit: "uds", minStock: 30 },

  // ADAPTADORES
  { id: "a-001", name: "Adaptador BSP macho-macho", category: "adaptadores", quantity: 0, unit: "uds", minStock: 50 },
  { id: "a-002", name: "Adaptador BSP macho-hembra", category: "adaptadores", quantity: 0, unit: "uds", minStock: 50 },
  { id: "a-003", name: "Adaptador métrico macho-macho", category: "adaptadores", quantity: 0, unit: "uds", minStock: 40 },
  { id: "a-004", name: "Adaptador JIC macho-macho", category: "adaptadores", quantity: 0, unit: "uds", minStock: 30 },
  { id: "a-005", name: "Codo orientable 90° BSP", category: "adaptadores", quantity: 0, unit: "uds", minStock: 40 },
  { id: "a-006", name: "Te BSP", category: "adaptadores", quantity: 0, unit: "uds", minStock: 20 },
  { id: "a-007", name: "Cruz BSP", category: "adaptadores", quantity: 0, unit: "uds", minStock: 10 },
  { id: "a-008", name: "Reducción BSP", category: "adaptadores", quantity: 0, unit: "uds", minStock: 30 },
  { id: "a-009", name: "Tapón BSP macho", category: "adaptadores", quantity: 0, unit: "uds", minStock: 40 },
  { id: "a-010", name: "Tapón BSP hembra", category: "adaptadores", quantity: 0, unit: "uds", minStock: 40 },

  // ENGRASE
  { id: "e-001", name: "Boquilla de engrase recta", category: "engrase", quantity: 0, unit: "uds", minStock: 50 },
  { id: "e-002", name: "Boquilla de engrase 45°", category: "engrase", quantity: 0, unit: "uds", minStock: 30 },
  { id: "e-003", name: "Boquilla de engrase 90°", category: "engrase", quantity: 0, unit: "uds", minStock: 30 },
  { id: "e-004", name: "Bomba de engrase manual", category: "engrase", quantity: 0, unit: "uds", minStock: 5 },
  { id: "e-005", name: "Pistola engrasadora neumática", category: "engrase", quantity: 0, unit: "uds", minStock: 3 },
  { id: "e-006", name: "Latiguillo engrase", category: "engrase", quantity: 0, unit: "uds", minStock: 10 },
  { id: "e-007", name: "Acoplamiento engrase hidráulico", category: "engrase", quantity: 0, unit: "uds", minStock: 10 },

  // ENCHUFES RÁPIDOS HIDRÁULICOS
  { id: "er-001", name: "Enchufe rápido ISO A macho", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 30 },
  { id: "er-002", name: "Enchufe rápido ISO A hembra", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 30 },
  { id: "er-003", name: "Enchufe rápido ISO B macho", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 20 },
  { id: "er-004", name: "Enchufe rápido ISO B hembra", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 20 },
  { id: "er-005", name: "Enchufe rápido plano cara plana macho", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 15 },
  { id: "er-006", name: "Enchufe rápido plano cara plana hembra", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 15 },
  { id: "er-007", name: "Enchufe rápido agrícola macho", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 20 },
  { id: "er-008", name: "Enchufe rápido agrícola hembra", category: "enchufes-rapidos", quantity: 0, unit: "uds", minStock: 20 },

  // LLAVES DE ALTA PRESIÓN
  { id: "l-001", name: "Llave de bola 2 vías BSP", category: "llaves-alta-presion", quantity: 0, unit: "uds", minStock: 15 },
  { id: "l-002", name: "Llave de bola 3 vías BSP", category: "llaves-alta-presion", quantity: 0, unit: "uds", minStock: 10 },
  { id: "l-003", name: "Válvula de aguja BSP", category: "llaves-alta-presion", quantity: 0, unit: "uds", minStock: 10 },
  { id: "l-004", name: "Minimess punto de medición", category: "llaves-alta-presion", quantity: 0, unit: "uds", minStock: 20 },
  { id: "l-005", name: "Grifo de purga", category: "llaves-alta-presion", quantity: 0, unit: "uds", minStock: 10 },

  // ABRAZADERAS
  { id: "ab-001", name: "Abrazadera sin fin W1", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 100 },
  { id: "ab-002", name: "Abrazadera sin fin W4 inox", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 50 },
  { id: "ab-003", name: "Abrazadera de seguridad con tornillo", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 50 },
  { id: "ab-004", name: "Soporte tubo DIN 3015 serie ligera", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 40 },
  { id: "ab-005", name: "Soporte tubo DIN 3015 serie pesada", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 30 },
  { id: "ab-006", name: "Grapa doble tubo", category: "abrazaderas", quantity: 0, unit: "uds", minStock: 30 },

  // ACCESORIOS PARA MANGUERAS
  { id: "ac-001", name: "Protector espiral plástico", category: "accesorios", quantity: 0, unit: "metros", minStock: 50 },
  { id: "ac-002", name: "Protector espiral metálico", category: "accesorios", quantity: 0, unit: "metros", minStock: 30 },
  { id: "ac-003", name: "Funda textil protección", category: "accesorios", quantity: 0, unit: "metros", minStock: 30 },
  { id: "ac-004", name: "Identificador de manguera", category: "accesorios", quantity: 0, unit: "uds", minStock: 100 },
  { id: "ac-005", name: "Tapón protector plástico", category: "accesorios", quantity: 0, unit: "uds", minStock: 200 },
  { id: "ac-006", name: "Conector testigo rotura manguera", category: "accesorios", quantity: 0, unit: "uds", minStock: 20 },

  // MAQUINARIA PRENSADO Y CORTE
  { id: "mq-001", name: "Prensa hidráulica de taller", category: "maquinaria", quantity: 0, unit: "uds", minStock: 1 },
  { id: "mq-002", name: "Prensa hidráulica portátil", category: "maquinaria", quantity: 0, unit: "uds", minStock: 1 },
  { id: "mq-003", name: "Cortadora de disco", category: "maquinaria", quantity: 0, unit: "uds", minStock: 1 },
  { id: "mq-004", name: "Peladora de manguera", category: "maquinaria", quantity: 0, unit: "uds", minStock: 1 },
  { id: "mq-005", name: "Juego de mordazas prensa", category: "maquinaria", quantity: 0, unit: "uds", minStock: 2 },
];
