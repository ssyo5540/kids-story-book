"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { LANG_INFO, type Lang, type Paragraph, type ReviewStatus } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

export interface StoryTextProps {
  texts: Partial<Record<Lang, { paragraphs: Paragraph[]; review: ReviewStatus; title: string }>>;
  initialLang: Lang;
}

/** Read-along text with a language switcher. */
export function StoryText({ texts, initialLang }: StoryTextProps) {
  const langs = (Object.keys(texts) as Lang[]).filter((l) => texts[l]);
  const [lang, setLang] = useState<Lang>(langs.includes(initialLang) ? initialLang : "en");
  const current = texts[lang];
  if (!current) return null;
  const info = LANG_INFO[lang];

  return (
    <div className="space-y-4">
      {langs.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reading language">
          {langs.map((l) => (
            <Chip key={l} role="tab" aria-selected={l === lang} selected={l === lang} onClick={() => setLang(l)}>
              <span lang={LANG_INFO[l].htmlLang}>{LANG_INFO[l].nativeLabel}</span>
            </Chip>
          ))}
        </div>
      ) : null}
      {current.review === "needs_review" ? (
        <p className="rounded-card border border-dashed border-lamp-300/50 bg-lamp-300/10 px-3 py-2 text-sm text-lamp-200">
          This {info.label} text is still waiting for a reviewer.
        </p>
      ) : null}
      <article lang={info.htmlLang} className="paper mx-auto max-w-2xl rounded-card px-5 py-6 sm:px-8 sm:py-8">
        <h3 className="mb-6 text-center font-display text-2xl font-extrabold text-on-surface text-balance">
          {current.title}
        </h3>
        <div className={cn("space-y-4 text-[1.05rem] leading-[1.7] text-on-surface", lang !== "en" && "text-[1.1rem]")}>
          {current.paragraphs.map((p) => {
            if (p.kind === "break")
              return <div key={p.index} className="mx-auto my-6 h-px w-24 bg-paper-300" aria-hidden="true" />;
            if (p.kind === "heading")
              return (
                <h4 key={p.index} className="pt-6 text-center font-display text-xl font-extrabold text-on-surface">
                  {p.display}
                </h4>
              );
            return (
              <p key={p.index} className={cn(p.kind === "dialogue" && "pl-4 italic text-on-surface-muted")}>
                {renderEmphasis(p.display)}
              </p>
            );
          })}
        </div>
      </article>
    </div>
  );
}

function renderEmphasis(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <em key={`${i}-${part}`}>{part.slice(1, -1)}</em>
    ) : (
      <span key={`${i}-${part}`}>{part}</span>
    ),
  );
}
