import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16">
      <EmptyState
        title="This page has drifted off to sleep"
        body="We could not find that story or page. Let us tiptoe back to the bookshelf."
        action={
          <Link href="/collections">
            <Button>Back to stories</Button>
          </Link>
        }
      />
    </div>
  );
}
