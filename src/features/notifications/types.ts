import type { ID } from "@features/auth/types";

export interface Notification {
  id: ID;
  at: string;
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  read: boolean;
  link?: string;
}
