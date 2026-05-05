import { useCallback, useEffect, useState } from "react";

// Jednostavna globalna sabirnica za invalidaciju.
type Listener = () => void;
const listeners = new Set<Listener>();

export function bumpData(key?: string) {
  // key trenutno nije potreban — bump-uje sve liste
  void key;
  listeners.forEach(l => l());
}

export function useDataVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const l = () => setV(x => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return v;
}

export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []): { data: T | undefined; loading: boolean; reload: () => void } {
  const v = useDataVersion();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => { bumpData(); }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then(d => { if (alive) { setData(d); setLoading(false); } }).catch(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);
  return { data, loading, reload };
}
