import { lazy, Suspense } from "react";

// Private Desk: every route goes through email + password sign-in.
const AuthenticatedAppRoutes = lazy(() =>
  import("./authenticated/AuthenticatedAppRoutes").then(module => ({
    default: module.AuthenticatedAppRoutes,
  })),
);

export function AuthStrategyRoutes() {
  return (
    <Suspense fallback={null}>
      <AuthenticatedAppRoutes />
    </Suspense>
  );
}
