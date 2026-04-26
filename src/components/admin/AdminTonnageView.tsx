import { useState } from "react";
import { BarChart3, MapPinned, Table, Truck } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TonnageDashboard from "@/components/tonnage/TonnageDashboard";
import TonnageMonthlyTable from "@/components/tonnage/TonnageMonthlyTable";
import TonnageZoneTracking from "@/components/tonnage/TonnageZoneTracking";
import TonnageTrucksManager from "@/components/tonnage/TonnageTrucksManager";

type TonnageAdminTab = "dashboard" | "table" | "zones" | "trucks";

const AdminTonnageView = () => {
  const [tab, setTab] = useState<TonnageAdminTab>("dashboard");

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Toneladas"
        title="Panel administración"
        description="Resumen, tabla mensual, seguimiento por zonas y configuración de camiones."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TonnageAdminTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Tabla mensual</span>
            <span className="sm:hidden">Tabla</span>
          </TabsTrigger>
          <TabsTrigger value="zones" className="gap-2">
            <MapPinned className="h-4 w-4" />
            <span>Zonas</span>
          </TabsTrigger>
          <TabsTrigger value="trucks" className="gap-2">
            <Truck className="h-4 w-4" />
            <span>Camiones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <TonnageDashboard />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <TonnageMonthlyTable />
        </TabsContent>
        <TabsContent value="zones" className="mt-4">
          <TonnageZoneTracking />
        </TabsContent>
        <TabsContent value="trucks" className="mt-4">
          <TonnageTrucksManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTonnageView;
