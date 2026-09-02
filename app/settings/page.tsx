import type { Metadata } from "next";
import { ParentGate } from "@/components/settings/ParentGate";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Grown-ups</h1>
        <p className="text-fg-muted">Narrator, bedtime defaults, install and storage.</p>
      </header>
      <ParentGate>
        <SettingsForm />
      </ParentGate>
    </div>
  );
}
