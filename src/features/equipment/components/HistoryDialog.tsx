import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import type { EquipmentAssignment, EquipmentItem } from "@/data/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate } from "@shared/lib/format";
import { conditionLabels } from "../lib/labels";

export function HistoryDialog({ item, assignments, onClose }: { item: EquipmentItem; assignments: EquipmentAssignment[]; onClose: () => void }) {
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const list = useMemo(() => assignments.filter(a => a.itemId === item.id).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)), [assignments, item.id]);

  const out = list.filter(a => !a.returnedAt).reduce((s, a) => s + (a.quantity || 1), 0);
  const damaged = list.filter(a => a.condition === "ostecено").reduce((s, a) => s + (a.quantity || 1), 0);
  const lost = list.filter(a => a.condition === "izgubljeno").reduce((s, a) => s + (a.quantity || 1), 0);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Istorija: {item.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Ukupno: {item.quantity} · Trenutno kod radnika: {out} · Oštećeno: {damaged} · Izgubljeno: {lost}
          </p>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Radnik</TableHead><TableHead>Projekat</TableHead><TableHead className="text-right">Kol.</TableHead><TableHead>Dodjela</TableHead><TableHead>Vraćeno</TableHead><TableHead>Stanje</TableHead><TableHead>Napomena</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema istorije.</TableCell></TableRow>
                : list.map(a => {
                  const emp = employees.find(e => e.id === a.employeeId);
                  const pr = projects.find(p => p.id === a.projectId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</TableCell>
                      <TableCell>{pr?.name || "—"}</TableCell>
                      <TableCell className="text-right tnum">{a.quantity || 1}</TableCell>
                      <TableCell>{fmtDate(a.assignedAt)}</TableCell>
                      <TableCell>{fmtDate(a.returnedAt)}</TableCell>
                      <TableCell>
                        <StatusChip tone={a.condition === "ispravno" ? "success" : a.condition === "vraceno" ? "muted" : "danger"}>
                          {conditionLabels[a.condition] || a.condition}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.notes || "—"}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
