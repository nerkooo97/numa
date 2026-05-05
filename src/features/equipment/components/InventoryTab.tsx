import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, History, Tag } from "lucide-react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { EquipmentAssignment, EquipmentItem, EquipmentCategory } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtKM } from "@shared/lib/format";
import { CategoriesManager } from "./CategoriesManager";
import { ItemForm } from "./ItemForm";
import { HistoryDialog } from "./HistoryDialog";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export function InventoryTab({ items, categories, assignments }: { items: EquipmentItem[]; categories: EquipmentCategory[]; assignments: EquipmentAssignment[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<EquipmentItem | null>(null);
  const [history, setHistory] = useState<EquipmentItem | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showCats, setShowCats] = useState(false);

  const assignedQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (!a.itemId || a.returnedAt) continue;
      m.set(a.itemId, (m.get(a.itemId) || 0) + (a.quantity || 1));
    }
    return m;
  }, [assignments]);

  const filtered = filter === "all" ? items : filter === "none" ? items.filter(i => !i.categoryId) : items.filter(i => i.categoryId === filter);
  const pg = usePagination(filtered, 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Sve</Button>
          {categories.map(c => (
            <Button key={c.id} size="sm" variant={filter === c.id ? "default" : "outline"} onClick={() => setFilter(c.id)}>{c.name}</Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setShowCats(s => !s)}><Tag className="h-4 w-4 mr-1" /> {showCats ? "Sakrij" : "Uredi"} kategorije</Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novi alat</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Novi alat u inventar</DialogTitle></DialogHeader><ItemForm categories={categories} onClose={() => setOpen(false)} /></DialogContent>
        </Dialog>
      </div>

      {showCats && (
        <Card className="p-4"><CategoriesManager categories={categories} /></Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naziv</TableHead><TableHead>SKU</TableHead><TableHead>Kategorija</TableHead>
              <TableHead>Lokacija</TableHead>
              <TableHead className="text-right">Ukupno</TableHead><TableHead className="text-right">Dodijeljeno</TableHead><TableHead className="text-right">Slobodno</TableHead>
              <TableHead className="text-right">Vrijednost</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nema artikala u inventaru.</TableCell></TableRow>
              : pg.pageItems.map(it => {
                const out = assignedQty.get(it.id) || 0;
                const free = it.quantity - out;
                const cat = categories.find(c => c.id === it.categoryId);
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      <button className="hover:underline text-left" onClick={() => setHistory(it)}>{it.name}</button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{it.sku || "—"}</TableCell>
                    <TableCell>{cat?.name || "—"}</TableCell>
                    <TableCell>{it.location || "—"}</TableCell>
                    <TableCell className="text-right tnum">{it.quantity}</TableCell>
                    <TableCell className="text-right tnum">{out}</TableCell>
                    <TableCell className="text-right tnum">
                      <StatusChip tone={free === 0 ? "danger" : free < it.quantity * 0.2 ? "warning" : "success"}>{free}</StatusChip>
                    </TableCell>
                    <TableCell className="text-right tnum">{fmtKM((it.unitValue || 0) * it.quantity)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Istorija" onClick={() => setHistory(it)}><History className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Uredi" onClick={() => setEdit(it)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Obrisati artikal?")) { await db.equipmentItems.remove(it.id); bumpData(); } }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={filtered.length} itemLabel="artikala" />
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Uredi alat</DialogTitle></DialogHeader>
          {edit && <ItemForm item={edit} categories={categories} onClose={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
      {history && <HistoryDialog item={history} assignments={assignments} onClose={() => setHistory(null)} />}
    </div>
  );
}
