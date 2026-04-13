import { Search, Plus, Minus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { categories, inventoryItems, type InventoryItem } from "@/data/inventory";

interface CategoryViewProps {
  categoryId: string;
}

const CategoryView = ({ categoryId }: CategoryViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const category = categories.find((c) => c.id === categoryId);
  const items = inventoryItems.filter((i) => i.category === categoryId);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!category) return null;

  const getStockBadge = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
          <AlertTriangle className="w-3 h-3" />
          Sin stock
        </span>
      );
    }
    if (item.quantity < item.minStock) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
          Stock bajo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
        OK
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{category.icon}</span>
          <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
        </div>
        <p className="text-muted-foreground">
          {items.length} referencias · Stock total: {items.reduce((s, i) => s + i.quantity, 0)}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar en esta categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
        />
      </div>

      {/* Items Table - Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Ref.
              </th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Material
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Cantidad
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Unidad
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Mín. Stock
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
              >
                <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{item.id}</td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-lg font-bold text-primary">{item.quantity}</span>
                </td>
                <td className="px-5 py-3.5 text-center text-sm text-muted-foreground">{item.unit}</td>
                <td className="px-5 py-3.5 text-center text-sm text-muted-foreground">{item.minStock}</td>
                <td className="px-5 py-3.5 text-center">{getStockBadge(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Items Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.id}</p>
              </div>
              {getStockBadge(item)}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{item.quantity}</p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Mín. stock</p>
                <p className="text-sm font-medium text-foreground">{item.minStock}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron resultados</p>
        </div>
      )}
    </div>
  );
};

export default CategoryView;
