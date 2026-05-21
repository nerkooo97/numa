import {
  LayoutDashboard, Users, FolderKanban, Clock, Wrench, FileText,
  Banknote, Wallet, BriefcaseBusiness, BarChart3, Bell, ShieldCheck, History, FolderTree, Files, Layers3,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Role } from "@/data/types";

import DashboardPage from "@features/dashboard/DashboardPage";
import EmployeesPage from "@features/employees/pages/EmployeesPage";
import EmployeeDetailPage from "@features/employees/pages/EmployeeDetailPage";
import ProjectsPage from "@features/projects/pages/ProjectsPage";
import ProjectDetailPage from "@features/projects/pages/ProjectDetailPage";
import HoursPage from "@features/hours/pages/HoursPage";
import EquipmentPage from "@features/equipment/pages/EquipmentPage";
import ExpensesPage from "@features/expenses/ExpensesPage";
import CashPage from "@features/cash/CashPage";
import CashboxPage from "@features/cashbox/CashboxPage";
import PermitsPage from "@features/permits/PermitsPage";
import PermitCategoriesPage from "@features/permits/pages/PermitCategoriesPage";
import PermitDocumentTypesPage from "@features/permits/pages/PermitDocumentTypesPage";
import PermitTemplatesPage from "@features/permits/pages/PermitTemplatesPage";
import PermitTemplateDetailPage from "@features/permits/pages/PermitTemplateDetailPage";
import PermitCaseDetailPage from "@features/permits/pages/PermitCaseDetailPage";
import AnalyticsPage from "@features/analytics/AnalyticsPage";
import NotificationsPage from "@features/notifications/NotificationsPage";
import UsersPage from "@features/users/UsersPage";
import AuditLogPage from "@features/audit/AuditLogPage";
import ProfilePage from "@features/auth/ProfilePage";


/**
 * 🎯 CENTRALNI FAJL ISTINE — sve stranice, ko ih može otvoriti, gdje stoje u meniju.
 *
 * Dodaješ novu stranicu? Samo ovdje:
 *   1) ubaci u APP_ROUTES (path, komponenta, dozvoljene uloge)
 *   2) opcionalno dodaj u NAV_ITEMS (sidebar/command palette)
 *   3) opcionalno dodaj u QUICK_ACTIONS (Cmd+K brze akcije)
 *
 * App.tsx, AppSidebar i CommandPalette automatski hvataju izmjene.
 */

export const ALL_ROLES: Role[] = ["admin", "poslovodja"];
export const ADMIN_ONLY: Role[] = ["admin"];

// ---------- ROUTES (router je render iz ovoga) ----------
export interface AppRoute {
  path: string;
  component: ComponentType;
  roles: Role[];           // ko smije pristupiti
  showInBreadcrumbs?: boolean;
}

export const APP_ROUTES: AppRoute[] = [
  { path: "/",              component: DashboardPage,       roles: ALL_ROLES },
  { path: "/zaposleni",     component: EmployeesPage,       roles: ALL_ROLES },
  { path: "/zaposleni/:id", component: EmployeeDetailPage,  roles: ALL_ROLES },
  { path: "/projekti",      component: ProjectsPage,        roles: ALL_ROLES },
  { path: "/projekti/:id",  component: ProjectDetailPage,   roles: ALL_ROLES },
  { path: "/sati",          component: HoursPage,           roles: ALL_ROLES },
  { path: "/oprema",        component: EquipmentPage,       roles: ALL_ROLES },
  { path: "/troskovi",      component: ExpensesPage,        roles: ALL_ROLES },
  { path: "/dozvole",       component: PermitsPage,         roles: ALL_ROLES },
  { path: "/dozvole/kategorije", component: PermitCategoriesPage, roles: ALL_ROLES },
  { path: "/dozvole/tipovi-dokumenata", component: PermitDocumentTypesPage, roles: ALL_ROLES },
  { path: "/dozvole/checkliste", component: PermitTemplatesPage, roles: ALL_ROLES },
  { path: "/dozvole/checkliste/:id", component: PermitTemplateDetailPage, roles: ALL_ROLES },
  { path: "/dozvole/predmeti/:id", component: PermitCaseDetailPage, roles: ALL_ROLES },
  { path: "/analitika",     component: AnalyticsPage,       roles: ALL_ROLES },
  { path: "/notifikacije",  component: NotificationsPage,   roles: ALL_ROLES },

  { path: "/kes",           component: CashPage,            roles: ADMIN_ONLY },
  { path: "/kasa",          component: CashboxPage,         roles: ADMIN_ONLY },
  { path: "/korisnici",     component: UsersPage,           roles: ADMIN_ONLY },
  { path: "/aktivnosti",    component: AuditLogPage,        roles: ADMIN_ONLY },
  { path: "/profil",        component: ProfilePage,         roles: ALL_ROLES },
  
];

