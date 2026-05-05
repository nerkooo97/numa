import { corsHeaders } from "@supabase/supabase-js/cors";

const ENDPOINT = Deno.env.get("APPWRITE_ENDPOINT") ?? "";
const PROJECT_ID = Deno.env.get("APPWRITE_PROJECT_ID") ?? "";
const API_KEY = Deno.env.get("APPWRITE_API_KEY") ?? "";

function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID && API_KEY);
}

async function appwrite(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-Key": API_KEY,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (data as any)?.message || `Appwrite ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

type Action =
  | { action: "listUsers"; search?: string }
  | { action: "createUser"; email: string; name: string; password: string }
  | { action: "updateUserName"; userId: string; name: string }
  | { action: "updateUserPassword"; userId: string; password: string }
  | { action: "updateUserStatus"; userId: string; status: boolean }
  | { action: "updateUserLabels"; userId: string; labels: string[] }
  | { action: "deleteUser"; userId: string }
  | { action: "listTeams" }
  | { action: "createTeam"; name: string; roles?: string[] }
  | { action: "deleteTeam"; teamId: string }
  | { action: "listMemberships"; teamId: string }
  | { action: "addUserToTeam"; teamId: string; userId: string; roles?: string[] }
  | { action: "updateMembershipRoles"; teamId: string; membershipId: string; roles: string[] }
  | { action: "removeMembership"; teamId: string; membershipId: string };

async function dispatch(p: Action): Promise<unknown> {
  switch (p.action) {
    case "listUsers": {
      const qs = new URLSearchParams();
      qs.set("queries[]", `limit(100)`);
      if (p.search) qs.set("search", p.search);
      return appwrite(`/users?${qs.toString()}`);
    }
    case "createUser":
      return appwrite(`/users`, {
        method: "POST",
        body: JSON.stringify({
          userId: "unique()",
          email: p.email,
          password: p.password,
          name: p.name,
        }),
      });
    case "updateUserName":
      return appwrite(`/users/${p.userId}/name`, { method: "PATCH", body: JSON.stringify({ name: p.name }) });
    case "updateUserPassword":
      return appwrite(`/users/${p.userId}/password`, { method: "PATCH", body: JSON.stringify({ password: p.password }) });
    case "updateUserStatus":
      return appwrite(`/users/${p.userId}/status`, { method: "PATCH", body: JSON.stringify({ status: p.status }) });
    case "updateUserLabels":
      return appwrite(`/users/${p.userId}/labels`, { method: "PUT", body: JSON.stringify({ labels: p.labels }) });
    case "deleteUser":
      await appwrite(`/users/${p.userId}`, { method: "DELETE" });
      return { ok: true };
    case "listTeams":
      return appwrite(`/teams?queries[]=limit(100)`);
    case "createTeam":
      return appwrite(`/teams`, {
        method: "POST",
        body: JSON.stringify({ teamId: "unique()", name: p.name, roles: p.roles ?? [] }),
      });
    case "deleteTeam":
      await appwrite(`/teams/${p.teamId}`, { method: "DELETE" });
      return { ok: true };
    case "listMemberships":
      return appwrite(`/teams/${p.teamId}/memberships?queries[]=limit(200)`);
    case "addUserToTeam":
      return appwrite(`/teams/${p.teamId}/memberships`, {
        method: "POST",
        body: JSON.stringify({ userId: p.userId, roles: p.roles ?? [] }),
      });
    case "updateMembershipRoles":
      return appwrite(`/teams/${p.teamId}/memberships/${p.membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ roles: p.roles }),
      });
    case "removeMembership":
      await appwrite(`/teams/${p.teamId}/memberships/${p.membershipId}`, { method: "DELETE" });
      return { ok: true };
    default:
      throw new Error("Unknown action");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    if (!isConfigured()) {
      return new Response(
        JSON.stringify({ error: "Appwrite nije konfigurisan na serveru (APPWRITE_ENDPOINT/PROJECT_ID/API_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = (await req.json()) as Action;
    if (!body || typeof (body as any).action !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'action' in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await dispatch(body);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
