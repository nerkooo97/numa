import { useState } from "react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { EquipmentAssignment, EquipmentItem } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function ReturnDialog({ assignment, item, onClose }: { assignment: EquipmentAssignment; item?: EquipmentItem; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [condition, setCondition] = useState<"vraceno" | "ostecено" | "izgubljeno">("vraceno");
  const [notes, setNotes] = useState("");
  const [writeOff, setWriteOff] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.equipment.update(assignment.id, { returnedAt: date, condition, notes: notes || assignment.notes } as any);
    if (writeOff && item && (condition === "ostecено" || condition === "izgubljeno")) {
      const qty = assignment.quantity || 1;
      const newQty = Math.max(0, item.quantity - qty);
      await db.equipmentItems.update(item.id, { quantity: newQty } as any);
      toast.success(`Vraćeno i otpisano ${qty} kom iz inventara.`);
    } else {
      toast.success("Zapis vraćanja sačuvan.");
    }
    bumpData(); onClose();
  };

  const showWriteOff = item && (condition === "ostecено" || condition === "izgubljeno");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vraćanje: {assignment.toolName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Količina: {assignment.quantity || 1}</p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Datum vraćanja *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          <div className="space-y-1.5">
            <Label>Stanje *</Label>
            <Select value={condition} onValueChange={(x: any) => setCondition(x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vraceno">Vraćeno ispravno</SelectItem>
                <SelectItem value="ostecено">Oštećeno</SelectItem>
                <SelectItem value="izgubljeno">Izgubljeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Napomena</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="npr. polomljena drška" /></div>
          {showWriteOff && (
            <label className="flex items-start gap-2 text-sm border rounded-[6px] p-3 bg-warning/5 cursor-pointer">
              <input type="checkbox" checked={writeOff} onChange={e => setWriteOff(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="font-medium">Otpiši iz inventara</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Smanjuje ukupnu količinu artikla "{item!.name}" za {assignment.quantity || 1} kom.</span>
              </span>
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
            <Button type="submit">Sačuvaj</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
