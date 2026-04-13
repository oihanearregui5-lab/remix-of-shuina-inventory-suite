import { Package, AlertTriangle, Layers, TrendingDown } from "lucide-react";
import { categories, inventoryItems } from "@/data/inventory";

const DashboardView = () => {
  const totalItems = inventoryItems.length;
  const totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventoryItems.filter((item) => item.quantity < item.minStock);
  const outOfStockItems = inventoryItems.filter((item) => item.quantity === 0);

  const stats = [
    {
      label: "Total Referencias",
      value: totalItems,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Categorías",
      value: categories.length,
      icon: Layers,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Stock Bajo",
      value: lowStockItems.length,
      icon: TrendingDown,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Sin Stock",
      value: outOfStockItems.length,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Panel General</h1>
        <p className="text-muted-foreground mt-1">Resumen del inventario de SUHINA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Categories Overview */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Por Categoría</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const items = inventoryItems.filter((i) => i.category === cat.id);
          const totalQty = items.reduce((s, i) => s + i.quantity, 0);
          return (
            <div
              key={cat.id}
              className="bg-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{cat.icon}</span>
                <h3 className="font-medium text-foreground text-sm leading-tight">{cat.name}</h3>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-primary">{items.length}</span>
                <span className="text-xs text-muted-foreground">referencias</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Stock total:</span>
                <span className="text-sm font-semibold text-foreground">{totalQty}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardView;
