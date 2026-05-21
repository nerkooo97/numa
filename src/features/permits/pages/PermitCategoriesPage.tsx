import { useEffect, useState } from "react";
import { db } from "@/data";
import { bumpData, useAsync } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@shared/components/ui-bits";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate } from "@shared/lib/format";
import { PermitShell } from "../components/PermitShell";
import { slugify } from "../lib/permitMeta";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PermitCategory } from "@/data/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function PermitCategoriesPage() {
  const { data: categories = [] } = useAsync(() => db.permitCategories.list());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PermitCategory | null>(null);

  return (
    <PermitShell
      title="Kategorije dozvola"
      description="Poslovne kategorije koje određuju vrstu predmeta i checkliste."
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Nova kategorija</Button>}
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Pregled kategorija</CardTitle></CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <EmptyState title="Nema kategorija" description="Dodaj prve kategorije prije rada na checklistama." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Naziv</TableHead><TableHead>Slug</TableHead><TableHead>Opis</TableHead><TableHead>Status</TableHead><TableHead>Kreirano</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{row.description || "—"}</TableCell>
                      <TableCell>{row.active ? <StatusChip tone="success">aktivno</StatusChip> : <StatusChip tone="muted">neaktivno</StatusChip>}</TableCell>
                      <TableCell>{fmtDate(row.createdAt)}</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setEditing(row); setOpen(true); }}>Uredi</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <CategorySheet open={open} onOpenChange={setOpen} initial={editing} />
    </PermitShell>
  );
}

function CategorySheet({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (open: boolean) => void; initial: PermitCategory | null }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    setName(initial?.name || "");
    setSlug(initial?.slug || "");
    setDescription(initial?.description || "");
    setActive(initial?.active ?? true);
  }, [initial, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Naziv kategorije je obavezan.");
    const payload = { name: name.trim(), slug: slugify(slug || name), description: description.trim(), active };
    if (initial) {
      await db.permitCategories.update(initial.id, payload as any);
      toast.success("Kategorija je ažurirana.");
    } else {
      await db.permitCategories.create(payload as any);
      toast.success("Kategorija je dodana.");
    }
    bumpData();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{initial ? "Uredi kategoriju" : "Nova kategorija"}</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="space-y-3 mt-6">
          <div className="space-y-1.5"><Label>Naziv</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || "radna_dozvola"} /></div>
          <div className="space-y-1.5"><Label>Opis</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></div>
          <div className="flex items-center gap-2"><Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} id="category-active" /><Label htmlFor="category-active">Aktivno</Label></div>
          <Button type="submit" className="w-full">Sačuvaj kategoriju</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
