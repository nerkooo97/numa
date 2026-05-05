import { Package, ArrowRightLeft } from "lucide-react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { PageHeader } from "@shared/components/ui-bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryTab } from "../components/InventoryTab";
import { AssignmentsTab } from "../components/AssignmentsTab";

export default function EquipmentPage() {
  const { data: items = [] } = useAsync(() => db.equipmentItems.list());
  const { data: assignments = [] } = useAsync(() => db.equipment.list());
  const { data: categories = [] } = useAsync(() => db.equipmentCategories.list());

  return (
    <div className="space-y-5">
      <PageHeader title="Oprema i alati" description="Inventar alata i dodjela radnicima na projekat." />
      <Tabs defaultValue="inventar">
        <TabsList>
          <TabsTrigger value="inventar"><Package className="h-4 w-4 mr-1" /> Inventar</TabsTrigger>
          <TabsTrigger value="dodjele"><ArrowRightLeft className="h-4 w-4 mr-1" /> Dodjele</TabsTrigger>
        </TabsList>
        <TabsContent value="inventar" className="mt-4"><InventoryTab items={items} categories={categories} assignments={assignments} /></TabsContent>
        <TabsContent value="dodjele" className="mt-4"><AssignmentsTab items={items} /></TabsContent>
      </Tabs>
    </div>
  );
}
