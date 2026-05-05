import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@numa.ba");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav("/", { replace: true }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Greška pri prijavi.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Lijeva strana — brand / pozadina */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, hsl(var(--primary)) 0, transparent 55%), radial-gradient(circle at 80% 90%, hsl(var(--accent)) 0, transparent 55%), linear-gradient(135deg, hsl(var(--primary) / 0.95), hsl(var(--accent) / 0.85))",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[10px] bg-white/15 backdrop-blur-sm grid place-items-center ring-1 ring-white/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-medium tracking-[-0.01em] leading-none">NUMA ERP</div>
            <div className="text-xs text-white/70 mt-1.5">Interni sistem</div>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <h2 className="text-4xl xl:text-5xl font-light tracking-[-0.03em] leading-[1.05]">
            Vodi gradilište,<br />ne papirologiju.
          </h2>
          <p className="text-base text-white/80 font-light leading-relaxed">
            Sati, troškovi, keš, oprema i projekti — sve na jednom mjestu, u realnom vremenu i sa potpunim pregledom.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Feature icon={<Users className="h-4 w-4" />} title="Zaposleni" desc="Domaći i strani radnici" />
            <Feature icon={<BarChart3 className="h-4 w-4" />} title="Analitika" desc="Profitabilnost po fazi" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Sigurno" desc="Audit svake akcije" />
          </div>
        </div>

        <div className="text-xs text-white/60">
          © {new Date().getFullYear()} NUMA · Sva prava zadržana
        </div>
      </aside>

      {/* Desna strana — login forma */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-[8px] bg-primary text-primary-foreground grid place-items-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-medium leading-none">NUMA ERP</div>
              <div className="text-xs text-muted-foreground mt-1">Interni sistem</div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-[-0.02em]">Dobro došli nazad</h1>
            <p className="text-sm text-muted-foreground">Prijavite se da nastavite na kontrolnu tablu.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-label">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-label">Lozinka</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full h-10" disabled={busy}>
              {busy ? "Prijavljivanje..." : "Prijavi se"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="space-y-1.5">
      <div className="h-7 w-7 rounded-md bg-white/15 grid place-items-center ring-1 ring-white/20">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-white/70 leading-snug">{desc}</div>
    </div>
  );
}
