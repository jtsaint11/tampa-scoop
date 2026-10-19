import type { PublicBusiness } from "../../convex/lib/directory";

/**
 * SCREENSHOT-ONLY sample listing, used when the build sets
 * VITE_DIRECTORY_FIXTURE=1 (scripts/shots.sh). It is clearly fictional and is
 * never part of a deployed build: the live site shows only sheet rows.
 */
export const FIXTURE_BUSINESSES: PublicBusiness[] = import.meta.env.VITE_DIRECTORY_FIXTURE === "1"
  ? [
      {
        slug: "sample-pool-co",
        name: "Sample Pool Co. (example listing)",
        category: "Pool Services",
        categorySlug: "pool-services",
        address: "100 Example St, Tampa, FL 33606",
        neighborhood: "Hyde Park",
        zip: "33606",
        phone: "(813) 555-0100",
        website: "https://example.com",
        instagram: "",
        description:
          "Placeholder text showing where the business's original summary appears. This sample exists only for layout screenshots and is not a real Tampa business.",
        logoUrl: "",
        featured: true,
        claimed: true,
        quoteEnabled: true,
        dateAdded: "2026-10-12",
        lastVerified: "2026-10-12",
        hours: "Mon–Fri 8 AM – 5 PM",
        services: "Weekly cleaning, equipment repair, green-pool recovery",
        licenseNumber: "",
        priceModel: "Free estimate",
        emergency: false,
      },
      {
        slug: "sample-pool-two",
        name: "Second Sample Pools (example listing)",
        category: "Pool Services",
        categorySlug: "pool-services",
        address: "200 Example Ave, Tampa, FL 33603",
        neighborhood: "Seminole Heights",
        zip: "33603",
        phone: "(813) 555-0101",
        website: "",
        instagram: "",
        description: "Second placeholder listing for layout screenshots only.",
        logoUrl: "",
        featured: false,
        claimed: false,
        quoteEnabled: false,
        dateAdded: "2026-10-12",
        lastVerified: "2026-10-12",
        hours: "",
        services: "",
        licenseNumber: "",
        priceModel: "",
        emergency: false,
      },
    ]
  : [];
