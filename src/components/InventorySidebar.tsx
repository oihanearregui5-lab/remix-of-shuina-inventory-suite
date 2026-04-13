import { Package, LayoutDashboard, Clock, ShieldCheck, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { categories } from "@/data/inventory";
import { useAuth } from "@/hooks/useAuth";

interface InventorySidebarProps {
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentSection: "inventory" | "fichajes" | "admin";
  onSectionChange: (section: "inventory" | "fichajes" | "admin") => void;
}

const InventorySidebar = ({
  selectedCategory,
  onSelectCategory,
  collapsed,
  onToggleCollapse,
  currentSection,
  onSectionChange,
}: InventorySidebarProps) => {
  const { isAdmin, profile, signOut } = useAuth();

  return (
    <aside
      className={`h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground tracking-wider text-lg">SUHI</span>
              <span className="font-bold text-primary tracking-wider text-lg">NA</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {/* Sections */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Secciones
            </span>
          </div>
        )}

        <button
          onClick={() => { onSectionChange("inventory"); onSelectCategory(null); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
            currentSection === "inventory"
              ? "text-primary bg-sidebar-accent"
              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Inventario</span>}
        </button>

        <button
          onClick={() => onSectionChange("fichajes")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
            currentSection === "fichajes"
              ? "text-primary bg-sidebar-accent"
              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Clock className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Fichajes</span>}
        </button>

        {isAdmin && (
          <button
            onClick={() => onSectionChange("admin")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
              currentSection === "admin"
                ? "text-primary bg-sidebar-accent"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Admin Fichajes</span>}
          </button>
        )}

        {/* Categories (only when inventory selected) */}
        {currentSection === "inventory" && (
          <>
            {!collapsed && (
              <div className="px-4 mt-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categorías
                </span>
              </div>
            )}

            <button
              onClick={() => onSelectCategory(null)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                selectedCategory === null && currentSection === "inventory"
                  ? "text-primary bg-sidebar-accent"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>Panel General</span>}
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  selectedCategory === cat.id
                    ? "text-primary bg-sidebar-accent border-r-2 border-primary"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <span className="text-lg flex-shrink-0">{cat.icon}</span>
                {!collapsed && <span className="truncate">{cat.name}</span>}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer with user info */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name ?? "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground">SUHINA v1.0</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default InventorySidebar;
