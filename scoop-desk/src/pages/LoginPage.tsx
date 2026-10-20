import { Link } from "react-router";
import { SignIn } from "@/components/SignIn";

export function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="sunset-stripe mx-auto mb-4 block size-12 rounded-xl" aria-hidden />
          <h1 className="text-3xl tracking-tight">Scoop Desk</h1>
          <p className="text-muted-foreground text-sm">
            The Tampa Scoop's private editorial desk. Only the editor's email can sign in.
          </p>
        </div>

        <SignIn />

        {(
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
