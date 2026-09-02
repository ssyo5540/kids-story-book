# Prompts used inside Claude Code to produce content

## Write an English story
> Read `content/STYLE_GUIDE.md` and `content/GLOSSARY.md`. Write `content/stories/{collection}/{id}/en.md` for
> "{title}" as a {durationClass}-minute bedtime story (~{words} words) following the {durationClass}-minute
> structure. Source episode: {episode}. Use only the allowed Markdown. Frontmatter: title, summary, moral,
> `reviewStatus: draft`. Then run `pnpm content:validate --stats` and fix any errors or word-count warnings.

The developer reads the story aloud once, edits, and flips `reviewStatus` to `approved` with `reviewer` and `reviewedAt`.

## Translate
> Translate `content/stories/{collection}/{id}/en.md` into {language} as `{lang}.md`. Keep exactly the same
> paragraph count and order (one to one), the same `##` headings and `---` breaks. Use a natural spoken register
> for a child listener, not a literary one. Use the names from `GLOSSARY.md`. Write numbers as words. End
> sentences with a full stop (or danda where natural). No English words in Latin script. Frontmatter: translated
> title, summary and moral, `reviewStatus: needs_review`, `translatedFromHash: {en contentHash}`,
> `translator: claude`. Then run `pnpm content:validate`.

## Review a translation (native speaker)
> Open `{lang}.md` next to `en.md`. Go through `content/TRANSLATION_CHECKLIST.md`. Listen to
> `pnpm audio:sample --story {id} --locale {locale} --paragraphs 0-3`. Fix wording; if a name is mispronounced,
> either reword or add a `respell` entry in `content/voices/pronunciations.yaml`. When satisfied set
> `reviewStatus: approved`, `reviewer`, `reviewedAt`.
