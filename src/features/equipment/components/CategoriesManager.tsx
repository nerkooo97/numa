import { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { EquipmentCategory } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CategoriesManager({ categories }: { categories: EquipmentCategory[] }) {
  const [name, setName] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) { toast.error("Kategorija već postoji."); return; }
    await db.equipmentCategories.create({ name: name.trim() } as any);
    setName(""); bumpData();
  };
  const remove = async (id: string) => {
    if (!confirm("Obrisati kategoriju? Alati će ostati bez kategorije.")) return;
    await db.equipmentCategories.remove(id); bumpData();
  };
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Naziv nove kategorije" />
        <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Dodaj</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {categories.length === 0 ? <p className="text-sm text-muted-foreground">Nema kategorija.</p>
          : categories.map(c => (
            <div key={c.id} className="inline-flex items-center gap-1 border rounded-[6px] px-2 py-1 text-sm bg-card">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{c.name}</span>
              <button onClick={() => remove(c.id)} className="ml-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
      </div>
    </div>
  );
}
