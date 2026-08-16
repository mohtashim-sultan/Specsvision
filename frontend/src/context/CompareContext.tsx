import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const STORAGE_KEY = "specsvision_compare_ids";
const MAX_COMPARE = 4;

type CompareContextType = {
  ids: number[];
  count: number;
  has: (id: number) => boolean;
  toggle: (id: number, name?: string) => void;
  remove: (id: number) => void;
  clear: () => void;
};

const CompareContext = createContext<CompareContextType | undefined>(undefined);

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback(
    (id: number, name?: string) => {
      if (ids.includes(id)) {
        setIds((prev) => prev.filter((x) => x !== id));
        toast.success(`Removed${name ? ` ${name}` : ""} from compare`);
      } else {
        if (ids.length >= MAX_COMPARE) {
          toast.error(`You can compare up to ${MAX_COMPARE} frames at once`);
          return;
        }
        setIds((prev) => [...prev, id]);
        toast.success(`Added${name ? ` ${name}` : ""} to compare`);
      }
    },
    [ids],
  );

  const remove = useCallback((id: number) => setIds((prev) => prev.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  return (
    <CompareContext.Provider value={{ ids, count: ids.length, has: (id) => ids.includes(id), toggle, remove, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextType {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within a CompareProvider");
  return ctx;
}
