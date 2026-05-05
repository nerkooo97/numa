import type { ID } from "@features/auth/types";

export interface EquipmentCategory {
  id: ID;
  name: string;
  createdAt: string;
}

export interface EquipmentItem {
  id: ID;
  name: string;
  sku?: string;
  categoryId?: ID;
  quantity: number;
  unitValue?: number;
  location?: string;
  photoFileId?: ID;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface EquipmentAssignment {
  id: ID;
  itemId?: ID;
  employeeId: ID;
  toolName: string;
  quantity?: number;
  projectId?: ID;
  assignedAt: string;
  returnedAt?: string;
  condition: "ispravno" | "ostecено" | "izgubljeno" | "vraceno";
  notes?: string;
  createdAt: string;
}
