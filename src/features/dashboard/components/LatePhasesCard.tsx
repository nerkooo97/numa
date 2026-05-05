import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@shared/components/StatusChip";
import { Clock } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

export function LatePhasesCard({ latePhases, projects }: { latePhases: any[]; projects: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Faze koje kasne</CardTitle>
        <Link to="/projekti" className="text-xs text-primary hover:underline">Svi projekti →</Link>
      </CardHeader>
      <CardContent>
        {latePhases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sve faze su u planu.</p>
        ) : (
          <ul className="divide-y">
            {latePhases.slice(0, 6).map(ph => {
              const project = projects.find(p => p.id === ph.projectId);
              const real = differenceInCalendarDays(ph.endDate ? new Date(ph.endDate) : new Date(), new Date(ph.startDate!));
              const over = real - (ph.plannedDays || 0);
              return (
                <li key={ph.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link to={`/projekti/${ph.projectId}`} className="font-medium hover:underline truncate block">{ph.name}</Link>
                    <div className="text-xs text-muted-foreground truncate">{project?.name} · plan {ph.plannedDays}d / stvarno {real}d</div>
                  </div>
                  <StatusChip tone="danger">+{over}d</StatusChip>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
