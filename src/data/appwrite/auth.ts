// Appwrite auth helperi — pripremljeno za zamjenu trenutnog bcrypt+localStorage flow-a.
// NIJE povezano sa AuthContext-om dok se ne prebaci backend.
//
// Plan migracije:
//  - login(email, password) -> account.createEmailPasswordSession
//  - logout() -> account.deleteSession("current")
//  - currentUser() -> account.get()
//  - createUser(...) -> account.create() + spremanje role-a u "users" kolekciju
//  - changePassword -> account.updatePassword
//
// Uloge (admin / poslovodja) se i dalje čuvaju u public.users kolekciji
// (1:1 sa localClient modelom), a auth identitet je Appwrite account.

import { ID } from "appwrite";
import { getAppwrite } from "./config";
import type { Role } from "@features/auth/types";

export async function appwriteLogin(email: string, password: string) {
  const { account } = getAppwrite();
  return account.createEmailPasswordSession(email, password);
}

export async function appwriteLogout() {
  const { account } = getAppwrite();
  try { await account.deleteSession("current"); } catch { /* ignore */ }
}

export async function appwriteCurrentUser() {
  try {
    const { account } = getAppwrite();
    return await account.get();
  } catch {
    return null;
  }
}

export async function appwriteCreateUser(input: { email: string; name: string; password: string; role: Role }) {
  const { account } = getAppwrite();
  const created = await account.create(ID.unique(), input.email, input.password, input.name);
  // Profil sa ulogom se pravi posebno u "users" kolekciji preko db.users.create
  // (vidi DataClient). $id Appwrite naloga koristi se kao id korisničkog profila.
  return created;
}

export async function appwriteChangePassword(newPassword: string, oldPassword: string) {
  const { account } = getAppwrite();
  return account.updatePassword(newPassword, oldPassword);
}
