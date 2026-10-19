import { useConvexAuth } from "convex/react";
import { Navigate } from "react-router";

export function HomeRedirect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? "/queue" : "/login"} replace />;
}
