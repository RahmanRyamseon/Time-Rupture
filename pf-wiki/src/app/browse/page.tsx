import type { Metadata } from "next";
import { BrowseClient } from "./BrowseClient";
import { DataDisclaimer } from "@/components/DataDisclaimer";

const title = "Browse All PF Problems";
const description = "Every Provident Fund problem in PF Wiki, searchable and filterable by category.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/browse/" },
  openGraph: { type: "website", url: "/browse/", title, description },
  twitter: { card: "summary", title, description },
};

export default function BrowsePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse all PF problems</h1>
        <p className="mt-1 text-foreground/60">Search or filter by category to find your issue.</p>
      </div>
      <BrowseClient />
      <DataDisclaimer />
    </div>
  );
}
