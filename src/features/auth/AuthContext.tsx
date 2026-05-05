import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "@/data";
import type { Role, User } from "@/data/types";
import {
  appwriteLogin,
  appwriteLogout,
  appwriteCurrentUser,
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
    const acc = await appwriteCurrentUser();
    if (!acc) throw new Error("Sesija nije uspostavljena.");
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

  return <Ctx.Provider value={{ user, loading, login, logout, bootstrap, createUser, changePassword }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
