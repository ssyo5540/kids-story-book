import type { Metadata } from "next";
import { VoicesPage } from "@/components/voices/VoicesPage";

export const metadata: Metadata = { title: "Voices" };

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Meet the narrators</h1>
        <p className="text-fg-muted">
          Choose the voice your family likes best in each language. Tap a card to make it yours; stories will open in
          that voice.
        </p>
      </header>
      <VoicesPage />
    </div>
  );
}
