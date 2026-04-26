import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TonnageRegisterTrip from "@/components/tonnage/TonnageRegisterTrip";
import TonnageMyTrips from "@/components/tonnage/TonnageMyTrips";

const TonnageTripsView = () => {
  const [tab, setTab] = useState<"register" | "list">("register");
  const today = new Date();

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Toneladas"
        title="Viajes del día"
        description={format(today, "EEEE d 'de' MMMM", { locale: es })}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "register" | "list")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Registrar</TabsTrigger>
          <TabsTrigger value="list">Viajes de hoy</TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="mt-4">
          <TonnageRegisterTrip />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <TonnageMyTrips />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TonnageTripsView;
