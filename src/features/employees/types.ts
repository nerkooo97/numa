import type { ID } from "@features/auth/types";

export type EmployeeType = "domaci" | "strani";

export interface Employee {
  id: ID;
  firstName: string;
  lastName: string;
  identifier: string; // JMBG ili broj pasoša
  citizenship: string;
  birthDate?: string;
  contact?: string;
  type: EmployeeType;
  hourlyRate: number; // KM/h
  active: boolean;
  createdAt: string;
}

export type DocKind =
  | "ljekarski"
  | "zastita_na_radu"
  | "pasos"
  | "ugovor"
  | "ostalo";

export interface EmployeeDocument {
  id: ID;
  employeeId: ID;
  kind: DocKind;
  name: string;
  issuedAt?: string;
  expiresAt?: string;
  fileId?: ID;
  notes?: string;
  createdAt: string;
}
