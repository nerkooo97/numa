// Generički Repo<T> nad Appwrite Databases API-jem.
// Mapira { id, ...rest } <-> { $id, ...rest }. createdAt drži aplikacija
// (isto kao localClient), tako da postojeći UI kod ne mora ništa mijenjati.

import { ID, Query, type Models } from "appwrite";
import type { Repo } from "../client";
import { getAppwrite } from "./config";

const PAGE_SIZE = 100;

function fromDoc<T>(doc: Models.Document): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $id, $collectionId, $databaseId, $permissions, $createdAt, $updatedAt, ...rest } = doc as any;
  return { id: $id, ...rest } as T;
}

function toPayload<T>(data: any): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = data;
  return rest;
}

export function makeAppwriteRepo<T extends { id: string; createdAt?: string }>(collectionId: string): Repo<T> {
  return {
    async list() {
      const { databases, config } = getAppwrite();
      const out: T[] = [];
      let cursor: string | undefined;
      // Paginacija (Appwrite vraća max 100 po pozivu)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const queries = [Query.limit(PAGE_SIZE)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const res = await databases.listDocuments(config.databaseId, collectionId, queries);
        for (const d of res.documents) out.push(fromDoc<T>(d));
        if (res.documents.length < PAGE_SIZE) break;
        cursor = res.documents[res.documents.length - 1].$id;
      }
      return out;
    },
    async get(id) {
      const { databases, config } = getAppwrite();
      try {
        const doc = await databases.getDocument(config.databaseId, collectionId, id);
        return fromDoc<T>(doc);
      } catch {
        return undefined;
      }
    },
    async create(data: any) {
      const { databases, config } = getAppwrite();
      const docId = data.id || ID.unique();
      const payload: any = toPayload<T>(data);
      // Audit kolekcija koristi `at` umjesto `createdAt` i ne sadrži `createdAt` atribut.
      if (collectionId !== "audit") {
        payload.createdAt = data.createdAt || new Date().toISOString();
      }
      const doc = await databases.createDocument(config.databaseId, collectionId, docId, payload);
      return fromDoc<T>(doc);
    },
    async update(id, patch) {
      const { databases, config } = getAppwrite();
      const doc = await databases.updateDocument(config.databaseId, collectionId, id, toPayload<T>(patch));
      return fromDoc<T>(doc);
    },
    async remove(id) {
      const { databases, config } = getAppwrite();
      await databases.deleteDocument(config.databaseId, collectionId, id);
    },
  };
}
