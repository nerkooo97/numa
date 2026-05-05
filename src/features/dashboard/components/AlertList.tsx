import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export type Alert = { tone: "danger" | "warning"; title: string; link: string };

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {alerts.map((a, i) => (
        <Link key={i} to={a.link} className={`flex items-center gap-3 p-3 rounded-[6px] border transition hover:shadow-sm ${
          a.tone === "danger"
            ? "border-destructive/30 bg-[hsl(var(--destructive)/0.08)]"
            : "border-warning/40 bg-[hsl(var(--warning)/0.12)]"
        }`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${a.tone === "danger" ? "text-destructive" : "text-warning"}`} />
          <span className="text-sm font-medium">{a.title}</span>
        </Link>
      ))}
    </div>
  );
}
