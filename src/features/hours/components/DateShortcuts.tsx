import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today, yesterday } from "../lib/dates";

export function DateShortcuts({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      <Button type="button" size="sm" variant={value === today() ? "default" : "outline"} onClick={() => onChange(today())}>Danas</Button>
      <Button type="button" size="sm" variant={value === yesterday() ? "default" : "outline"} onClick={() => onChange(yesterday())}>Juče</Button>
      <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className="h-9 w-auto" />
    </div>
  );
}
