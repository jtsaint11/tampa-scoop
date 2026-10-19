import { ConvexProvider } from "convex/react";
import { useEffect } from "react";
import { convex } from "@/auth/convexClient";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { EventsProvider } from "@/hooks/useEvents";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { EventsPage } from "@/pages/EventsPage";
import { SubmitEventPage } from "@/pages/SubmitEventPage";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function SiteShell() {
  return (
    <ConvexProvider client={convex}>
      <EventsProvider>
        <ScrollManager />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex flex-1 flex-col">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
      </EventsProvider>
    </ConvexProvider>
  );
}

export function PublicAppRoutes() {
  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:key" element={<EventDetailPage />} />
        <Route path="/submit-event" element={<SubmitEventPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
