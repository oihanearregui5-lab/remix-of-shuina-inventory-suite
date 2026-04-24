import { useEffect, useMemo, useState } from "react";
import { Search, ClipboardList, Truck, Users, FileText, NotebookPen, Fuel, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGlobalSearch, CATEGORY_LABELS, type SearchResult, type SearchResultCategory } from "@/hooks/useGlobalSearch";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
}

const ICONS: Record<SearchResultCategory, React.ComponentType<{ className?: string }>> = {
  task: ClipboardList,
  machine: Truck,
  worker: Users,
  workReport: FileText,
  note: NotebookPen,
  fuelCard: Fuel,
};

const GlobalSearchDialog = ({ open, onOpenChange, onNavigate }: GlobalSearchDialogProps) => {
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useGlobalSearch({ query, enabled: open });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultCategory, SearchResult[]>();
    (results ?? []).forEach((r) => {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    });
    return Array.from(map.entries());
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    onNavigate(result.navigate);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar tareas, máquinas, trabajadores, partes…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length < 2 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Search className="h-6 w-6 opacity-50" />
            <p>Escribe al menos 2 caracteres para buscar.</p>
            <p className="text-xs">Atajo: ⌘K / Ctrl+K</p>
          </div>
        ) : isFetching && !results ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
          </div>
        ) : grouped.length === 0 ? (
          <CommandEmpty>Sin resultados para "{query}".</CommandEmpty>
        ) : (
          grouped.map(([category, items], index) => {
            const Icon = ICONS[category];
            return (
              <div key={category}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={CATEGORY_LABELS[category]}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle ?? ""}`}
                      onSelect={() => handleSelect(item)}
                      className="gap-3"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{item.title}</span>
                        {item.subtitle ? (
                          <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearchDialog;
