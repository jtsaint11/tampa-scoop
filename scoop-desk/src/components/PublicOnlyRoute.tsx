import { useConvexAuth } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router";
import { resolveSignedInReturn } from "@/auth/oauthReturn";
import { Card, Skeleton } from "@/ui";

function AuthFormSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Skeleton className="rounded-md bg-muted mx-auto mb-8 h-9 w-32" />
        <Card className="rounded-xl border bg-card text-card-foreground shadow-sm space-y-4 p-6">
          <Skeleton className="rounded-md bg-muted h-6 w-32" />
          <Skeleton className="rounded-md bg-muted h-4 w-48" />
          <div className="space-y-2">
            <Skeleton className="rounded-md bg-muted h-4 w-12" />
            <Skeleton className="rounded-md bg-muted h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="rounded-md bg-muted h-4 w-16" />
            <Skeleton className="rounded-md bg-muted h-10 w-full" />
          </div>
          <Skeleton className="rounded-md bg-muted h-10 w-full" />
        </Card>
        <Skeleton className="rounded-md bg-muted mx-auto mt-4 h-4 w-48" />
      </div>
    </div>
  );
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthFormSkeleton />;
  }

  if (isAuthenticated) {
    // Back to the protected page ProtectedRoute bounced from, when there is
    // one (a sign-in that completed after the bounce), else the dashboard.
    return <Navigate to={resolveSignedInReturn(location.state)} replace />;
  }

  return <Outlet />;
}
