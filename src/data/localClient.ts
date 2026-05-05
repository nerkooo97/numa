import { openDB, type IDBPDatabase } from "idb";
import type { DataClient, FileStore, Repo } from "./client";

const PREFIX = "numa-erp:";
const uid = () => crypto.randomUUID();

function makeRepo<T extends { id: string; createdAt?: string }>(table: string): Repo<T> {
  const key = PREFIX + table;
  const read = (): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  };
  const write = (rows: T[]) => localStorage.setItem(key, JSON.stringify(rows));
  return {
    async list() { return read(); },
    async get(id) { return read().find(r => r.id === id); },
    async create(data: any) {
      const row = { ...data, id: data.id || uid(), createdAt: data.createdAt || new Date().toISOString() } as T;
      const rows = read(); rows.push(row); write(rows); return row;
    },
    async update(id, patch) {
      const rows = read();
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) throw new Error(`${table}: not found ${id}`);
      rows[idx] = { ...rows[idx], ...patch, id } as T;
      write(rows);
      return rows[idx];
    },
    async remove(id) { write(read().filter(r => r.id !== id)); },
  };
}

let dbp: Promise<IDBPDatabase> | null = null;
const getDB = () => {
  if (!dbp) dbp = openDB("numa-erp-files", 1, {
    upgrade(db) {
      db.createObjectStore("files");
      db.createObjectStore("meta");
    },
  });
  return dbp;
};

const files: FileStore = {
  async upload(file, folder) {
    const id = uid();
    const db = await getDB();
    const name = folder ? `${folder}/${file.name}` : file.name;
    await db.put("files", await file.arrayBuffer(), id);
    await db.put("meta", { name, type: file.type, size: file.size }, id);
    return id;
  },
  async getUrl(fileId) {
    const db = await getDB();
    const buf = await db.get("files", fileId);
    const meta = await db.get("meta", fileId);
    if (!buf) return null;
    return URL.createObjectURL(new Blob([buf], { type: meta?.type || "application/octet-stream" }));
  },
  async remove(fileId) {
    const db = await getDB();
    await db.delete("files", fileId);
    await db.delete("meta", fileId);
  },
  async getMeta(fileId) {
    const db = await getDB();
    return (await db.get("meta", fileId)) || null;
  },
};

export const localClient: DataClient = {
  users: makeRepo("users"),
  employees: makeRepo("employees"),
  employeeDocuments: makeRepo("employee_documents"),
  projects: makeRepo("projects"),
  projectDocuments: makeRepo("project_documents"),
  phases: makeRepo("phases"),
  phaseAssignments: makeRepo("phase_assignments"),
  hours: makeRepo("hours"),
  equipment: makeRepo("equipment"),
  equipmentItems: makeRepo("equipment_items"),
  equipmentCategories: makeRepo("equipment_categories"),
  expenses: makeRepo("expenses"),
  cashPayments: makeRepo("cash_payments"),
  cashJustifications: makeRepo("cash_justifications"),
  cashbox: makeRepo("cashbox"),
  audit: makeRepo("audit"),
  notifications: makeRepo("notifications"),
  visaAttachments: makeRepo("visa_attachments"),
  phaseChecklist: makeRepo("phase_checklist"),
  invoices: makeRepo("invoices"),
  photos: makeRepo("photos"),
  files,
};
