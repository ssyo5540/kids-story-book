import type { Metadata } from "next";
import { APP_NAME } from "@/components/layout/Logo";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="paper mx-auto max-w-2xl space-y-6 rounded-card px-6 py-8 text-on-surface sm:px-10">
      <h1 className="font-display text-3xl font-extrabold">{APP_NAME}</h1>
      <p>
        Soft retellings of Indian, Greek and Egyptian myths for bedtime, read aloud in many voices and languages. Every
        story ends with everyone safe, and the last few paragraphs slow down so sleepy listeners can drift off.
      </p>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-extrabold">Privacy</h2>
        <p>
          {APP_NAME} has no accounts, no tracking and no advertising. Favourites, listening positions, downloads and
          your narrator choice are kept only in this browser. The only network requests are for story pages, audio files
          and voice previews.
        </p>
        <p className="text-sm text-on-surface-muted">
          Grown-ups: this page is informational and not legal advice; review it with the appropriate people before
          publishing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-extrabold">Voices and languages</h2>
        <p>
          Narration is generated with Google Cloud Text-to-Speech (Chirp 3 HD). Translations into Telugu, Tamil, Kannada
          and Malayalam are written by an AI assistant and marked as unreviewed until a native speaker has checked them.
          Names follow the story glossary.
        </p>
        <p className="text-sm text-on-surface-muted">
          On iPhone and iPad, Safari does not let web apps change the volume, so the sleep timer stops without fading.
          Playing from the installed app while the screen is locked may pause after a long time; playing from Safari is
          the most reliable.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-extrabold">Credits</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Fonts: Baloo 2 family (Ek Type), Nunito, Noto Sans Telugu, Tamil, Kannada and Malayalam (Google) under the
            SIL Open Font License.
          </li>
          <li>Icons: Lucide (ISC).</li>
          <li>Rain, night and lullaby loops are synthesised in this project. No third-party recordings.</li>
          <li>Story texts are original retellings of public-domain myths.</li>
          <li>
            Built with Next.js, React, Tailwind CSS, Zustand, Serwist and ffmpeg. See NOTICE.md in the source for
            licences.
          </li>
        </ul>
      </section>
    </article>
  );
}
