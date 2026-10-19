import { AuthStrategyRoutes } from "./auth/AuthStrategyRoutes";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/Toaster";
import { ViktorSpacePreviewBadge } from "./components/ViktorSpacePreviewBadge";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          <Toaster />
          <AuthStrategyRoutes />
        </ThemeProvider>
      </ErrorBoundary>
      {/* Outside the boundary on purpose: a preview must stay labelled even
          on the crash screen the boundary renders instead of the app. */}
      <ViktorSpacePreviewBadge />
    </>
  );
}

export default App;
