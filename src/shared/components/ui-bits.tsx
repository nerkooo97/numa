import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@shared/lib/utils";

export function StatCard({ icon: Icon, label, value, hint, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneRing: Record<string, string> = {
    primary: "bg-[hsl(var(--accent))] text-primary",
    success: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success-foreground))]",
    warning: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    danger: "bg-[hsl(var(--destructive)/0.12)] text-destructive",
  };
  return (
    <Card>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground truncate">{label}</div>
            <div className="text-[20px] sm:text-[28px] font-light tracking-[-0.02em] mt-1 sm:mt-1.5 tnum truncate">{value}</div>
            {hint && <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{hint}</div>}
          </div>
          <div className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-[6px] grid place-items-center shrink-0", toneRing[tone || "primary"])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h2 className="text-[22px] sm:text-[26px] font-light tracking-[-0.018em] text-foreground truncate">{title}</h2>
        {description && <p className="text-[13px] sm:text-[15px] text-muted-foreground mt-1 sm:mt-1.5 font-light">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 border border-dashed border-[hsl(var(--primary-soft))] rounded-[6px] bg-[hsl(var(--accent))]/40">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
