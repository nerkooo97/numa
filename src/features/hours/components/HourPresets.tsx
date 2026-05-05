import { Button } from "@/components/ui/button";

export function HourPresets({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[4, 8, 10, 12].map(h => (
        <Button key={h} type="button" size="sm" variant={value === h ? "default" : "outline"} onClick={() => onChange(h)}>{h}h</Button>
      ))}
    </div>
  );
}
