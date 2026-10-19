import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { controlStyles } from "@/components/controlStyles";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/ui";

type HeaderViewProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthActions: boolean;
};

function HeaderView({
  isAuthenticated,
  isLoading,
  showAuthActions,
}: HeaderViewProps) {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            <span className="sunset-stripe size-8 rounded-lg" aria-hidden />
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <nav className="flex items-center gap-2">
            {!showAuthActions || isLoading ? null : isAuthenticated ? (
              <Link
                to="/queue"
                className={buttonClasses(
                  cn(controlStyles.primaryButton, "h-8 px-3"),
                )}
              >
                Open App
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              !isAuthPage && (
                <>
                  <Link
                    to="/login"
                    className={buttonClasses(
                      cn(controlStyles.quietButton, "h-8 px-3"),
                    )}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={buttonClasses(
                      cn(controlStyles.primaryButton, "h-8 px-3"),
                    )}
                  >
                    Get Started
                  </Link>
                </>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <HeaderView
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      showAuthActions
    />
  );
}
