import { useConvexAuth } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router";
import {
  BOUNCED_FROM_STATE_KEY,
  stripAutoSignInIntent,
} from "@/auth/oauthReturn";
import { Skeleton } from "@/ui";

function AppSkeleton() {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden h-screen w-(--sidebar-width) shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border p-4">
          <Skeleton className="bg-muted size-8 rounded-lg" />
          <Skeleton className="rounded-md bg-muted h-5 w-16" />
        </div>
        <div className="flex-1 space-y-2 p-4">
          <Skeleton className="rounded-md bg-muted h-8 w-full" />
          <Skeleton className="rounded-md bg-muted h-8 w-full" />
        </div>
        <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
          <Skeleton className="bg-muted size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="rounded-md bg-muted h-3.5 w-24" />
            <Skeleton className="rounded-md bg-muted h-3 w-32" />
          </div>
        </div>
      </aside>
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <Skeleton className="rounded-md bg-muted h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="rounded-md bg-muted h-32" />
          <Skeleton className="rounded-md bg-muted h-32" />
          <Skeleton className="rounded-md bg-muted h-32" />
        </div>
      </main>
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppSkeleton />;
  }

  if (!isAuthenticated) {
    // Carry the page being left so PublicOnlyRoute can return a visitor who
    // signs in on /login (e.g. the edge hand-off completing) to it, not to
    // the dashboard. The intent param is spent on arrival and never returns.
    return (
      <Navigate
        to="/login"
        replace
        state={{
          [BOUNCED_FROM_STATE_KEY]: stripAutoSignInIntent(
            location.pathname,
            location.search,
          ),
        }}
      />
    );
  }

  return <Outlet />;
}
