import { useMemo, useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { EquipmentAssignment, EquipmentItem } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate } from "@shared/lib/format";
import { AssignForm } from "./AssignForm";
import { ReturnDialog } from "./ReturnDialog";
import { conditionLabels } from "../lib/labels";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export function AssignmentsTab({ items }: { items: EquipmentItem[] }) {
  const { data: assignments = [] } = useAsync(() => db.equipment.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const [open, setOpen] = useState(false);
  const [showReturned, setShowReturned] = useState(false);
  const [returning, setReturning] = useState<EquipmentAssignment | null>(null);

  const sorted = useMemo(() => [...assignments]
    .filter(a => showReturned || !a.returnedAt)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
    [assignments, showReturned]);
  const pg = usePagination(sorted, 25);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={!showReturned ? "default" : "outline"} onClick={() => setShowReturned(false)}>Aktivne</Button>
          <Button size="sm" variant={showReturned ? "default" : "outline"} onClick={() => setShowReturned(true)}>Sve</Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova dodjela</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nova dodjela opreme</DialogTitle></DialogHeader><AssignForm items={items} onClose={() => setOpen(false)} /></DialogContent>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Radnik</TableHead><TableHead>Alat</TableHead><TableHead className="text-right">Kol.</TableHead><TableHead>Projekat</TableHead><TableHead>Dodjela</TableHead><TableHead>Vraćeno</TableHead><TableHead>Stanje</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema dodjela.</TableCell></TableRow>
            ) : pg.pageItems.map(it => {
              const emp = employees.find(e => e.id === it.employeeId);
              const pr = projects.find(p => p.id === it.projectId);
              return (
                <TableRow key={it.id}>
                  <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</TableCell>
                  <TableCell className="font-medium">{it.toolName}{it.itemId && <Package className="h-3 w-3 inline ml-1 text-muted-foreground" />}</TableCell>
                  <TableCell className="text-right tnum">{it.quantity || 1}</TableCell>
                  <TableCell>{pr?.name || "—"}</TableCell>
                  <TableCell>{fmtDate(it.assignedAt)}</TableCell>
                  <TableCell>{fmtDate(it.returnedAt)}</TableCell>
                  <TableCell>
                    <StatusChip tone={it.condition === "ispravno" ? "success" : it.condition === "vraceno" ? "muted" : "danger"}>
                      {conditionLabels[it.condition] || it.condition}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-right">
                    {!it.returnedAt && (
                      <Button size="sm" variant="outline" onClick={() => setReturning(it)}>Vrati</Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-1 text-destructive" onClick={async () => { if (confirm("Obrisati zapis?")) { await db.equipment.remove(it.id); bumpData(); } }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={sorted.length} itemLabel="dodjela" />
      </Card>
      {returning && <ReturnDialog assignment={returning} item={items.find(i => i.id === returning.itemId)} onClose={() => setReturning(null)} />}
    </div>
  );
}
