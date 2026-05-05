import { useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { PageHeader } from "@shared/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@shared/lib/format";
import { History } from "lucide-react";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export default function AuditLogPage() {
  const { data: logs = [] } = useAsync(() => db.audit.list());
  const [q, setQ] = useState("");

  const sorted = useMemo(
    () => [...logs].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [logs],
  );
  const filtered = sorted.filter(l =>
    !q || `${l.userName} ${l.action} ${l.entity} ${l.details || ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const pg = usePagination(filtered, 50);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aktivnosti"
        description="Hronološki zapis radnji korisnika u sistemu."
      />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraga po korisniku, akciji, entitetu..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vrijeme</TableHead>
                <TableHead>Korisnik</TableHead>
                <TableHead>Akcija</TableHead>
                <TableHead>Entitet</TableHead>
                <TableHead>Detalji</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nema zapisa.</TableCell></TableRow>
              ) : pg.pageItems.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="tnum text-xs">{fmtDateTime(l.at)}</TableCell>
                  <TableCell className="font-medium">{l.userName}</TableCell>
                  <TableCell><code className="text-xs">{l.action}</code></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="text-xs">{l.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar {...pg} total={filtered.length} itemLabel="zapisa" />
        </CardContent>
      </Card>
    </div>
  );
}
