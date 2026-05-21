import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/data";
import { bumpData, useAsync } from "@/data/store";
import type { PermitCaseStatus } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@shared/components/ui-bits";
import { PaginationBar } from "@shared/components/PaginationBar";
import { usePagination } from "@shared/hooks/usePagination";
import { StatusChip } from "@shared/components/StatusChip";
import { PermitShell } from "../components/PermitShell";
import { canCreateCase, caseStatusLabels, caseStatusTones } from "../lib/permitMeta";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function PermitsOverviewPage() {
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: categories = [] } = useAsync(() => db.permitCategories.list());
  const { data: templates = [] } = useAsync(() => db.permitChecklistTemplates.list());
  const { data: templateItems = [] } = useAsync(() => db.permitChecklistTemplateItems.list());
  const { data: cases = [] } = useAsync(() => db.permitCases.list());
  const { data: caseItems = [] } = useAsync(() => db.permitCaseItems.list());
  const { data: itemDocuments = [] } = useAsync(() => db.permitCaseItemDocuments.list());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const foreignEmployees = employees.filter((employee) => employee.type === "strani");
  const templatesWithItems = templates.filter((template) => templateItems.some((item) => item.templateId === template.id));
  const blockReason = canCreateCase({
    foreignEmployeeCount: foreignEmployees.length,
    categoryCount: categories.length,
    templateCount: templates.length,
    activeTemplateWithItemsCount: templatesWithItems.length,
  });

  const filtered = useMemo(() => cases.filter((entry) => {
    const employee = employees.find((item) => item.id === entry.employeeId);
    const category = categories.find((item) => item.id === entry.categoryId);
    const haystack = `${employee?.firstName || ""} ${employee?.lastName || ""} ${category?.name || ""}`.toLowerCase();
    return !q || haystack.includes(q.toLowerCase());
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [cases, categories, employees, q]);

  const pagination = usePagination(filtered, 10);

  return (
    <PermitShell
      title="Pregled predmeta"
      description="Izlistani predmeti dozvola sa otvaranjem i uređivanjem kroz detalj predmeta."
      actions={<Button onClick={() => setOpen(true)} disabled={!!blockReason}><Plus className="h-4 w-4 mr-2" /> Novi predmet</Button>}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Predmeti</CardTitle>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraga po radniku ili kategoriji..." className="max-w-sm" />
        </CardHeader>
        <CardContent className="p-0">
          {blockReason && <div className="px-6 pt-2 text-sm text-muted-foreground">{blockReason}</div>}
          {pagination.total === 0 ? (
            <div className="p-6">
              <EmptyState title="Nema predmeta" description={blockReason || "Kreiraj prvi predmet kad checkliste budu spremne."} />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Radnik</TableHead><TableHead>Kategorija</TableHead><TableHead>Checklista</TableHead><TableHead>Status</TableHead><TableHead>Kompletiranost</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((entry) => {
                    const employee = employees.find((item) => item.id === entry.employeeId);
                    const category = categories.find((item) => item.id === entry.categoryId);
                    const template = templates.find((item) => item.id === entry.templateId);
                    const items = caseItems.filter((item) => item.caseId === entry.id);
                    const ready = items.filter((item) => !item.required || itemDocuments.some((link) => link.caseItemId === item.id)).length;
                    const percent = items.length === 0 ? 0 : Math.round((ready / items.length) * 100);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{employee ? `${employee.firstName} ${employee.lastName}` : "—"}</TableCell>
                        <TableCell>{category?.name || "—"}</TableCell>
                        <TableCell>{template?.name || "—"}</TableCell>
                        <TableCell><StatusChip tone={caseStatusTones[entry.status]}>{caseStatusLabels[entry.status]}</StatusChip></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 min-w-[120px] max-w-[160px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{ready} od {items.length}</span>
                              <span className="text-muted-foreground font-medium">{percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden relative border border-border/10">
                              <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${percent}%`,
                                  background: percent === 100
                                    ? "linear-gradient(90deg, #c8965a 0%, #e0b37a 100%)"
                                    : "linear-gradient(90deg, #c8965a 0%, #d8a66a 100%)"
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to={`/dozvole/predmeti/${entry.id}`}>Otvori</Link></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationBar {...pagination} itemLabel="predmeta" />
            </>
          )}
        </CardContent>
      </Card>

      <NewCaseSheet
        open={open}
        onOpenChange={setOpen}
        employees={foreignEmployees}
        categories={categories}
        templates={templatesWithItems}
        templateItems={templateItems}
        blockReason={blockReason}
      />
    </PermitShell>
  );
}

function NewCaseSheet({
  open,
  onOpenChange,
  employees,
  categories,
  templates,
  templateItems,
  blockReason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; firstName: string; lastName: string }[];
  categories: { id: string; name: string }[];
  templates: { id: string; categoryId: string; name: string }[];
  templateItems: { templateId: string; documentTypeId: string; label: string; description?: string; required: boolean; sortOrder: number; id: string }[];
  blockReason: string | null;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [notes, setNotes] = useState("");
  const status: PermitCaseStatus = "u_pripremi";

  useEffect(() => {
    if (open) {
      setEmployeeId(employees[0]?.id || "");
      setCategoryId(categories[0]?.id || "");
      setNotes("");
    }
  }, [open, employees, categories]);

  const availableTemplates = useMemo(
    () => templates.filter((template) => !categoryId || template.categoryId === categoryId),
    [categoryId, templates],
  );

  useEffect(() => {
    if (open) setTemplateId(availableTemplates[0]?.id || "");
  }, [availableTemplates, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockReason) return toast.error(blockReason);
    if (!employeeId || !categoryId || !templateId) return toast.error("Radnik, kategorija i checklista su obavezni.");
    const selectedTemplateItems = templateItems.filter((item) => item.templateId === templateId).sort((a, b) => a.sortOrder - b.sortOrder);
    if (selectedTemplateItems.length === 0) return toast.error("Odabrana checklista nema stavki.");
    const createdCase = await db.permitCases.create({ employeeId, categoryId, templateId, status, notes: notes.trim() } as any);
    for (const templateItem of selectedTemplateItems) {
      await db.permitCaseItems.create({
        caseId: createdCase.id,
        templateItemId: templateItem.id,
        documentTypeId: templateItem.documentTypeId,
        label: templateItem.label,
        description: templateItem.description,
        required: templateItem.required,
        status: "nedostaje",
        sortOrder: templateItem.sortOrder,
      } as any);
    }
    bumpData();
    onOpenChange(false);
    toast.success("Predmet je kreiran.");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>Novi predmet</SheetTitle></SheetHeader>
        {blockReason ? (
          <div className="mt-6 text-sm text-muted-foreground">{blockReason}</div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <div className="space-y-1.5">
              <Label>Strani radnik</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Odaberi radnika" /></SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategorija dozvole</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Odaberi kategoriju" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Checklista</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Odaberi checklistu" /></SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Početna napomena</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
            </div>
            <Button type="submit" className="w-full">Kreiraj predmet</Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
