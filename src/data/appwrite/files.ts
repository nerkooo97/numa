// FileStore nad Appwrite Storage sa podjelom po bucketima.
//
// Bucketi (kreirani u Appwrite):
//   - numa-projects   -> sve vezano za projekte (documents, photos, invoices, expenses, cash)
//   - numa-employees  -> dokumenti uposlenika i vize
//   - numa-cash       -> opravdanja gotovinskih isplata (van projekta)
//   - numa-expenses   -> računi troškova (van projekta)
//   - numa-misc       -> ostalo
//   - numa-files      -> legacy bucket, koristi se za stare fajlove (back-compat)
//
// fileId koji čuvamo u bazi je kompozitni "bucketId:fileId".
// Ako u bazi naiđemo na stari format bez ":", podrazumijevamo legacy bucket "numa-files".

import { ID } from "appwrite";
import type { FileStore } from "../client";
import { getAppwrite } from "./config";

const LEGACY_BUCKET = "numa-files";

function pickBucket(folder?: string): string {
  if (!folder) return "numa-misc";
  const f = folder.toLowerCase();
  if (f.startsWith("projects/")) return "numa-projects";
  if (f.startsWith("employees/")) return "numa-employees";
  if (f.startsWith("cash/")) return "numa-cash";
  if (f.startsWith("expenses/")) return "numa-expenses";
  return "numa-misc";
}

function parseId(stored: string): { bucket: string; id: string } {
  const idx = stored.indexOf(":");
  if (idx === -1) return { bucket: LEGACY_BUCKET, id: stored };
  return { bucket: stored.slice(0, idx), id: stored.slice(idx + 1) };
}

export const appwriteFiles: FileStore = {
  async upload(file, folder) {
    const { storage } = getAppwrite();
    const bucket = pickBucket(folder);
    // Appwrite Storage nema prave foldere, pa simuliramo kroz naziv fajla.
    const safeName = (file.name || "file").replace(/[^a-zA-Z0-9_\-\.]+/g, "_");
    const fullName = folder ? `${folder}/${safeName}` : safeName;
    const named = new File([file], fullName, { type: file.type, lastModified: file.lastModified });
    const res = await storage.createFile(bucket, ID.unique(), named);
    return `${bucket}:${res.$id}`;
  },
  async getUrl(stored) {
    try {
      const { storage } = getAppwrite();
      const { bucket, id } = parseId(stored);
      const url = storage.getFileView(bucket, id);
      return url.toString();
    } catch {
      return null;
    }
  },
  async remove(stored) {
    const { storage } = getAppwrite();
    const { bucket, id } = parseId(stored);
    await storage.deleteFile(bucket, id);
  },
  async getMeta(stored) {
    try {
      const { storage } = getAppwrite();
      const { bucket, id } = parseId(stored);
      const f = await storage.getFile(bucket, id);
      return { name: f.name, type: f.mimeType, size: f.sizeOriginal };
    } catch {
      return null;
    }
  },
};
