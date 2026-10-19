import { ConvexProvider } from "convex/react";
import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { convex } from "@/auth/convexClient";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { DirectoryProvider } from "@/hooks/useDirectory";
import { BusinessPage } from "@/pages/BusinessPage";
import { CategoryPage } from "@/pages/CategoryPage";
import { HomePage } from "@/pages/HomePage";
import { ListYourBusinessPage } from "@/pages/ListYourBusinessPage";

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
      <DirectoryProvider>
        <ScrollManager />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex flex-1 flex-col">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
      </DirectoryProvider>
    </ConvexProvider>
  );
}

export function PublicAppRoutes() {
  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/business/:slug" element={<BusinessPage />} />
        <Route path="/list-your-business" element={<ListYourBusinessPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
