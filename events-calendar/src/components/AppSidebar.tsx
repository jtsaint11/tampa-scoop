import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTheme } from "@/contexts/ThemeContext";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/ui";
import { api } from "../../convex/_generated/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {navItems.map(item => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarUserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const user = useQuery(api.auth.currentUser);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme, switchable } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="border-t border-sidebar-border p-2">
      <Menu>
        <MenuTrigger className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Avatar className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {user?.name || "User"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </MenuTrigger>
        <MenuPopup
          className="min-w-(--anchor-width) rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none transition-all duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0"
          side="top"
          align="start"
        >
          <MenuItem
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            onClick={() => {
              onNavigate?.();
              navigate("/settings");
            }}
          >
            <Settings className="size-4" />
            Settings
          </MenuItem>
          {switchable && (
            <MenuItem
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
              {theme === "light" ? "Dark mode" : "Light mode"}
            </MenuItem>
          )}
          <MenuSeparator className="-mx-1 my-1 h-px bg-border" />
          <MenuItem
            onClick={() => signOut()}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-2">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-2 py-1 text-lg font-semibold"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">M</span>
          </span>
          <span>{APP_NAME}</span>
        </Link>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <SidebarUserMenu onNavigate={onNavigate} />
    </div>
  );
}
