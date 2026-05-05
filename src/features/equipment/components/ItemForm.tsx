import { useState } from "react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { EquipmentItem, EquipmentCategory } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function ItemForm({ item, categories, onClose }: { item?: EquipmentItem; categories: EquipmentCategory[]; onClose: () => void }) {
  const [v, setV] = useState<Partial<EquipmentItem>>(item || { quantity: 1, active: true });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name) { toast.error("Naziv je obavezan."); return; }
    if (item) await db.equipmentItems.update(item.id, v as any);
    else await db.equipmentItems.create({ ...v, active: true } as any);
    toast.success("Sačuvano.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Naziv *</Label><Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>SKU / Šifra</Label><Input value={v.sku || ""} onChange={e => setV({ ...v, sku: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Kategorija</Label>
        <Select value={v.categoryId || "none"} onValueChange={(x) => setV({ ...v, categoryId: x === "none" ? undefined : x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— bez kategorije —</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Količina *</Label><Input type="number" min="1" value={v.quantity ?? 1} onChange={e => setV({ ...v, quantity: parseInt(e.target.value) || 1 })} required /></div>
      <div className="space-y-1.5"><Label>Cijena/kom (KM)</Label><Input type="number" step="0.01" value={v.unitValue ?? 0} onChange={e => setV({ ...v, unitValue: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Lokacija / skladište</Label><Input value={v.location || ""} onChange={e => setV({ ...v, location: e.target.value })} placeholder="npr. Magacin A" /></div>
      <div className="space-y-1.5 col-span-2"><Label>Napomena</Label><Input value={v.notes || ""} onChange={e => setV({ ...v, notes: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
