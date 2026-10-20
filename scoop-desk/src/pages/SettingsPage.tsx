import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Loader2, Moon, Palette, Sun, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { controlStyles } from "@/components/controlStyles";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  SwitchThumb,
} from "@/ui";
import { api } from "../../convex/_generated/api";

export function SettingsPage() {
  const user = useQuery(api.auth.currentUser);
  const { theme, toggleTheme, switchable } = useTheme();
  const { signIn, signOut } = useAuthActions();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const navigate = useNavigate();
  const emailPasswordAvailable = true;

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStep, setPasswordStep] = useState<"request" | "verify">(
    "request",
  );

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", user?.email || "");
    formData.append("flow", "reset");

    try {
      await signIn("password", formData);
      setPasswordStep("verify");
    } catch {
      setError("Could not send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("email", user?.email || "");
    formData.append("flow", "reset-verification");

    try {
      await signIn("password", formData);
      setSuccess("Password changed successfully!");
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordStep("request");
        setSuccess("");
      }, 1500);
    } catch {
      setError("Invalid code or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError("");

    try {
      await deleteAccount();
      await signOut();
      navigate("/");
    } catch {
      setError("Could not delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Page subtitle goes here</p>
      </div>

      <Card className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="p-6 pt-0 -mt-10 pb-6">
          <div className="flex items-end gap-4">
            <Avatar className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-medium text-primary-foreground size-16 border-4 border-background text-xl shadow-lg">
              {user?.name?.charAt(0).toUpperCase() || (
                <User className="size-6" />
              )}
            </Avatar>
            <div className="pb-1">
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-base">
            <Palette className="size-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-1">
          {switchable ? (
            <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center">
                  {theme === "light" ? (
                    <Moon className="size-5 text-foreground" />
                  ) : (
                    <Sun className="size-5 text-foreground" />
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="dark-mode"
                    className="text-sm leading-none font-medium"
                  >
                    Dark mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle description goes here
                  </p>
                </div>
              </div>
              <Switch
                className="inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors data-checked:bg-primary data-unchecked:bg-input"
                id="dark-mode"
                nativeButton
                render={<button type="button" />}
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              >
                <SwitchThumb className="block size-4 rounded-full bg-background shadow-lg transition-transform data-checked:translate-x-4 data-unchecked:translate-x-0.5" />
              </Switch>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-2">
              Theme follows your system preference
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <CardTitle className="font-semibold tracking-tight flex items-center gap-2 text-base">
            <User className="size-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-1">
          {emailPasswordAvailable && (
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="w-full flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 text-left"
            >
              <div>
                <p className="font-medium text-sm">Change password</p>
                <p className="text-sm text-muted-foreground">
                  Update your password
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border border-destructive/20 p-4 transition-colors hover:bg-destructive/5 text-left"
          >
            <div>
              <p className="font-medium text-sm text-destructive">
                Delete account
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account
              </p>
            </div>
            <ChevronRight className="size-4 text-destructive" />
          </button>
        </CardContent>
      </Card>

      {emailPasswordAvailable && (
        <SettingsDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
          title="Change Password"
          description={
            passwordStep === "request"
              ? "We'll send a verification code to your email."
              : "Enter the code from your email and your new password."
          }
        >
          {passwordStep === "request" ? (
            <form onSubmit={handleRequestPasswordReset}>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  A reset code will be sent to:{" "}
                  <span className="font-medium text-foreground">
                    {user?.email}
                  </span>
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  className={controlStyles.outlineButton}
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={controlStyles.primaryButton}
                  type="submit"
                  disabled={loading}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Send Code
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium leading-none"
                  htmlFor="code"
                >
                  Verification Code
                </Label>
                <Input
                  className={controlStyles.input}
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Enter code from email"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium leading-none"
                  htmlFor="newPassword"
                >
                  New Password
                </Label>
                <Input
                  className={controlStyles.input}
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  className={controlStyles.outlineButton}
                  onClick={() => {
                    setPasswordStep("request");
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button
                  className={controlStyles.primaryButton}
                  type="submit"
                  disabled={loading}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </form>
          )}
        </SettingsDialog>
      )}

      <SettingsDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Delete Account"
        description="This action cannot be undone. This will permanently delete your account and remove all your data."
      >
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete your account?
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            className={controlStyles.outlineButton}
            onClick={() => setDeleteAccountOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className={controlStyles.destructiveButton}
            onClick={handleDeleteAccount}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Delete Account
          </Button>
        </div>
      </SettingsDialog>
    </div>
  );
}
