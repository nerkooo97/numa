// Appwrite konfiguracija. Sve ide kroz env varijable, ništa hardkodirano.
// Aktivira se postavljanjem VITE_DATA_BACKEND=appwrite + Appwrite env vars.

import { Client, Account, Databases, Storage, Avatars } from "appwrite";

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  bucketId: string;
}

export function readConfig(): AppwriteConfig {
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string;
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;
  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
  const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID as string;
  if (!endpoint || !projectId || !databaseId || !bucketId) {
    throw new Error(
      "Appwrite nije konfigurisan. Postavi VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_BUCKET_ID."
    );
  }
  return { endpoint, projectId, databaseId, bucketId };
}

let _client: Client | null = null;
let _account: Account | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;
let _avatars: Avatars | null = null;
let _config: AppwriteConfig | null = null;

export function getAppwrite() {
  if (!_client) {
    _config = readConfig();
    _client = new Client().setEndpoint(_config.endpoint).setProject(_config.projectId);
    _account = new Account(_client);
    _databases = new Databases(_client);
    _storage = new Storage(_client);
    _avatars = new Avatars(_client);
  }
  return {
    client: _client!,
    account: _account!,
    databases: _databases!,
    storage: _storage!,
    avatars: _avatars!,
    config: _config!,
  };
}
