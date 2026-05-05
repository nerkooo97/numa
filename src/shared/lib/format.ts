export const fmtKM = (n: number) =>
  new Intl.NumberFormat("bs-BA", { style: "currency", currency: "BAM", maximumFractionDigits: 2 }).format(n || 0);

export const fmtNum = (n: number, d = 2) =>
  new Intl.NumberFormat("bs-BA", { maximumFractionDigits: d }).format(n || 0);

export const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const daysUntil = (d?: string | null): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
};

export const docStatus = (expiresAt?: string | null): "valid" | "expiring" | "expired" | "none" => {
  const days = daysUntil(expiresAt);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
};
