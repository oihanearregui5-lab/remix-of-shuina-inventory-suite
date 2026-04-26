import { lazy, Suspense, useState } from "react";
import { Truck, Droplet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MachineFleetView = lazy(() => import("@/components/MachineFleetView"));
const ConsumablesView = lazy(() => import("@/components/machines/ConsumablesView"));

const SubviewLoader = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
    ))}
  </div>
);

const MachineHub = () => {
  const [tab, setTab] = useState<string>("flota");

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="!grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="flota" className="gap-2 py-2.5">
            <Truck className="h-4 w-4" /> Flota
          </TabsTrigger>
          <TabsTrigger value="consumibles" className="gap-2 py-2.5">
            <Droplet className="h-4 w-4" /> Consumibles
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<SubviewLoader />}>
          <TabsContent value="flota" className="mt-0">
            <MachineFleetView />
          </TabsContent>
          <TabsContent value="consumibles" className="mt-0">
            <ConsumablesView />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default MachineHub;
