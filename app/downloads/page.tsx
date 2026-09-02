import type { Metadata } from "next";
import { DownloadsList } from "@/components/downloads/DownloadsList";
import { getPublicCatalog } from "@/lib/content/server";

export const metadata: Metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const catalog = await getPublicCatalog();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Downloads</h1>
        <p className="text-fg-muted">Stories saved on this device play without internet.</p>
      </header>
      <DownloadsList catalog={catalog} />
    </div>
  );
}
