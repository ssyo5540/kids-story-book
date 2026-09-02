import { CollectionShelf } from "@/components/catalog/CollectionShelf";
import { QuickDurationRow } from "@/components/catalog/QuickDurationRow";
import { TonightPick } from "@/components/catalog/TonightPick";
import { getPublicCatalog } from "@/lib/content/server";

export default async function HomePage() {
  const catalog = await getPublicCatalog();
  return (
    <div className="space-y-10">
      <TonightPick stories={catalog.stories} />
      <QuickDurationRow />
      {catalog.collections.map((c) => (
        <CollectionShelf
          key={c.id}
          collection={c}
          stories={catalog.stories.filter((s) => s.collection === c.id).slice(0, 10)}
        />
      ))}
    </div>
  );
}
