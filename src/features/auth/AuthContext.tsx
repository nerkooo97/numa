import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "@/data";
import type { Role, User } from "@/data/types";
import { getAppwrite } from "@/data/appwrite/config";
import {
  appwriteLogin,
  appwriteLogout,
  appwriteCurrentUser,
  appwriteChangePassword,
  appwriteChangeName,
  appwriteCompleteMfaChallenge,
} from "@/data/appwrite/auth";
import {
  createUser as adminCreateUser,
  updateUserPassword as adminUpdatePassword,
  updateUserLabels as adminUpdateLabels,
} from "@/data/appwrite/admin";

interface AuthState {
  user: Pick<User, "id" | "email" | "name" | "role"> | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  bootstrap(): Promise<void>;
  createUser(input: { email: string; name: string; password: string; role: Role }): Promise<User>;
  changePassword(userId: string, newPassword: string): Promise<void>;
  updateProfileName(newName: string): Promise<void>;
  updateProfilePassword(newPassword: string, oldPassword: string): Promise<void>;
  completeMfaChallenge(challengeId: string, otp: string): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

async function loadProfile(account: { $id: string; email: string; name: string; labels?: string[] }) {
  let profile = await db.users.get(account.$id);
  const role: Role = (account.labels || []).includes("admin") ? "admin" : "poslovodja";
  if (!profile) {
    profile = await db.users.create({
      id: account.$id,
      email: account.email,
      name: account.name,
      role,
      passwordHash: "",
    } as any);
  }
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = async () => {
    // Bootstrap se sada radi u Appwrite konzoli + seed scriptom (admin@numa.ba).
  };

  useEffect(() => {
    (async () => {
      try {
        const acc = await appwriteCurrentUser();
        if (acc) {
          const p = await loadProfile(acc as any);
          setUser({ id: p.id, email: p.email, name: p.name, role: p.role });
        }
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  const login: AuthState["login"] = async (email, password) => {
    try { await appwriteLogout(); } catch { /* ignore */ }
    await appwriteLogin(email, password);
    const { account } = getAppwrite();
    let acc;
    try {
      acc = await account.get();
    } catch (err: any) {
      if (err?.type === "user_more_factors_required") {
        throw err;
      }
      throw new Error(err?.message || "Neuspješna prijava.");
    }
    const p = await loadProfile(acc as any);
    setUser({ id: p.id, email: p.email, name: p.name, role: p.role });
  };

  const completeMfaChallenge: AuthState["completeMfaChallenge"] = async (challengeId, otp) => {
    await appwriteCompleteMfaChallenge(challengeId, otp);
    const { account } = getAppwrite();
    let acc;
    try {
      acc = await account.get();
    } catch (err: any) {
      throw new Error(err?.message || "Greška pri dohvaćanju profila nakon MFA verifikacije.");
    }
    const p = await loadProfile(acc as any);
    setUser({ id: p.id, email: p.email, name: p.name, role: p.role });
  };

  const logout = async () => {
    await appwriteLogout();
    setUser(null);
  };

  const createUser: AuthState["createUser"] = async ({ email, name, password, role }) => {
    const acc = await adminCreateUser({ email, name, password });
    await adminUpdateLabels(acc.$id, [role]);
    const profile = await db.users.create({
      id: acc.$id, email, name, role, passwordHash: "",
    } as any);
    return profile;
  };

  const changePassword: AuthState["changePassword"] = async (userId, newPassword) => {
    await adminUpdatePassword(userId, newPassword);
  };

  const updateProfileName: AuthState["updateProfileName"] = async (newName) => {
    if (!user) return;
    await appwriteChangeName(newName);
    await db.users.update(user.id, { name: newName } as any);
    setUser((prev) => prev ? { ...prev, name: newName } : null);
  };

  const updateProfilePassword: AuthState["updateProfilePassword"] = async (newPassword, oldPassword) => {
    await appwriteChangePassword(newPassword, oldPassword);
  };

  return <Ctx.Provider value={{ user, loading, login, logout, bootstrap, createUser, changePassword, updateProfileName, updateProfilePassword, completeMfaChallenge }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
