import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { Search } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Početna",
  "/zaposleni": "Zaposleni",
  "/projekti": "Projekti",
  "/sati": "Radni sati",
  "/oprema": "Oprema",
  "/troskovi": "Troškovi",
  "/kes": "Keš isplate",
  "/kasa": "Kasa",
  "/dozvole": "Dozvole i predmeti",
  "/dozvole/kategorije": "Kategorije dozvola",
  "/dozvole/tipovi-dokumenata": "Tipovi dokumenata",
  "/dozvole/checkliste": "Checkliste",
  "/analitika": "Analitika",
  "/notifikacije": "Notifikacije",
  "/korisnici": "Korisnici",
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const segs = pathname.split("/").filter(Boolean);
  const title = titles[pathname] || (segs[0] ? titles["/" + segs[0]] : "Početna") || "NUMA ERP";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-3 px-5 sticky top-0 z-30">
            <SidebarTrigger />
            <h1 className="text-[15px] font-normal tracking-tight text-foreground">{title}</h1>
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="ml-auto hidden md:flex items-center gap-2 h-8 px-3 rounded-[6px] border border-border bg-muted/40 text-xs text-muted-foreground hover:bg-muted transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Pretraga…</span>
              <kbd className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-background">⌘K</kbd>
            </button>
          </header>
          <main className="flex-1 p-3 sm:p-5 md:p-8 max-w-[1400px] w-full mx-auto">
            <Outlet />
            <CommandPalette />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
