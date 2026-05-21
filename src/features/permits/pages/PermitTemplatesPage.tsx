import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/data";
import { bumpData, useAsync } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@shared/components/ui-bits";
import { StatusChip } from "@shared/components/StatusChip";
import { PermitShell } from "../components/PermitShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PermitChecklistTemplate } from "@/data/types";
import { canCreateTemplate } from "../lib/permitMeta";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function PermitTemplatesPage() {
  const { data: categories = [] } = useAsync(() => db.permitCategories.list());
  const { data: documentTypes = [] } = useAsync(() => db.permitDocumentTypes.list());
  const { data: templates = [] } = useAsync(() => db.permitChecklistTemplates.list());
  const { data: templateItems = [] } = useAsync(() => db.permitChecklistTemplateItems.list());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PermitChecklistTemplate | null>(null);

  const blockReason = canCreateTemplate(categories.length, documentTypes.length);
  const filteredTemplates = useMemo(() => templates.map((template) => ({
    ...template,
    itemCount: templateItems.filter((item) => item.templateId === template.id).length,
  })), [templateItems, templates]);

  return (
    <PermitShell
      title="Checkliste"
      description="Predlošci priloga koji se kasnije koriste za kreiranje predmeta."
      actions={<Button onClick={() => { setEditing(null); setOpen(true); }} disabled={!!blockReason}><Plus className="h-4 w-4 mr-2" /> Nova checklista</Button>}
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Pregled checklisti</CardTitle></CardHeader>
          <CardContent>
            {blockReason && <div className="mb-4 text-sm text-muted-foreground">{blockReason}</div>}
            {filteredTemplates.length === 0 ? (
              <EmptyState title="Nema checklisti" description={blockReason || "Kreiraj prvu checklistu za odabranu kategoriju."} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Naziv</TableHead><TableHead>Kategorija</TableHead><TableHead>Opis</TableHead><TableHead>Stavke</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const category = categories.find((entry) => entry.id === template.categoryId);
                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{category?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{template.description || "—"}</TableCell>
                        <TableCell>{template.itemCount}</TableCell>
                        <TableCell>{template.active ? <StatusChip tone="success">aktivna</StatusChip> : <StatusChip tone="muted">neaktivna</StatusChip>}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditing(template); setOpen(true); }}>Uredi</Button>
                          <Button asChild variant="outline" size="sm"><Link to={`/dozvole/checkliste/${template.id}`}>Stavke</Link></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <TemplateSheet open={open} onOpenChange={setOpen} initial={editing} categories={categories} blockReason={blockReason} />
    </PermitShell>
  );
}

function TemplateSheet({
  open,
  onOpenChange,
  initial,
  categories,
  blockReason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PermitChecklistTemplate | null;
  categories: { id: string; name: string }[];
  blockReason: string | null;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    setCategoryId(initial?.categoryId || categories[0]?.id || "");
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setActive(initial?.active ?? true);
  }, [initial, categories, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockReason && !initial) return toast.error(blockReason);
    if (!categoryId || !name.trim()) return toast.error("Kategorija i naziv checkliste su obavezni.");
    const payload = { categoryId, name: name.trim(), description: description.trim(), active };
    if (initial) {
      await db.permitChecklistTemplates.update(initial.id, payload as any);
      toast.success("Checklista je ažurirana.");
    } else {
      await db.permitChecklistTemplates.create(payload as any);
      toast.success("Checklista je dodana.");
    }
    bumpData();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{initial ? "Uredi checklistu" : "Nova checklista"}</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="space-y-3 mt-6">
          <div className="space-y-1.5">
            <Label>Kategorija dozvole</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Odaberi kategoriju" /></SelectTrigger>
              <SelectContent>
                {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Naziv</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Opis</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></div>
          <div className="flex items-center gap-2"><Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} id="template-active" /><Label htmlFor="template-active">Aktivno</Label></div>
          {blockReason && !initial && <p className="text-sm text-muted-foreground">{blockReason}</p>}
          <Button type="submit" className="w-full" disabled={!!blockReason && !initial}>Sačuvaj checklistu</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
