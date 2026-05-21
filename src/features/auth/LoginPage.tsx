import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, BarChart3, Users, ShieldAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";
import { Logo } from "@shared/components/Logo";
import { appwriteCreateMfaChallenge } from "@/data/appwrite/auth";

export default function Login() {
  const { login, user, completeMfaChallenge } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // MFA Challenge States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactor, setMfaFactor] = useState<"totp" | "recoveryCode">("totp");
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => { if (user && !mfaRequired) nav("/", { replace: true }); }, [user, nav, mfaRequired]);

  const startMfaChallenge = async (factor: "totp" | "recoveryCode") => {
    try {
      setMfaBusy(true);
      const res = await appwriteCreateMfaChallenge(factor);
      setChallengeId(res.$id);
      setMfaCode("");
    } catch (err: any) {
      toast.error(err.message || "Greška pri kreiranju MFA izazova.");
    } finally {
      setMfaBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (err: any) {
      if (err?.type === "user_more_factors_required") {
        setMfaRequired(true);
        await startMfaChallenge("totp");
      } else {
        toast.error(err.message || "Greška pri prijavi.");
      }
    } finally { setBusy(false); }
  };

  const submitMfaChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return toast.error("MFA izazov nije uspostavljen.");
    if (!mfaCode.trim()) return toast.error("Unesite verifikacioni kod.");

    setMfaBusy(true);
    try {
      await completeMfaChallenge(challengeId, mfaCode.trim());
      toast.success("Uspješna prijava!");
      nav("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Neispravan kod ili rezervna lozinka. Pokušajte ponovo.");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleSwitchFactor = async () => {
    const newFactor = mfaFactor === "totp" ? "recoveryCode" : "totp";
    setMfaFactor(newFactor);
    await startMfaChallenge(newFactor);
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
          <Logo size="lg" className="rounded-[10px]" />
          <div>
            <div className="text-lg font-medium tracking-[-0.01em] leading-none">NUMA ERP</div>
            <div className="text-xs text-white/70 mt-1.5">Interni sistem</div>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <h2 className="text-4xl xl:text-5xl font-light tracking-[-0.03em] leading-[1.05]">
            {mfaRequired ? (
              <>Dodatna zaštita<br />Vašeg naloga.</>
            ) : (
              <>Vodi gradilište,<br />ne papirologiju.</>
            )}
          </h2>
          <p className="text-base text-white/80 font-light leading-relaxed">
            {mfaRequired ? (
              "Višefaktorska autentifikacija je obavezna jer štiti Vaše osjetljive poslovne podatke od neovlaštenog pristupa."
            ) : (
              "Sati, troškovi, keš, oprema i projekti — sve na jednom mjestu, u realnom vremenu i sa potpunim pregledom."
            )}
          </p>
          {!mfaRequired && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <Feature icon={<Users className="h-4 w-4" />} title="Zaposleni" desc="Domaći i strani radnici" />
              <Feature icon={<BarChart3 className="h-4 w-4" />} title="Analitika" desc="Profitabilnost po fazi" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Sigurno" desc="Audit svake akcije" />
            </div>
          )}
        </div>

        <div className="text-xs text-white/60">
          © {new Date().getFullYear()} NUMA · Sva prava zadržana
        </div>
      </aside>

      {/* Desna strana — login / mfa forma */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        {mfaRequired ? (
          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="lg:hidden flex justify-center mb-2">
              <Logo size="xl" className="h-20 w-auto rounded-[12px]" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex p-2 bg-[#c8965a]/10 text-[#c8965a] rounded-full">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-light tracking-[-0.02em]">Dva koraka do prijave</h1>
                <p className="text-sm text-muted-foreground">
                  {mfaFactor === "totp"
                    ? "Unesite 6-cifreni kod iz Vaše autentifikatorske aplikacije na telefonu."
                    : "Unesite jedan od Vaših 8-cifrenih rezervnih (recovery) kodova."}
                </p>
              </div>
            </div>

            <form onSubmit={submitMfaChallenge} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-xs font-semibold text-foreground/80">
                  {mfaFactor === "totp" ? "Verifikacioni kod" : "Rezervni kod"}
                </Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={mfaFactor === "totp" ? 6 : 10}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ""))}
                  placeholder={mfaFactor === "totp" ? "000000" : "a1b2c3d4"}
                  className="font-mono text-center tracking-[0.2em] font-semibold text-lg h-12"
                  disabled={mfaBusy}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full h-12 bg-[#c8965a] hover:bg-[#b5854f] text-white font-semibold" disabled={mfaBusy}>
                  {mfaBusy ? "Provjera..." : "Potvrdi i prijavi se"}
                </Button>
                
                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleSwitchFactor}
                    className="text-[#c8965a] hover:underline font-medium"
                    disabled={mfaBusy}
                  >
                    {mfaFactor === "totp" ? "Iskoristite rezervni kod" : "Koristite autentifikator"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMfaRequired(false);
                      setChallengeId(null);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                    disabled={mfaBusy}
                  >
                    Nazad na lozinku
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-300">
            <div className="lg:hidden flex justify-center mb-2">
              <Logo size="xl" className="h-20 w-auto rounded-[12px]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-light tracking-[-0.02em]">Dobro došli nazad</h1>
              <p className="text-sm text-muted-foreground">Prijavite se da nastavite na kontrolnu tablu.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-label">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="npr. ime@numa.ba" required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-label">Lozinka</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full h-10 bg-[#c8965a] hover:bg-[#b5854f] text-white" disabled={busy}>
                {busy ? "Prijavljivanje..." : "Prijavi se"}
              </Button>
            </form>
          </div>
        )}
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
