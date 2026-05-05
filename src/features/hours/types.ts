import type { ID } from "@features/auth/types";

export interface HourEntry {
  id: ID;
  date: string;
  employeeId: ID;
  projectId: ID;
  phaseId?: ID;
  hours: number;
  hourlyRate: number; // snapshot
  notes?: string;
  approved?: boolean;
  approvedBy?: ID;
  approvedAt?: string;
  createdAt: string;
  createdBy: ID;
}
