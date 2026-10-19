import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Lock } from "lucide-react";
import { Outlet } from "react-router";
import { controlStyles } from "@/components/controlStyles";
import { Button } from "@/ui";
import { api } from "../../../convex/_generated/api";

/** The Desk is private to one editor: any other signed-in account sees this and nothing else. */
export function DeskGate() {
  const access = useQuery(api.access.myAccess);
  const { signOut } = useAuthActions();
  if (access === undefined) return null;
  if (!access.allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" data-testid="desk-private">
        <div className="max-w-md space-y-4 rounded-xl border bg-card p-8 text-center">
          <span className="sunset-stripe mx-auto block h-2 w-16 rounded-full" aria-hidden />
          <Lock className="mx-auto size-6 text-muted-foreground" />
          <h1 className="text-2xl">This desk is private</h1>
          <p className="text-sm text-muted-foreground">
            The Scoop Desk is open to The Tampa Scoop's editor only. You're signed in as{" "}
            <strong>{access.email || "an unknown account"}</strong>, which isn't on the list.
          </p>
          <Button className={controlStyles.outlineButton} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
