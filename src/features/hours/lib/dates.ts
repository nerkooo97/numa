export const today = () => new Date().toISOString().slice(0, 10);
export const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
export const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export const startOfWeek = (d: string) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x.toISOString().slice(0, 10); };
export const startOfMonth = (d: string) => { const x = new Date(d); x.setDate(1); return x.toISOString().slice(0, 10); };

const LOCK_KEY = "numa-erp:hours-lock";
export const getLock = (): string | null => localStorage.getItem(LOCK_KEY);
export const setLock = (d: string | null) => { if (d) localStorage.setItem(LOCK_KEY, d); else localStorage.removeItem(LOCK_KEY); };
