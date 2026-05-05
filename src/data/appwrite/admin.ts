// Appwrite admin klijent — poziva edge funkciju "appwrite-admin"
// koja drži API key sigurno na serveru. Frontend više NIKAD ne vidi APPWRITE_API_KEY.

import { supabase } from "@/integrations/supabase/client";

export function isAppwriteAdminConfigured(): boolean {
  // Konfiguracija se sada provjerava na serveru. Pretpostavljamo da je dostupno.
  return true;
}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("appwrite-admin", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || "Greška u pozivu appwrite-admin");
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
}

// =================== Users ===================

export interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  status: boolean;
  registration: string;
  labels?: string[];
}

export interface ListUsersResponse {
  total: number;
  users: AppwriteUser[];
}

export const listUsers = (search?: string) =>
  call<ListUsersResponse>("listUsers", { search });

export const createUser = (input: { email: string; name: string; password: string }) =>
  call<AppwriteUser>("createUser", input);

export const updateUserName = (userId: string, name: string) =>
  call<AppwriteUser>("updateUserName", { userId, name });

export const updateUserPassword = (userId: string, password: string) =>
  call<AppwriteUser>("updateUserPassword", { userId, password });

export const updateUserStatus = (userId: string, status: boolean) =>
  call<AppwriteUser>("updateUserStatus", { userId, status });

export const updateUserLabels = (userId: string, labels: string[]) =>
  call<AppwriteUser>("updateUserLabels", { userId, labels });

export const deleteUser = (userId: string) =>
  call<void>("deleteUser", { userId });

// =================== Teams ===================

export interface AppwriteTeam {
  $id: string;
  name: string;
  total: number;
  prefs?: Record<string, unknown>;
}

export interface AppwriteMembership {
  $id: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  teamName: string;
  roles: string[];
  joined: string;
  confirm: boolean;
}

export const listTeams = () =>
  call<{ total: number; teams: AppwriteTeam[] }>("listTeams");

export const createTeam = (name: string, roles: string[] = []) =>
  call<AppwriteTeam>("createTeam", { name, roles });

export const deleteTeam = (teamId: string) =>
  call<void>("deleteTeam", { teamId });

export const listMemberships = (teamId: string) =>
  call<{ total: number; memberships: AppwriteMembership[] }>("listMemberships", { teamId });

export const addUserToTeam = (teamId: string, userId: string, roles: string[] = []) =>
  call<AppwriteMembership>("addUserToTeam", { teamId, userId, roles });

export const updateMembershipRoles = (teamId: string, membershipId: string, roles: string[]) =>
  call<AppwriteMembership>("updateMembershipRoles", { teamId, membershipId, roles });

export const removeMembership = (teamId: string, membershipId: string) =>
  call<void>("removeMembership", { teamId, membershipId });
