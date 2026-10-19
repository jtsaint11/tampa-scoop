import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dialog layout for the starter settings page. */
export function SettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <BaseDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-background p-6 shadow-lg outline-none",
            "transition-all duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
          )}
        >
          <div className="space-y-1.5">
            <BaseDialog.Title className="text-lg font-semibold leading-none">
              {title}
            </BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="text-sm text-muted-foreground">
                {description}
              </BaseDialog.Description>
            )}
          </div>
          {children}
          <BaseDialog.Close
            aria-label="Close"
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
