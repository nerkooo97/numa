import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtKM, fmtDate } from "@shared/lib/format";
import { TrendingDown, FileText } from "lucide-react";

export function ProjectsInRedCard({ projectsInRed }: { projectsInRed: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Projekti u minusu</CardTitle>
        <Link to="/analitika" className="text-xs text-primary hover:underline">Analitika →</Link>
      </CardHeader>
      <CardContent>
        {projectsInRed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema projekata u minusu.</p>
        ) : (
          <ul className="divide-y">
            {projectsInRed.slice(0, 6).map(x => (
              <li key={x.p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link to={`/projekti/${x.p.id}`} className="font-medium hover:underline truncate block">{x.p.name}</Link>
                  <div className="text-xs text-muted-foreground truncate">trošak {fmtKM(x.total)} / prihod {fmtKM(x.p.contractValue || 0)}</div>
                </div>
                <StatusChip tone="danger">{fmtKM(x.profit)}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ActiveProjectsCard({ activeProjects }: { activeProjects: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Aktivni projekti</CardTitle>
        <Link to="/projekti" className="text-xs text-primary hover:underline">Svi projekti →</Link>
      </CardHeader>
      <CardContent>
        {activeProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema aktivnih projekata.</p>
        ) : (
          <ul className="divide-y">
            {activeProjects.slice(0, 6).map(p => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link to={`/projekti/${p.id}`} className="font-medium hover:underline truncate block">{p.name}</Link>
                  <div className="text-xs text-muted-foreground truncate">{p.location} · {p.squareMeters} m²</div>
                </div>
                <span className="text-xs text-muted-foreground">{fmtDate(p.startDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
