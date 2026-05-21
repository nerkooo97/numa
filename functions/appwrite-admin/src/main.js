const https = require("node:https");

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Key, X-Appwrite-JWT",
  "Content-Type": "application/json",
};

function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID && API_KEY);
}

function parseBody(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") {
    return req.bodyJson;
  }

  if (typeof req.bodyText === "string" && req.bodyText.trim()) {
    return JSON.parse(req.bodyText);
  }

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return null;
}

function appwrite(path, init = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ENDPOINT);
    const body = init.body || null;

    const request = https.request(
      url,
      {
        method: init.method || "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": PROJECT_ID,
          "X-Appwrite-Key": API_KEY,
          ...(init.headers || {}),
        },
      },
      (response) => {
        let raw = "";

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          let data = {};

          if (raw) {
            try {
              data = JSON.parse(raw);
            } catch {
              reject(new Error("Invalid JSON response from Appwrite"));
              return;
            }
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(data.message || `Appwrite ${response.statusCode}`));
            return;
          }

          resolve(data);
        });
      },
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

async function dispatch(payload) {
  switch (payload.action) {
    case "listUsers": {
      const searchParams = new URLSearchParams();
      searchParams.set("queries[]", "limit(100)");
      if (payload.search) {
        searchParams.set("search", payload.search);
      }
      return appwrite(`/users?${searchParams.toString()}`);
    }
    case "createUser":
      return appwrite("/users", {
        method: "POST",
        body: JSON.stringify({
          userId: "unique()",
          email: payload.email,
          password: payload.password,
          name: payload.name,
        }),
      });
    case "updateUserName":
      return appwrite(`/users/${payload.userId}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name: payload.name }),
      });
    case "updateUserPassword":
      return appwrite(`/users/${payload.userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: payload.password }),
      });
    case "updateUserStatus":
      return appwrite(`/users/${payload.userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: payload.status }),
      });
    case "updateUserLabels":
      return appwrite(`/users/${payload.userId}/labels`, {
        method: "PUT",
        body: JSON.stringify({ labels: payload.labels }),
      });
    case "deleteUser":
      await appwrite(`/users/${payload.userId}`, { method: "DELETE" });
      return { ok: true };
    case "listTeams":
      return appwrite("/teams?queries[]=limit(100)");
    case "createTeam":
      return appwrite("/teams", {
        method: "POST",
        body: JSON.stringify({
          teamId: "unique()",
          name: payload.name,
          roles: payload.roles || [],
        }),
      });
    case "deleteTeam":
      await appwrite(`/teams/${payload.teamId}`, { method: "DELETE" });
      return { ok: true };
    case "listMemberships":
      return appwrite(`/teams/${payload.teamId}/memberships?queries[]=limit(200)`);
    case "addUserToTeam":
      return appwrite(`/teams/${payload.teamId}/memberships`, {
        method: "POST",
        body: JSON.stringify({
          userId: payload.userId,
          roles: payload.roles || [],
        }),
      });
    case "updateMembershipRoles":
      return appwrite(`/teams/${payload.teamId}/memberships/${payload.membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ roles: payload.roles }),
      });
    case "removeMembership":
      await appwrite(`/teams/${payload.teamId}/memberships/${payload.membershipId}`, {
        method: "DELETE",
      });
      return { ok: true };
    default:
      throw new Error("Unknown action");
  }
}

module.exports = async ({ req, res, error }) => {
  if (req.method === "OPTIONS") {
    return res.text("", 204, corsHeaders);
  }

  if (!isConfigured()) {
    return res.json(
      {
        error: "Appwrite nije konfigurisan na serveru (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY).",
      },
      500,
      corsHeaders,
    );
  }

  try {
    const body = parseBody(req);

    if (!body || typeof body.action !== "string") {
      return res.json({ error: "Missing 'action' in body" }, 400, corsHeaders);
    }

    const data = await dispatch(body);
    return res.json(data, 200, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    error(message);
    return res.json({ error: message }, 400, corsHeaders);
  }
};
