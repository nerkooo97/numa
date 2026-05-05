import { useCallback, useEffect, useState } from "react";
import { Plus, KeyRound, Trash2, RefreshCw, UserPlus } from "lucide-react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusChip } from "@shared/components/StatusChip";
import { toast } from "sonner";
import {
  listUsers, createUser, updateUserPassword, updateUserStatus, updateUserLabels, deleteUser,
  listTeams, createTeam, deleteTeam,
  listMemberships, addUserToTeam, updateMembershipRoles, removeMembership,
  type AppwriteUser, type AppwriteTeam, type AppwriteMembership,
} from "@/data/appwrite/admin";

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Korisnici" description="Upravljanje korisnicima, ulogama i timovima." />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Korisnici</TabsTrigger>
          <TabsTrigger value="teams">Timovi</TabsTrigger>
          <TabsTrigger value="audit">Aktivnosti</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="teams" className="mt-4"><TeamsTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AppwriteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ email: "", name: "", password: "", role: "poslovodja" });

  const refresh = useCallback(async () => {
    setLoading(true);
    try { const r = await listUsers(); setUsers(r.users); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.email || !v.name || v.password.length < 8) { toast.error("Sva polja su obavezna; lozinka min 8 karaktera."); return; }
    try {
      const u = await createUser({ email: v.email, name: v.name, password: v.password });
      if (v.role) await updateUserLabels(u.$id, [v.role]);
      // Sinkronizuj profil u "users" kolekciji (id = Appwrite account $id)
      try {
        await db.users.create({ id: u.$id, email: v.email, name: v.name, role: v.role as any, passwordHash: "" } as any);
      } catch { /* duplikat – ignoriši */ }
      toast.success("Korisnik kreiran.");
      setOpen(false); setV({ email: "", name: "", password: "", role: "poslovodja" });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const resetPwd = async (id: string) => {
    const np = prompt("Nova lozinka (min 8 karaktera):");
    if (!np || np.length < 8) return;
    try { await updateUserPassword(id, np); toast.success("Lozinka ažurirana."); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleStatus = async (u: AppwriteUser) => {
    try { await updateUserStatus(u.$id, !u.status); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const setRole = async (u: AppwriteUser, role: string) => {
    try {
      await updateUserLabels(u.$id, role ? [role] : []);
      try { await db.users.update(u.$id, { role: role as any } as any); } catch {}
      toast.success("Uloga ažurirana."); refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Obrisati korisnika? Ovo se ne može poništiti.")) return;
    try {
      await deleteUser(id);
      try { await db.users.remove(id); } catch {}
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{users.length} korisnika</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Osvježi</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novi korisnik</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi korisnik</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Ime *</Label><Input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} required /></div>
                <div className="space-y-1.5 col-span-2"><Label>Email *</Label><Input type="email" value={v.email} onChange={e => setV({ ...v, email: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Lozinka *</Label><Input type="password" value={v.password} onChange={e => setV({ ...v, password: e.target.value })} required /></div>
                <div className="space-y-1.5">
                  <Label>Uloga</Label>
                  <Select value={v.role} onValueChange={(x) => setV({ ...v, role: x })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="poslovodja">poslovodja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Odustani</Button><Button type="submit">Kreiraj</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Ime</TableHead><TableHead>Email</TableHead><TableHead>Uloga</TableHead><TableHead>Status</TableHead><TableHead>Registrovan</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.length === 0 && !loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nema korisnika.</TableCell></TableRow>}
            {users.map(u => {
              const role = (u.labels || [])[0] || "";
              return (
                <TableRow key={u.$id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select value={role} onValueChange={(x) => setRole(u, x)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="poslovodja">poslovodja</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(u)}>
                      <StatusChip tone={u.status ? "success" : "danger"}>{u.status ? "aktivan" : "blokiran"}</StatusChip>
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(u.registration).toLocaleString("bs-BA")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => resetPwd(u.$id)} title="Promijeni lozinku"><KeyRound className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(u.$id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TeamsTab() {
  const [teams, setTeams] = useState<AppwriteTeam[]>([]);
  const [users, setUsers] = useState<AppwriteUser[]>([]);
  const [memberships, setMemberships] = useState<Record<string, AppwriteMembership[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openTeam, setOpenTeam] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [member, setMember] = useState({ userId: "", roles: "member" });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listTeams(), listUsers()]);
      setTeams(t.teams); setUsers(u.users);
      if (!selected && t.teams[0]) setSelected(t.teams[0].$id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { refresh(); }, [refresh]);

  const loadMembers = useCallback(async (teamId: string) => {
    try {
      const m = await listMemberships(teamId);
      setMemberships(prev => ({ ...prev, [teamId]: m.memberships }));
    } catch (e: any) { toast.error(e.message); }
  }, []);

  useEffect(() => { if (selected) loadMembers(selected); }, [selected, loadMembers]);

  const submitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    try {
      const t = await createTeam(teamName.trim());
      toast.success("Tim kreiran."); setOpenTeam(false); setTeamName("");
      setSelected(t.$id); refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Obrisati tim?")) return;
    try { await deleteTeam(id); if (selected === id) setSelected(null); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const submitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !member.userId) return;
    const roles = member.roles.split(",").map(r => r.trim()).filter(Boolean);
    try {
      await addUserToTeam(selected, member.userId, roles);
      toast.success("Korisnik dodan u tim."); setOpenMember(false); setMember({ userId: "", roles: "member" });
      loadMembers(selected);
    } catch (e: any) { toast.error(e.message); }
  };

  const updateRoles = async (membershipId: string, rolesStr: string) => {
    if (!selected) return;
    const roles = rolesStr.split(",").map(r => r.trim()).filter(Boolean);
    try { await updateMembershipRoles(selected, membershipId, roles); toast.success("Role-ovi ažurirani."); loadMembers(selected); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeMember = async (membershipId: string) => {
    if (!selected || !confirm("Ukloniti člana iz tima?")) return;
    try { await removeMembership(selected, membershipId); loadMembers(selected); }
    catch (e: any) { toast.error(e.message); }
  };

  const currentMembers = selected ? memberships[selected] || [] : [];
  const availableUsers = users.filter(u => !currentMembers.some(m => m.userId === u.$id));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Timovi</CardTitle>
          <Dialog open={openTeam} onOpenChange={setOpenTeam}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novi</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi tim</DialogTitle></DialogHeader>
              <form onSubmit={submitTeam} className="space-y-3">
                <div className="space-y-1.5"><Label>Naziv tima *</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} required /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenTeam(false)}>Odustani</Button><Button type="submit">Kreiraj</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {teams.length === 0 && !loading && <div className="p-4 text-sm text-muted-foreground text-center">Nema timova.</div>}
          <div className="divide-y">
            {teams.map(t => (
              <div key={t.$id} className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 ${selected === t.$id ? "bg-muted" : ""}`} onClick={() => setSelected(t.$id)}>
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.total} članova</div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeTeam(t.$id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Članovi tima {selected ? `· ${teams.find(t => t.$id === selected)?.name || ""}` : ""}</CardTitle>
          {selected && (
            <Dialog open={openMember} onOpenChange={setOpenMember}>
              <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Dodaj člana</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Dodaj korisnika u tim</DialogTitle></DialogHeader>
                <form onSubmit={submitMember} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Korisnik *</Label>
                    <Select value={member.userId} onValueChange={(x) => setMember({ ...member, userId: x })}>
                      <SelectTrigger><SelectValue placeholder="Odaberi korisnika..." /></SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(u => <SelectItem key={u.$id} value={u.$id}>{u.name} — {u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role-ovi (zarezom razdvojeni)</Label>
                    <Input value={member.roles} onChange={e => setMember({ ...member, roles: e.target.value })} placeholder="npr. owner, member" />
                  </div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenMember(false)}>Odustani</Button><Button type="submit">Dodaj</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!selected && <div className="p-6 text-sm text-muted-foreground text-center">Odaberi tim sa lijeve strane.</div>}
          {selected && (
            <Table>
              <TableHeader><TableRow><TableHead>Ime</TableHead><TableHead>Email</TableHead><TableHead>Role-ovi</TableHead><TableHead>Pridružen</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {currentMembers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Tim je prazan.</TableCell></TableRow>}
                {currentMembers.map(m => (
                  <TableRow key={m.$id}>
                    <TableCell className="font-medium">{m.userName || "—"}</TableCell>
                    <TableCell>{m.userEmail}</TableCell>
                    <TableCell>
                      <Input defaultValue={m.roles.join(", ")} className="h-8" onBlur={(e) => { if (e.target.value !== m.roles.join(", ")) updateRoles(m.$id, e.target.value); }} />
                    </TableCell>
                    <TableCell className="text-xs">{m.joined ? new Date(m.joined).toLocaleDateString("bs-BA") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMember(m.$id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab() {
  const { data: audit = [] } = useAsync(() => db.audit.list());
  const recent = [...audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit log (zadnjih 50)</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Vrijeme</TableHead><TableHead>Korisnik</TableHead><TableHead>Akcija</TableHead><TableHead>Entitet</TableHead><TableHead>Detalji</TableHead></TableRow></TableHeader>
          <TableBody>
            {recent.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nema zapisa.</TableCell></TableRow>
              : recent.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.at).toLocaleString("bs-BA")}</TableCell>
                  <TableCell>{a.userName}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.entity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.details || "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
