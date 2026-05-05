import { cn } from "@shared/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const toneClasses: Record<Tone, string> = {
  success: "bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success-foreground))] border-[hsl(var(--success)/0.35)]",
  warning: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]",
  danger: "bg-[hsl(var(--destructive)/0.12)] text-destructive border-[hsl(var(--destructive)/0.3)]",
  info: "bg-[hsl(var(--accent))] text-primary border-[hsl(var(--primary-soft))]",
  muted: "bg-secondary text-muted-foreground border-border",
};

export function StatusChip({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-[4px] border px-1.5 py-[1px] text-[11px] font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
