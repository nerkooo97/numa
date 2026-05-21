import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "@/data";
import { bumpData, useAsync } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@shared/components/ui-bits";
import { PermitShell } from "../components/PermitShell";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PermitTemplateDetailPage() {
  const { id = "" } = useParams();
  const { data: templates = [] } = useAsync(() => db.permitChecklistTemplates.list(), [id]);
  const { data: categories = [] } = useAsync(() => db.permitCategories.list(), [id]);
  const { data: documentTypes = [] } = useAsync(() => db.permitDocumentTypes.list(), [id]);
  const { data: allItems = [] } = useAsync(() => db.permitChecklistTemplateItems.list(), [id]);
  const template = templates.find((entry) => entry.id === id);
  const items = useMemo(() => allItems.filter((entry) => entry.templateId === id).sort((a, b) => a.sortOrder - b.sortOrder), [allItems, id]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!template) {
    return (
      <PermitShell title="Checklista" description="Detalj predloška.">
        <EmptyState title="Checklista nije pronađena" description="Provjeri URL ili se vrati na listu checklisti." action={<Button asChild variant="outline"><Link to="/dozvole/checkliste">Nazad na checkliste</Link></Button>} />
      </PermitShell>
    );
  }

  const category = categories.find((entry) => entry.id === template.categoryId);

  return (
    <PermitShell
      title={template.name}
      description={template.description || "Uređivanje stavki checkliste i njihovih pravila."}
      actions={
        <>
          <Button onClick={() => { setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Dodaj stavku</Button>
          <Button asChild variant="outline"><Link to="/dozvole/checkliste"><ArrowLeft className="h-4 w-4 mr-2" /> Nazad</Link></Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stavke checkliste</CardTitle>
            <div className="text-sm text-muted-foreground">
              Kategorija: <span className="text-foreground">{category?.name || "—"}</span>. Stavka se dodaje izborom postojećeg tipa dokumenta.
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState title="Nema stavki" description="Dodaj stavke koje će se automatski kopirati u nove predmete." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>#</TableHead><TableHead>Naziv</TableHead><TableHead>Tip dokumenta</TableHead><TableHead>Opis</TableHead><TableHead>Obavezno</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const documentType = documentTypes.find((entry) => entry.id === item.documentTypeId);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.sortOrder}</TableCell>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{documentType?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                        <TableCell>{item.required ? "Da" : "Ne"}</TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setEditingId(item.id); setOpen(true); }}>Uredi</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <TemplateItemSheet
        open={open}
        onOpenChange={setOpen}
        templateId={template.id}
        items={items}
        documentTypes={documentTypes}
        initialItem={items.find((item) => item.id === editingId) || null}
      />
    </PermitShell>
  );
}

function TemplateItemSheet({
  open,
  onOpenChange,
  templateId,
  items,
  documentTypes,
  initialItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  items: Array<{ id: string; documentTypeId: string; required: boolean }>;
  documentTypes: Array<{ id: string; name: string; description?: string }>;
  initialItem: { id: string; documentTypeId: string; required: boolean } | null;
}) {
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [required, setRequired] = useState(true);

  useEffect(() => {
    setDocumentTypeId(initialItem?.documentTypeId || documentTypes[0]?.id || "");
    setRequired(initialItem?.required ?? true);
  }, [initialItem, documentTypes, open]);

  const selectedDocumentType = documentTypes.find((entry) => entry.id === documentTypeId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentTypeId) return toast.error("Tip dokumenta je obavezan.");
    if (!selectedDocumentType) return toast.error("Odabrani tip dokumenta nije pronađen.");
    const payload = {
      documentTypeId,
      label: selectedDocumentType.name,
      description: selectedDocumentType.description || "",
      required,
    };
    if (initialItem) {
      await db.permitChecklistTemplateItems.update(initialItem.id, payload as any);
      toast.success("Stavka je ažurirana.");
    } else {
      await db.permitChecklistTemplateItems.create({
        templateId,
        ...payload,
        sortOrder: items.length + 1,
      } as any);
      toast.success("Stavka je dodana.");
    }
    bumpData();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{initialItem ? "Uredi stavku" : "Dodaj stavku"}</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label>Tip dokumenta</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
              <SelectTrigger><SelectValue placeholder="Odaberi tip dokumenta" /></SelectTrigger>
              <SelectContent>
                {documentTypes.map((documentType) => <SelectItem key={documentType.id} value={documentType.id}>{documentType.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedDocumentType && (
            <div className="rounded-[6px] border bg-muted/20 px-3 py-2 text-sm">
              <div className="font-medium">{selectedDocumentType.name}</div>
              <div className="text-muted-foreground">{selectedDocumentType.description || "Bez opisa."}</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={required} onCheckedChange={(v) => setRequired(v === true)} id="item-required" />
            <Label htmlFor="item-required">Obavezna stavka</Label>
          </div>
          <Button type="submit" className="w-full">{initialItem ? "Sačuvaj izmjene" : "Dodaj stavku"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
