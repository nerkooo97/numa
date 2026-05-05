import { useEffect, useState } from "react";
import { db } from "@/data";
import { Button } from "@/components/ui/button";
import { Download, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { bumpData } from "@/data/store";

export function FileField({ value, onChange, label = "Fajl", folder }: { value?: string; onChange: (id?: string) => void; label?: string; folder?: string }) {
  const [meta, setMeta] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!value) { setMeta(null); return; }
    db.files.getMeta(value).then(m => setMeta(m ? { name: m.name } : null));
  }, [value]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const id = await db.files.upload(f, folder);
    onChange(id);
    bumpData();
  };

  const open = async () => {
    if (!value) return;
    const url = await db.files.getUrl(value);
    if (url) window.open(url, "_blank");
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <button type="button" onClick={open} className="underline truncate max-w-[200px]" title={meta?.name}>{(meta?.name || "Fajl").split("/").pop()}</button>
        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(undefined)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Input type="file" onChange={handleFile} className="max-w-xs" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function FileLink({ fileId }: { fileId?: string }) {
  const [meta, setMeta] = useState<{ name: string } | null>(null);
  useEffect(() => {
    if (!fileId) { setMeta(null); return; }
    db.files.getMeta(fileId).then(m => setMeta(m ? { name: m.name } : null));
  }, [fileId]);
  if (!fileId) return <span className="text-muted-foreground text-xs">—</span>;
  const open = async () => {
    const url = await db.files.getUrl(fileId);
    if (url) window.open(url, "_blank");
  };
  return (
    <button type="button" onClick={open} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
      <Download className="h-3.5 w-3.5" />
      <span className="truncate max-w-[160px]" title={meta?.name}>{(meta?.name || "fajl").split("/").pop()}</span>
    </button>
  );
}
