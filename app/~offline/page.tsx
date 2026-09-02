import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <EmptyState
        title="You are offline"
        body="No signal tonight. Stories you downloaded are still here."
        action={
          <Link href="/downloads">
            <Button>Open downloads</Button>
          </Link>
        }
      />
    </div>
  );
}
