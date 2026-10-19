import { Dialog } from "@base-ui/react/dialog";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-(--sidebar-width) shrink-0 border-r border-sidebar-border md:flex">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center px-4 md:hidden">
          <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Dialog.Trigger
              aria-label="Open navigation"
              className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <MenuIcon className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
              <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-lg outline-none transition-transform duration-200 data-starting-style:-translate-x-full data-ending-style:-translate-x-full">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
                <Dialog.Close
                  aria-label="Close navigation"
                  className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
