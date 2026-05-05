import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminTab({ lockState, setLockState, updateLock }: { lockState: string | null; setLockState: (d: string | null) => void; updateLock: (d: string | null) => void }) {
  return (
    <Card><CardContent className="pt-5 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-medium mb-1">Lock perioda (računovodstvo)</h3>
        <p className="text-xs text-muted-foreground mb-3">Zaključaj sve unose ≤ datuma. Poslovođe više neće moći mijenjati. Admin uvijek može.</p>
        <div className="flex gap-2 items-center">
          <Input type="date" value={lockState || ""} onChange={e => setLockState(e.target.value || null)} className="h-9 w-44" />
          <Button size="sm" onClick={() => updateLock(lockState)}>Postavi lock</Button>
          {lockState && <Button size="sm" variant="outline" onClick={() => updateLock(null)}>Ukloni lock</Button>}
        </div>
      </div>
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-1">Approval workflow</h3>
        <p className="text-xs text-muted-foreground">Svi novi unosi poslovođa idu u status „čeka". Trošak rada projekta i dalje ulazi u kalkulacije, ali se u listi vidi koje treba odobriti. Admin unosi automatski idu kao odobreni.</p>
      </div>
    </CardContent></Card>
  );
}
