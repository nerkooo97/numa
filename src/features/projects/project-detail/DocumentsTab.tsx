import { useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { ProjectDocument, Phase } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, FileText, History, Upload } from "lucide-react";
import { FileLink } from "@shared/components/FileField";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";

const docKindLabels: Record<string, string> = {
  ugovor: "Ugovor", tehnicka: "Tehnička", racun: "Račun", dozvola: "Dozvola", primopredaja: "Primopredaja", ostalo: "Ostalo",
};

export function DocumentsTab({ projectId, phases }: { projectId: string; phases: Phase[] }) {
  const { user } = useAuth();
  const { data: allDocs = [] } = useAsync(() => db.projectDocuments.list());
  const docs = useMemo(() => allDocs.filter(d => d.projectId === projectId), [allDocs, projectId]);

  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [versionOf, setVersionOf] = useState<ProjectDocument | null>(null);

  // Group: parent docs + their versions
  const grouped = useMemo(() => {
    const parents = docs.filter(d => !d.parentDocumentId);
    return parents.map(p => {
      const versions = docs.filter(d => d.parentDocumentId === p.id).sort((a, b) => (b.version || 0) - (a.version || 0));
      return { parent: p, versions, latest: versions[0] || p };
    }).filter(g => {
      if (filterKind !== "all" && g.parent.kind !== filterKind) return false;
      if (filterPhase !== "all" && g.parent.phaseId !== (filterPhase === "none" ? undefined : filterPhase)) return false;
      if (search && !g.parent.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [docs, filterKind, filterPhase, search]);

  const remove = async (id: string) => {
    if (!confirm("Obrisati dokument i sve verzije?")) return;
    const versions = docs.filter(d => d.parentDocumentId === id);
    for (const v of versions) await db.projectDocuments.remove(v.id);
    await db.projectDocuments.remove(id);
    bumpData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-base">Dokumentacija ({grouped.length})</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Pretraga…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-40" />
          <Select value={filterKind} onValueChange={setFilterKind}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi tipovi</SelectItem>
              {Object.entries(docKindLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve faze</SelectItem>
              <SelectItem value="none">Bez faze</SelectItem>
              {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Dokument</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi dokument</DialogTitle></DialogHeader>
              <DocForm projectId={projectId} phases={phases} userId={user?.id} onClose={() => setOpenNew(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nema dokumenata.</p>
        ) : (
          <div className="space-y-2">
            {grouped.map(g => {
              const phase = phases.find(p => p.id === g.parent.phaseId);
              const isExpiring = g.latest.expiresAt && new Date(g.latest.expiresAt).getTime() - Date.now() < 30 * 86400000;
              return (
                <div key={g.parent.id} className="border rounded-[6px] p-3 hover:bg-muted/20 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{g.parent.name}</span>
                        <StatusChip tone="info">{docKindLabels[g.parent.kind] || g.parent.kind}</StatusChip>
                        {phase && <StatusChip tone="muted">{phase.name}</StatusChip>}
                        {g.versions.length > 0 && <StatusChip tone="muted">v{(g.latest.version || 1)}</StatusChip>}
                        {isExpiring && <StatusChip tone="warning">ističe {fmtDate(g.latest.expiresAt)}</StatusChip>}
                        {g.parent.tags?.map(t => <StatusChip key={t} tone="muted">#{t}</StatusChip>)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Dodano {fmtDate(g.parent.createdAt)} {g.versions.length > 0 && `· ${g.versions.length} verzija`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileLink fileId={g.latest.fileId} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Nova verzija" onClick={() => setVersionOf(g.parent)}>
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(g.parent.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {g.versions.length > 0 && (
                    <details className="mt-2 ml-7">
                      <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"><History className="h-3 w-3" /> Historija verzija</summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {g.versions.map(v => (
                          <div key={v.id} className="flex items-center justify-between py-1 border-t">
                            <span>v{v.version} · {fmtDate(v.createdAt)}</span>
                            <FileLink fileId={v.fileId} />
                          </div>
                        ))}
                        <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                          <span>v1 · {fmtDate(g.parent.createdAt)} (originalno)</span>
                          <FileLink fileId={g.parent.fileId} />
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!versionOf} onOpenChange={(o) => !o && setVersionOf(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova verzija — {versionOf?.name}</DialogTitle></DialogHeader>
          {versionOf && (
            <NewVersionForm parent={versionOf} userId={user?.id} existingVersions={docs.filter(d => d.parentDocumentId === versionOf.id).length}
              onClose={() => setVersionOf(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DocForm({ projectId, phases, userId, onClose }: { projectId: string; phases: Phase[]; userId?: string; onClose: () => void }) {
  const [v, setV] = useState<Partial<ProjectDocument>>({ kind: "ugovor", name: "", projectId, version: 1 });
  const [tagsStr, setTagsStr] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name && files.length === 0) { toast.error("Naziv ili fajl obavezan."); return; }
    const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean);

    const folder = `projects/${projectId}/documents/${v.kind || "ostalo"}`;
    if (files.length > 1) {
      // Multi-upload: jedan dokument po fajlu
      for (const f of files) {
        const fileId = await db.files.upload(f, folder);
        await db.projectDocuments.create({
          ...v, name: f.name, fileId, projectId, tags, uploadedBy: userId, version: 1,
        } as any);
      }
    } else {
      let fileId: string | undefined;
      if (files[0]) fileId = await db.files.upload(files[0], folder);
      await db.projectDocuments.create({
        ...v, fileId, projectId, tags, uploadedBy: userId, version: 1,
      } as any);
    }
    toast.success("Dokument(i) dodani.");
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Naziv {files.length > 1 && "(ignorisan kod multi-uploada)"}</Label><Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Tip</Label>
        <Select value={v.kind} onValueChange={(x: any) => setV({ ...v, kind: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(docKindLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Faza (opciono)</Label>
        <Select value={v.phaseId || "none"} onValueChange={(x) => setV({ ...v, phaseId: x === "none" ? undefined : x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— bez faze —</SelectItem>
            {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Rok važenja (opc)</Label><Input type="date" value={v.expiresAt || ""} onChange={e => setV({ ...v, expiresAt: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Tagovi (zarez)</Label><Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="aneks, glavni" /></div>
      <div className="space-y-1.5 col-span-2">
        <Label>Fajl(ovi) — drag & drop ili odaberi (više za bulk)</Label>
        <DropZone files={files} setFiles={setFiles} />
      </div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj{files.length > 1 ? ` (${files.length})` : ""}</Button>
      </DialogFooter>
    </form>
  );
}

function NewVersionForm({ parent, userId, existingVersions, onClose }: { parent: ProjectDocument; userId?: string; existingVersions: number; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Odaberi fajl."); return; }
    const fileId = await db.files.upload(file, `projects/${parent.projectId}/documents/${parent.kind || "ostalo"}`);
    await db.projectDocuments.create({
      projectId: parent.projectId, phaseId: parent.phaseId, kind: parent.kind, name: parent.name,
      fileId, parentDocumentId: parent.id, version: existingVersions + 2, uploadedBy: userId, tags: parent.tags,
    } as any);
    toast.success(`Nova verzija v${existingVersions + 2} dodana.`);
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">Trenutna najnovija verzija je v{existingVersions + 1}. Nova verzija će biti v{existingVersions + 2}.</p>
      <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Upload v{existingVersions + 2}</Button>
      </DialogFooter>
    </form>
  );
}

function DropZone({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}
      className={`border-2 border-dashed rounded-[6px] p-4 text-center text-sm cursor-pointer transition ${drag ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
    >
      <input type="file" multiple className="hidden" id="dz-input" onChange={e => setFiles([...files, ...Array.from(e.target.files || [])])} />
      <label htmlFor="dz-input" className="cursor-pointer block">
        <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
        Prevuci fajlove ovdje ili klikni za izbor
      </label>
      {files.length > 0 && (
        <div className="mt-3 text-left space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
              <span className="truncate">{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-destructive">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
