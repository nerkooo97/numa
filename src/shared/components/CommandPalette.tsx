import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { useAuth } from "@features/auth/AuthContext";
import { Users, FolderKanban, Clock, Plus } from "lucide-react";
import { navItemsFor, quickActionsFor } from "@/config/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const navItems = navItemsFor(user?.role);
  const quickCreate = quickActionsFor(user?.role);

  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (url: string) => { setOpen(false); navigate(url); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pretraži radnike, projekte, faze, akcije…" />
      <CommandList>
        <CommandEmpty>Nema rezultata.</CommandEmpty>

        <CommandGroup heading="Brze akcije">
          {quickCreate.map(x => (
            <CommandItem key={x.url} value={`akcija ${x.label}`} onSelect={() => go(x.url)}>
              <Plus className="h-4 w-4 mr-2" /> {x.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Navigacija">
          {navItems.map(x => (
            <CommandItem key={x.url} value={`nav ${x.title}`} onSelect={() => go(x.url)}>
              <x.icon className="h-4 w-4 mr-2" /> {x.title}
            </CommandItem>
          ))}
        </CommandGroup>

        {employees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Zaposleni">
              {employees.slice(0, 50).map(e => (
                <CommandItem key={e.id} value={`radnik ${e.firstName} ${e.lastName} ${e.identifier}`} onSelect={() => go(`/zaposleni/${e.id}`)}>
                  <Users className="h-4 w-4 mr-2" /> {e.firstName} {e.lastName}
                  <span className="ml-auto text-xs text-muted-foreground">{e.type === "strani" ? "strani" : "domaći"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projekti">
              {projects.slice(0, 50).map(p => (
                <CommandItem key={p.id} value={`projekat ${p.name} ${p.location}`} onSelect={() => go(`/projekti/${p.id}`)}>
                  <FolderKanban className="h-4 w-4 mr-2" /> {p.name}
                  <span className="ml-auto text-xs text-muted-foreground">{p.location}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {phases.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Faze">
              {phases.slice(0, 50).map(ph => {
                const p = projects.find(pp => pp.id === ph.projectId);
                return (
                  <CommandItem key={ph.id} value={`faza ${ph.name} ${p?.name || ""}`} onSelect={() => go(`/projekti/${ph.projectId}`)}>
                    <Clock className="h-4 w-4 mr-2" /> {ph.name}
                    <span className="ml-auto text-xs text-muted-foreground">{p?.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
