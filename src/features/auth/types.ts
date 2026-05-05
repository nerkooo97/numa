export type ID = string;
export type Role = "admin" | "poslovodja";

export interface User {
  id: ID;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
}
