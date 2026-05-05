import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate } from "@shared/lib/format";
import { docStatus, daysUntil } from "@shared/lib/format";
import { AlertTriangle } from "lucide-react";

export function ExpiringDocsCard({ expiring, employees }: { expiring: any[]; employees: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Dokumenti — istek</CardTitle>
        <Link to="/zaposleni" className="text-xs text-primary hover:underline">Svi zaposleni →</Link>
      </CardHeader>
      <CardContent>
        {expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema dokumenata pri isteku.</p>
        ) : (
          <ul className="divide-y">
            {expiring.slice(0, 6).map(d => {
              const emp = employees.find(e => e.id === d.employeeId);
              const days = daysUntil(d.expiresAt);
              const s = docStatus(d.expiresAt);
              return (
                <li key={d.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.name} · ističe {fmtDate(d.expiresAt)}</div>
                  </div>
                  <StatusChip tone={s === "expired" ? "danger" : "warning"}>
                    {s === "expired" ? `istekao ${Math.abs(days || 0)}d` : `${days}d`}
                  </StatusChip>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
