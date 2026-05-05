// Appwrite implementacija DataClient interfejsa.
// Aktivira se kroz src/data/index.ts kada je VITE_DATA_BACKEND=appwrite.
// UI ostaje netaknut — sva komunikacija ide kroz repos i files API-je.

import type { DataClient } from "./client";
import { COLLECTIONS } from "./appwrite/collections";
import { makeAppwriteRepo } from "./appwrite/repo";
import { appwriteFiles } from "./appwrite/files";

export const appwriteClient: DataClient = {
  users: makeAppwriteRepo(COLLECTIONS.users),
  employees: makeAppwriteRepo(COLLECTIONS.employees),
  employeeDocuments: makeAppwriteRepo(COLLECTIONS.employeeDocuments),
  projects: makeAppwriteRepo(COLLECTIONS.projects),
  projectDocuments: makeAppwriteRepo(COLLECTIONS.projectDocuments),
  phases: makeAppwriteRepo(COLLECTIONS.phases),
  phaseAssignments: makeAppwriteRepo(COLLECTIONS.phaseAssignments),
  hours: makeAppwriteRepo(COLLECTIONS.hours),
  equipment: makeAppwriteRepo(COLLECTIONS.equipment),
  equipmentItems: makeAppwriteRepo(COLLECTIONS.equipmentItems),
  equipmentCategories: makeAppwriteRepo(COLLECTIONS.equipmentCategories),
  expenses: makeAppwriteRepo(COLLECTIONS.expenses),
  cashPayments: makeAppwriteRepo(COLLECTIONS.cashPayments),
  cashJustifications: makeAppwriteRepo(COLLECTIONS.cashJustifications),
  cashbox: makeAppwriteRepo(COLLECTIONS.cashbox),
  audit: makeAppwriteRepo(COLLECTIONS.audit),
  notifications: makeAppwriteRepo(COLLECTIONS.notifications),
  visaAttachments: makeAppwriteRepo(COLLECTIONS.visaAttachments),
  phaseChecklist: makeAppwriteRepo(COLLECTIONS.phaseChecklist),
  invoices: makeAppwriteRepo(COLLECTIONS.invoices),
  photos: makeAppwriteRepo(COLLECTIONS.photos),
  files: appwriteFiles,
};