// ---------- SIDEBAR / COMMAND PALETTE ----------
export type NavGroup = "operativa" | "finansije" | "dozvole" | "ostalo";

export interface NavItem {
  title: string;            // prikazano ime
  url: string;              // mora postojati u APP_ROUTES
  icon: LucideIcon;
  group: NavGroup;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  // Operativa
  { title: "Početna",   url: "/",          icon: LayoutDashboard, group: "operativa", roles: ALL_ROLES },
  { title: "Zaposleni", url: "/zaposleni", icon: Users,           group: "operativa", roles: ALL_ROLES },
  { title: "Projekti",  url: "/projekti",  icon: FolderKanban,    group: "operativa", roles: ALL_ROLES },
  { title: "Sati",      url: "/sati",      icon: Clock,           group: "operativa", roles: ALL_ROLES },
  { title: "Oprema",    url: "/oprema",    icon: Wrench,          group: "operativa", roles: ALL_ROLES },

  // Finansije
  { title: "Troškovi",   url: "/troskovi", icon: FileText, group: "finansije", roles: ALL_ROLES },
  { title: "Keš isplate", url: "/kes",     icon: Banknote, group: "finansije", roles: ADMIN_ONLY },
  { title: "Kasa",       url: "/kasa",     icon: Wallet,   group: "finansije", roles: ADMIN_ONLY },

  // Dozvole
  { title: "Pregled",            url: "/dozvole",                  icon: BriefcaseBusiness, group: "dozvole", roles: ALL_ROLES },
  { title: "Kategorije",         url: "/dozvole/kategorije",       icon: FolderTree,        group: "dozvole", roles: ALL_ROLES },
  { title: "Tipovi dokumenata",  url: "/dozvole/tipovi-dokumenata",icon: Files,             group: "dozvole", roles: ALL_ROLES },
  { title: "Checkliste",         url: "/dozvole/checkliste",       icon: Layers3,           group: "dozvole", roles: ALL_ROLES },

  // Ostalo
  { title: "Analitika",    url: "/analitika",    icon: BarChart3,   group: "ostalo", roles: ALL_ROLES },
  { title: "Notifikacije", url: "/notifikacije", icon: Bell,        group: "ostalo", roles: ALL_ROLES },
  { title: "Korisnici",    url: "/korisnici",    icon: ShieldCheck, group: "ostalo", roles: ADMIN_ONLY },
  { title: "Aktivnosti",   url: "/aktivnosti",   icon: History,     group: "ostalo", roles: ADMIN_ONLY },
  
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  operativa: "Operativa",
  finansije: "Finansije",
  dozvole: "Dozvole",
  ostalo: "Ostalo",
};

// ---------- QUICK ACTIONS (Cmd+K) ----------
export interface QuickAction {
  label: string;
  url: string;
  roles: Role[];
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Novi unos sati",   url: "/sati?new=1",      roles: ALL_ROLES },
  { label: "Novi trošak",      url: "/troskovi?new=1",  roles: ALL_ROLES },
  { label: "Nova keš isplata", url: "/kes?new=1",       roles: ADMIN_ONLY },
  { label: "Novi radnik",      url: "/zaposleni?new=1", roles: ALL_ROLES },
  { label: "Novi projekat",    url: "/projekti?new=1",  roles: ALL_ROLES },
];

// ---------- HELPERS ----------
export const canAccess = (roles: Role[], userRole?: Role | null) =>
  !!userRole && roles.includes(userRole);

export const navItemsFor = (userRole?: Role | null) =>
  NAV_ITEMS.filter(i => canAccess(i.roles, userRole));

export const quickActionsFor = (userRole?: Role | null) =>
  QUICK_ACTIONS.filter(a => canAccess(a.roles, userRole));

export const routesFor = (userRole?: Role | null) =>
  APP_ROUTES.filter(r => canAccess(r.roles, userRole));
