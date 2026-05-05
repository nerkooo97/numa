import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  pageItems: T[];
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}

/**
 * Klijent-side paginacija. Reset-uje stranicu kad se promijeni broj rezultata.
 */
export function usePagination<T>(items: T[], initialPageSize = 25): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // ako se filteri smanje, vrati na zadnju validnu stranicu
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, pageSize, pageCount, total, pageItems, setPage, setPageSize };
}
