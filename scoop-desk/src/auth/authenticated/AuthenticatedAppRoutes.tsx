import { Navigate, Route, Routes } from "react-router";
import { OAUTH_CALLBACK_PATH } from "@/auth/oauthReturn";
import { SpaceSession } from "@/auth/SpaceSession";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicLayout } from "@/components/PublicLayout";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { DeskGate } from "@/components/desk/DeskGate";
import { LoginPage, SettingsPage, SignupPage } from "@/pages";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { IssuePage } from "@/pages/IssuePage";
import { IssuesPage } from "@/pages/IssuesPage";
import { QueuePage } from "@/pages/QueuePage";
import { StoryPage } from "@/pages/StoryPage";
import { ViktorOAuthCallbackPage } from "@/pages/ViktorOAuthCallbackPage";

export function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
      </Route>

      {/* Return leg of "Sign in with Viktor" — outside the auth guards
          because it owns the loading/outcome handling itself. */}
      <Route path={OAUTH_CALLBACK_PATH} element={<ViktorOAuthCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DeskGate />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Navigate to="/queue" replace />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/story/:storyId" element={<StoryPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/issues/:issueId" element={<IssuePage tab="write" />} />
            <Route path="/issues/:issueId/build" element={<IssuePage tab="build" />} />
            <Route path="/issues/:issueId/export" element={<IssuePage tab="export" />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AuthenticatedAppRoutes() {
  return (
    <SpaceSession>
      <AuthenticatedRoutes />
    </SpaceSession>
  );
}
