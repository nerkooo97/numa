import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@shared/components/StatusChip";
import { toast } from "sonner";
import { User, Lock, KeyRound, Check, Shield } from "lucide-react";
import { getAppwrite } from "@/data/appwrite/config";
import {
  appwriteListMfaFactors,
  appwriteCreateMfaAuthenticator,
  appwriteVerifyMfaAuthenticator,
  appwriteDeleteMfaAuthenticator,
  appwriteUpdateMFA,
  appwriteCreateMfaRecoveryCodes,
  appwriteUpdateMfaRecoveryCodes,
} from "@/data/appwrite/auth";

export default function ProfilePage() {
  const { user, updateProfileName, updateProfilePassword } = useAuth();
  
  // Profile Name states
  const [name, setName] = useState(user?.name || "");
  const [nameLoading, setNameLoading] = useState(false);

  // Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // MFA States
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "recovery">("idle");
  const [authenticatorData, setAuthenticatorData] = useState<{ secret: string; uri: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      checkMfaStatus();
    }
  }, [user]);

  const checkMfaStatus = async () => {
    try {
      setMfaLoading(true);
      const factors = await appwriteListMfaFactors();
      setMfaEnabled(factors.totp);
    } catch (err) {
      console.error("Greška pri provjeri MFA statusa:", err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      setVerificationLoading(true);
      const data = await appwriteCreateMfaAuthenticator();
      setAuthenticatorData(data);
      setSetupStep("qr");
      setVerificationCode("");
    } catch (err: any) {
      toast.error(err.message || "Greška pri kreiranju autentifikatora.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyAndEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) return toast.error("Kod mora imati tačno 6 cifara.");
    try {
      setVerificationLoading(true);
      // 1. Verifikuj autentifikator
      await appwriteVerifyMfaAuthenticator(verificationCode);
      // 2. Aktiviraj MFA na nalogu
      await appwriteUpdateMFA(true);
      
      // 3. Generiši rezervne kodove (ako već ne postoje)
      try {
        const res = await appwriteCreateMfaRecoveryCodes();
        setRecoveryCodes(res.recoveryCodes || []);
        setSetupStep("recovery");
      } catch (recoveryErr: any) {
        console.warn("Recovery codes already exist or failed to generate:", recoveryErr);
        // Ako već postoje kodovi, nećemo prekidati uspešnu aktivaciju MFA
        setRecoveryCodes([]);
        setSetupStep("idle");
        toast.info("Dvofaktorska autentifikacija je aktivirana! Vaši rezervni kodovi su već ranije generisani. Ukoliko ih nemate sačuvane, možete generisati nove ispod.");
      }
      
      setMfaEnabled(true);
      toast.success("Višefaktorska autentifikacija je uspješno aktivirana!");
    } catch (err: any) {
      toast.error(err.message || "Neispravan kod ili greška pri aktivaciji.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm("Da li ste sigurni da želite isključiti dvofaktorsku autentifikaciju? Ovo smanjuje sigurnost Vašeg naloga.")) return;
    try {
      setVerificationLoading(true);
      await appwriteUpdateMFA(false);
      await appwriteDeleteMfaAuthenticator();
      setMfaEnabled(false);
      setSetupStep("idle");
      setAuthenticatorData(null);
      setRecoveryCodes([]);
      toast.success("MFA je uspješno deaktiviran.");
    } catch (err: any) {
      toast.error(err.message || "Greška pri deaktivaciji MFA.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!window.confirm("Generisanjem novih rezervnih kodova svi prethodni kodovi prestaju važiti. Da li želite nastaviti?")) return;
    try {
      setVerificationLoading(true);
      const res = await appwriteUpdateMfaRecoveryCodes();
      setRecoveryCodes(res.recoveryCodes || []);
      setSetupStep("recovery");
      toast.success("Novi rezervni kodovi su uspješno generisani!");
    } catch (err: any) {
      toast.error(err.message || "Greška pri generisanju rezervnih kodova.");
    } finally {
      setVerificationLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Korisnik nije prijavljen.</p>
      </div>
    );
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Ime ne može biti prazno.");
    if (name.trim() === user.name) return toast.info("Ime je identično postojećem.");

    try {
      setNameLoading(true);
      await updateProfileName(name.trim());
      toast.success("Vaše ime je uspješno promijenjeno.");
    } catch (error: any) {
      toast.error(error?.message || "Greška pri promjeni imena.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) return toast.error("Molimo unesite trenutnu lozinku.");
    if (!newPassword) return toast.error("Molimo unesite novu lozinku.");
    if (newPassword.length < 8) return toast.error("Nova lozinka mora imati najmanje 8 karaktera.");
    if (newPassword !== confirmPassword) return toast.error("Nove lozinke se ne podudaraju.");

    try {
      setPwdLoading(true);
      await updateProfilePassword(newPassword, oldPassword);
      toast.success("Lozinka je uspješno promijenjena.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error?.message || "Neispravna trenutna lozinka ili greška na serveru.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postavke profila"
        description="Upravljajte svojim ličnim podacima, postavkama naloga i lozinkom."
      />

      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* User Card */}
        <div className="space-y-6">
          <Card className="overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c8965a] to-[#e0b37a]" />
            <CardHeader className="text-center pt-8">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[#c8965a]/20 to-[#c8965a]/5 border border-[#c8965a]/30 flex items-center justify-center text-2xl font-bold text-[#c8965a] shadow-inner">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <CardTitle className="mt-4 text-lg font-semibold tracking-tight">{user.name}</CardTitle>
              <CardDescription className="text-xs font-mono">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/40 bg-muted/20 px-5 py-4 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-[#c8965a]" /> Uloga</span>
                <StatusChip tone={user.role === "admin" ? "success" : "info"}>
                  {user.role === "admin" ? "Administrator" : "Poslovođa"}
                </StatusChip>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[#c8965a]" /> ID Korisnika</span>
                <span className="font-mono text-xs text-foreground/80 truncate max-w-[120px]" title={user.id}>
                  {user.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Forms */}
        <div className="space-y-6">
          {/* Change Name Form */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-[#c8965a]" /> Lični podaci
              </CardTitle>
              <CardDescription>
                Ažurirajte svoje prikazano ime koje se vidi u cijelom sistemu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Prikazano ime</Label>
                  <div className="relative">
                    <Input
                      id="displayName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Unesite Vaše ime"
                      className="pr-10"
                      disabled={nameLoading}
                    />
                    {name.trim() === user.name && name.trim().length > 0 && (
                      <Check className="absolute right-3 top-2.5 h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={nameLoading || name.trim() === user.name || !name.trim()}
                    className="bg-[#c8965a] hover:bg-[#b5854f] text-white"
                  >
                    {nameLoading ? "Snimanje..." : "Sačuvaj izmjene"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#c8965a]" /> Sigurnost & Lozinka
              </CardTitle>
              <CardDescription>
                Promijenite svoju lozinku za prijavu. Lozinka mora imati najmanje 8 karaktera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="oldPassword">Trenutna lozinka</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={pwdLoading}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">Nova lozinka</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Najmanje 8 karaktera"
                      disabled={pwdLoading}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Potvrdite novu lozinku</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ponovite novu lozinku"
                      disabled={pwdLoading}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={pwdLoading || !oldPassword || !newPassword || !confirmPassword}
                    className="bg-[#c8965a] hover:bg-[#b5854f] text-white"
                  >
                    {pwdLoading ? "Ažuriranje lozinke..." : "Promijeni lozinku"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Multi-Factor Authentication Card */}
          <Card className="border border-border/50 overflow-hidden relative">
            {mfaEnabled && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 animate-pulse" />
            )}
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#c8965a]" /> Višefaktorska autentifikacija (MFA)
              </CardTitle>
              <CardDescription>
                Dodajte dodatni sloj sigurnosti svom nalogu koristeći verifikacione kodove sa vašeg telefona.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mfaLoading ? (
                <div className="flex py-6 justify-center items-center text-muted-foreground text-sm space-x-2">
                  <span className="h-4 w-4 border-2 border-[#c8965a] border-t-transparent rounded-full animate-spin" />
                  <span>Učitavanje sigurnosnih postavki...</span>
                </div>
              ) : (
                <>
                  {/* Status Display */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/40 bg-muted/10">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-full ${mfaEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {mfaEnabled ? "Aktivna zaštita (MFA)" : "Zaštita nije aktivirana"}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mfaEnabled
                            ? "Vaš nalog je zaštićen dodatnom provjerom u dva koraka."
                            : "Svako ko sazna vašu lozinku može se prijaviti na vaš nalog. Aktivirajte MFA za maksimalnu sigurnost."}
                        </p>
                      </div>
                    </div>
                    <div>
                      {mfaEnabled ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-border/60 hover:bg-muted"
                            onClick={handleRegenerateRecoveryCodes}
                            disabled={verificationLoading}
                          >
                            Generiši kodove
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDisableMfa}
                            disabled={verificationLoading}
                          >
                            Deaktiviraj
                          </Button>
                        </div>
                      ) : (
                        setupStep === "idle" && (
                          <Button
                            size="sm"
                            className="bg-[#c8965a] hover:bg-[#b5854f] text-white text-xs font-semibold"
                            onClick={handleStartMfaSetup}
                            disabled={verificationLoading}
                          >
                            Aktiviraj MFA
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Wizard Step 1: QR and verification */}
                  {setupStep === "qr" && authenticatorData && (
                    <div className="p-4 border border-border/50 rounded-lg bg-muted/5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <h4 className="text-sm font-semibold text-foreground">Konfiguracija autentifikatora</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-muted-foreground hover:text-foreground text-xs"
                          onClick={() => setSetupStep("idle")}
                        >
                          Odustani
                        </Button>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2 items-center">
                        <div className="flex flex-col items-center justify-center bg-white p-3 rounded-lg border border-border/30 shadow-inner">
                          {(() => {
                            const { avatars } = getAppwrite();
                            const qrCodeUrl = avatars.getQR({ text: authenticatorData.uri, size: 240 });
                            return qrCodeUrl ? (
                              <img src={qrCodeUrl} alt="MFA QR Code" className="w-[180px] h-[180px]" />
                            ) : (
                              <div className="w-[180px] h-[180px] bg-muted/40 animate-pulse rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                Generisanje QR koda...
                              </div>
                            );
                          })()}
                          <span className="text-[10px] text-black font-mono mt-1">Skenirajte mobilnom aplikacijom</span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uputstvo za instalaciju</h5>
                            <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                              <li>Otvorite aplikaciju (Google Authenticator, Authy, Microsoft Authenticator itd.)</li>
                              <li>Skenirajte QR kod na lijevoj strani ili unesite ključ ručno:</li>
                            </ol>
                            <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 border border-border/40 rounded font-mono text-xs text-foreground/80 mt-1 select-all break-all relative">
                              <span>{authenticatorData.secret}</span>
                            </div>
                          </div>

                          <form onSubmit={handleVerifyAndEnableMfa} className="space-y-2">
                            <Label htmlFor="mfaCode" className="text-xs">Unesite 6-cifreni verifikacioni kod</Label>
                            <div className="flex gap-2">
                              <Input
                                id="mfaCode"
                                type="text"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="font-mono text-center tracking-[0.2em] font-semibold text-lg"
                                disabled={verificationLoading}
                                required
                              />
                              <Button
                                type="submit"
                                disabled={verificationLoading || verificationCode.length !== 6}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                {verificationLoading ? "Provjera..." : "Aktiviraj"}
                              </Button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Step 2: Recovery codes */}
                  {setupStep === "recovery" && recoveryCodes.length > 0 && (
                    <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-500">
                        <KeyRound className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold">Sačuvajte Vaše rezervne (recovery) kodove!</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            U slučaju da izgubite pristup svom uređaju za autentifikaciju, ovi kodovi su **jedini** način da se prijavite na sistem. Svaki kod se može iskoristiti samo jednom.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 border border-border/40 rounded-lg font-mono text-xs text-foreground/80">
                        {recoveryCodes.map((code, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 p-1">
                            <span className="text-muted-foreground/50 text-[10px] w-4">{idx + 1}.</span>
                            <span className="font-semibold tracking-wide select-all">{code}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border/30">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-border/60 hover:bg-muted"
                          onClick={() => {
                            navigator.clipboard.writeText(recoveryCodes.join("\n"));
                            toast.success("Kodovi su kopirani u međuspremnik.");
                          }}
                        >
                          Kopiraj sve
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          onClick={() => {
                            setSetupStep("idle");
                            setRecoveryCodes([]);
                          }}
                        >
                          Završi
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
