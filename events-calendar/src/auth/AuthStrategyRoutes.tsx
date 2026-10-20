import { lazy, Suspense } from "react";

// Public site: no sign-in. All routes are public.
const PublicAppRoutes = lazy(() =>
  import("./public/PublicAppRoutes").then(module => ({
    default: module.PublicAppRoutes,
  })),
);

export function AuthStrategyRoutes() {
  return (
    <Suspense fallback={null}>
      <PublicAppRoutes />
    </Suspense>
  );
}
