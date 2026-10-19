import { useAction } from "convex/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { PublicBusiness, PublicCategory } from "../../convex/lib/directory";
import { FIXTURE_BUSINESSES } from "@/lib/fixture";

type DirectoryState = {
  status: "loading" | "ready" | "error";
  categories: PublicCategory[];
  businesses: PublicBusiness[];
  fetchedAt: number | null;
  stale: boolean;
  reload: () => void;
};

const DirectoryContext = createContext<DirectoryState | null>(null);

/** Screenshot-only sample data. Never set in a deployed build. */
const USE_FIXTURE = import.meta.env.VITE_DIRECTORY_FIXTURE === "1";

function withFixture(categories: PublicCategory[], businesses: PublicBusiness[]) {
  if (!USE_FIXTURE) return { categories, businesses };
  const all = [...FIXTURE_BUSINESSES, ...businesses];
  return {
    businesses: all,
    categories: categories.map(c => {
      const inCat = all.filter(b => b.categorySlug === c.slug);
      return { ...c, count: inCat.length, featuredCount: inCat.filter(b => b.featured).length };
    }),
  };
}

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const getDirectory = useAction(api.directory.getDirectory);
  const [state, setState] = useState<Omit<DirectoryState, "reload">>({
    status: "loading",
    categories: [],
    businesses: [],
    fetchedAt: null,
    stale: false,
  });

  const load = useCallback(() => {
    setState(s => ({ ...s, status: s.fetchedAt ? s.status : "loading" }));
    getDirectory({})
      .then(r =>
        setState({
          status: "ready",
          ...withFixture(r.categories, r.businesses),
          fetchedAt: r.fetchedAt,
          stale: r.stale,
        }),
      )
      .catch(() => setState(s => ({ ...s, status: "error" })));
  }, [getDirectory]);

  useEffect(() => {
    load();
  }, [load]);

  return <DirectoryContext.Provider value={{ ...state, reload: load }}>{children}</DirectoryContext.Provider>;
}

export function useDirectory(): DirectoryState {
  const ctx = useContext(DirectoryContext);
  if (!ctx) throw new Error("useDirectory must be used inside DirectoryProvider");
  return ctx;
}
