import { AuthStrategyRoutes } from "./auth/AuthStrategyRoutes";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/Toaster";
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
    </>
  );
}

export default App;
