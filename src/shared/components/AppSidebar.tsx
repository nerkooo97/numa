import { NavLink, useLocation } from "react-router-dom";
import { Building2, LogOut, PanelLeft } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { NAV_GROUP_LABELS, navItemsFor, type NavGroup, type NavItem } from "@/config/navigation";

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname.startsWith(url);
  const items = navItemsFor(user?.role);
  const groups: NavGroup[] = ["operativa", "finansije", "ostalo"];

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className="flex items-center gap-2"
          onClick={() => { if (isMobile) setOpenMobile(false); }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border h-14 p-0">
        <div className="flex items-center gap-2 px-2 h-full">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight flex-1 min-w-0">
              <div className="font-medium text-[15px] tracking-tight truncate">NUMA ERP</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">NUMA d.o.o.</div>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent" onClick={toggleSidebar} title="Skupi meni">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map(g => {
          const groupItems = items.filter(i => i.group === g);
          if (groupItems.length === 0) return null;
          return (
            <SidebarGroup key={g}>
              {!collapsed && <SidebarGroupLabel>{NAV_GROUP_LABELS[g]}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>{groupItems.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground grid place-items-center text-xs font-semibold shrink-0">
            {(user?.name || "?").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60 capitalize">{user?.role}</div>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout} title="Odjava">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
