import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@shared/hooks/usePagination";

interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  itemLabel?: string; // npr. "zapisa", "stavki"
  // dozvoljeno spread iz usePagination — ignorira se
  pageItems?: unknown;
}

export function PaginationBar({ page, pageCount, pageSize, total, setPage, setPageSize, itemLabel = "zapisa" }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t text-sm">
      <div className="text-muted-foreground">
        {from}–{to} od {total} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground hidden sm:inline">Po stranici</span>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-2">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-2 tnum text-muted-foreground">{page} / {pageCount}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage(pageCount)}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
