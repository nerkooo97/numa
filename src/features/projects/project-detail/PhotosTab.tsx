import { useEffect, useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Phase, ProjectPhoto } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { fmtDate } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";

export function PhotosTab({ projectId, phases }: { projectId: string; phases: Phase[] }) {
  const { user } = useAuth();
  const { data: all = [] } = useAsync(() => db.photos.list());
  const photos = useMemo(() => all.filter(p => p.projectId === projectId).sort((a, b) => b.takenAt.localeCompare(a.takenAt)), [all, projectId]);
  const [open, setOpen] = useState(false);
  const [filterPhase, setFilterPhase] = useState("all");

  const filtered = filterPhase === "all" ? photos : photos.filter(p => p.phaseId === filterPhase);
  const remove = async (id: string) => { if (confirm("Obrisati fotografiju?")) { await db.photos.remove(id); bumpData(); } };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base">Galerija napretka radova ({photos.length})</CardTitle>
        <div className="flex gap-2">
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve faze</SelectItem>
              {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Slike</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload fotografija</DialogTitle></DialogHeader>
              <UploadForm projectId={projectId} phases={phases} userId={user?.id} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nema fotografija. Upload-uj slike sa terena.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(p => <PhotoCard key={p.id} photo={p} phases={phases} onRemove={() => remove(p.id)} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhotoCard({ photo, phases, onRemove }: { photo: ProjectPhoto; phases: Phase[]; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { db.files.getUrl(photo.fileId).then(setUrl); }, [photo.fileId]);
  const phase = phases.find(p => p.id === photo.phaseId);
  return (
    <div className="group relative border rounded-[6px] overflow-hidden bg-muted">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={photo.caption || ""} className="w-full h-40 object-cover" />
        </a>
      ) : <div className="w-full h-40 grid place-items-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
      <div className="p-2 text-xs">
        <div className="font-medium truncate">{photo.caption || "—"}</div>
        <div className="text-muted-foreground flex justify-between mt-0.5">
          <span>{fmtDate(photo.takenAt)}</span>
          {phase && <span className="truncate ml-2">{phase.name}</span>}
        </div>
      </div>
      <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 bg-background/80 opacity-0 group-hover:opacity-100 text-destructive" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function UploadForm({ projectId, phases, userId, onClose }: { projectId: string; phases: Phase[]; userId?: string; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [phaseId, setPhaseId] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { toast.error("Odaberi slike."); return; }
    for (const f of files) {
      const fileId = await db.files.upload(f, `projects/${projectId}/photos${phaseId ? "/" + phaseId : ""}`);
      await db.photos.create({
        projectId, phaseId, fileId, caption, takenAt: date, uploadedBy: userId,
      } as any);
    }
    toast.success(`${files.length} slika upload-ovano.`);
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5"><Label>Slike *</Label><Input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} /></div>
      <div className="space-y-1.5"><Label>Datum</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Faza</Label>
        <Select value={phaseId || "none"} onValueChange={x => setPhaseId(x === "none" ? undefined : x)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— bez faze —</SelectItem>
            {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Napomena</Label><Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="npr. Stubovi prizemlje" /></div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Upload {files.length > 0 && `(${files.length})`}</Button>
      </DialogFooter>
    </form>
  );
}
