import {
  BadgeCheck,
  Beer,
  Bug,
  Building2,
  Cake,
  Coffee,
  Droplets,
  Flame,
  Heart,
  Home,
  Leaf,
  type LucideIcon,
  Snowflake,
  SprayCan,
  Star,
  Store,
  TreePine,
  Utensils,
  Waves,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  hvac: Snowflake,
  roofers: Home,
  "pool-services": Waves,
  plumbers: Wrench,
  restaurants: Utensils,
  "pest-control": Bug,
  landscapers: Leaf,
  electricians: Zap,
  "water-restoration": Droplets,
  "tree-service": TreePine,
  "pressure-washing": SprayCan,
  generators: Flame,
  "coffee-shops": Coffee,
  breweries: Beer,
  bakeries: Cake,
  "date-night": Heart,
};

export function categoryIcon(slug: string): LucideIcon {
  return ICONS[slug] ?? (slug ? Store : Building2);
}

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = categoryIcon(slug);
  return <Icon className={className} aria-hidden />;
}

export function ClaimedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary",
        className,
      )}
      title="The owner has claimed and confirmed this listing"
      data-testid="claimed-badge"
    >
      <BadgeCheck className="size-3.5" aria-hidden /> Claimed
    </span>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sunset-soft px-2.5 py-0.5 text-xs font-bold text-sunset-ink",
        className,
      )}
    >
      <Star className="size-3.5" aria-hidden /> Featured
    </span>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold tracking-[0.16em] text-sunset-ink uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Initial-letter tile used when a listing has no logo. */
export function LogoTile({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "size-20 text-3xl" : "size-12 text-lg";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(
          dim,
          "shrink-0 rounded-xl border bg-card object-contain p-1",
        )}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-xl bg-secondary font-heading font-semibold text-secondary-foreground",
      )}
      aria-hidden
    >
      {name
        .replace(/^the\s+/i, "")
        .charAt(0)
        .toUpperCase()}
    </span>
  );
}
