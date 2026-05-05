import { useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { EquipmentAssignment, EquipmentItem } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function AssignForm({ items, onClose }: { items: EquipmentItem[]; onClose: () => void }) {
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: assignments = [] } = useAsync(() => db.equipment.list());
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<EquipmentAssignment>>({ assignedAt: today, condition: "ispravno", quantity: 1 });
  const [useInventory, setUseInventory] = useState(true);

  const item = items.find(i => i.id === v.itemId);
  const out = useMemo(() => {
    if (!v.itemId) return 0;
    return assignments.filter(a => a.itemId === v.itemId && !a.returnedAt).reduce((s, a) => s + (a.quantity || 1), 0);
  }, [v.itemId, assignments]);
  const free = item ? item.quantity - out : 0;
  const exceeds = item && (v.quantity || 1) > free;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.employeeId) { toast.error("Odaberi radnika."); return; }
    if (useInventory) {
      if (!v.itemId) { toast.error("Odaberi alat iz inventara."); return; }
      if (exceeds) { toast.error(`Slobodno samo ${free} kom.`); return; }
      await db.equipment.create({ ...v, toolName: item!.name } as any);
    } else {
      if (!v.toolName) { toast.error("Upiši naziv alata."); return; }
      await db.equipment.create({ ...v, itemId: undefined } as any);
    }
    toast.success("Dodjela zapisana.");
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="col-span-2 flex gap-1.5">
        <Button type="button" size="sm" variant={useInventory ? "default" : "outline"} onClick={() => setUseInventory(true)}>Iz inventara</Button>
        <Button type="button" size="sm" variant={!useInventory ? "default" : "outline"} onClick={() => setUseInventory(false)}>Free-text</Button>
      </div>

      {useInventory ? (
        <div className="space-y-1.5 col-span-2">
          <Label>Alat *</Label>
          <Select value={v.itemId} onValueChange={(x) => setV({ ...v, itemId: x })}>
            <SelectTrigger><SelectValue placeholder="Odaberi iz inventara" /></SelectTrigger>
            <SelectContent>
              {items.filter(i => i.active).map(i => {
                const used = assignments.filter(a => a.itemId === i.id && !a.returnedAt).reduce((s, a) => s + (a.quantity || 1), 0);
                const f = i.quantity - used;
                return <SelectItem key={i.id} value={i.id} disabled={f <= 0}>{i.name} ({f}/{i.quantity} slobodno)</SelectItem>;
              })}
            </SelectContent>
          </Select>
          {item && <p className="text-xs text-muted-foreground">Slobodno: {free} / {item.quantity} kom</p>}
        </div>
      ) : (
        <div className="space-y-1.5 col-span-2"><Label>Naziv alata *</Label><Input value={v.toolName || ""} onChange={e => setV({ ...v, toolName: e.target.value })} required /></div>
      )}

      <div className="space-y-1.5">
        <Label>Radnik *</Label>
        <Select value={v.employeeId} onValueChange={(x) => setV({ ...v, employeeId: x })}>
          <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
          <SelectContent>{employees.filter(e => e.active).map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Projekat</Label>
        <Select value={v.projectId} onValueChange={(x) => setV({ ...v, projectId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Količina</Label><Input type="number" min="1" value={v.quantity ?? 1} onChange={e => setV({ ...v, quantity: parseInt(e.target.value) || 1 })} /></div>
      <div className="space-y-1.5"><Label>Datum dodjele</Label><Input type="date" value={v.assignedAt} onChange={e => setV({ ...v, assignedAt: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Napomena</Label><Input value={v.notes || ""} onChange={e => setV({ ...v, notes: e.target.value })} /></div>
      {exceeds && <p className="col-span-2 text-xs text-destructive">Tražena količina premašuje slobodno stanje.</p>}
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit" disabled={!!exceeds}>Dodijeli</Button>
      </DialogFooter>
    </form>
  );
}
