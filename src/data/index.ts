import type { DataClient } from "./client";
import { localClient } from "./localClient";
import { appwriteClient } from "./appwriteClient";

// Backend prebacivanje preko env varijable:
//   VITE_DATA_BACKEND=local     (default) -> localStorage + IndexedDB
//   VITE_DATA_BACKEND=appwrite            -> Appwrite (Databases + Storage)
//
// Appwrite implementacija je spremna u src/data/appwrite/* i src/data/appwriteClient.ts,
// ali se ne aktivira dok god env flag nije postavljen. UI ostaje isti.
const backend = (import.meta.env.VITE_DATA_BACKEND as string) || "local";

export const db: DataClient = backend === "appwrite" ? appwriteClient : localClient;

export type { DataClient } from "./client";
export * from "./types";
