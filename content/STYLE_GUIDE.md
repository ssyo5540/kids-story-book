# Nightlight Tales — Story Style Guide

Every story in `content/stories/**` is read aloud by a synthetic narrator to a child who is falling asleep.
Write for the ear, not the eye.

## 1. Audience and tone
- Ages four to eight (fifteen, thirty and sixty minute stories may stretch to ten).
- Calm, warm, unhurried. Imagine a grown-up telling a story in a dim room, voice low.
- Present the wonder, not the peril. Curiosity, kindness, patience and courage are the recurring notes.

## 2. Softening rules (mythology is intense — we are not)
- Never dwell on violence, death or cruelty. Battles happen "far away" or are summarised in one gentle sentence.
- Death becomes "went to rest among the stars", "fell into a long, long sleep", "went home to the sky".
- Villains are "foolish", "greedy", "grumpy" or "mixed-up", never evil. They learn something or wander off.
- Frightening creatures are described by size, shadow and sound, never by teeth, blood or wounds.
- Everyone is safe at the end. Always.

## 3. Bedtime shape
- Energy tapers as the story goes on. The last two or three paragraphs are quiet and sensory: night sky, slow breathing, a lamp going out, an animal curling up.
- Long stories may use a refrain at chapter ends ("and the night was quiet, and all was well").
- Do not end on a question or a cliff-hanger.

## 4. Language
- Short sentences, at most about twenty words. One idea per sentence.
- Concrete nouns and gentle repetition. Two to five sentences per paragraph.
- Paragraph breaks are generous — every blank line becomes a pause in the narration.
- Dialogue gets its own paragraph and is short. Start it with a quotation mark.
- Present each tradition on its own terms. Keep honorifics (Guruji, Amma, Thatha). No lectures; the moral is one sentence in the frontmatter, shown to parents.

## 5. Writing for the narrator (TTS rules — the validator enforces most of these)
- Numbers as words: "five brothers", never "5 brothers".
- No abbreviations (Mr., Dr., etc.), no brackets or parentheses, no semicolons, no ALL CAPS, no emoji.
- No stretched onomatopoeia ("Zzzz", "Aaaah"). Describe the sound instead.
- Names use the canonical spelling in `GLOSSARY.md`, in every language.
- Avoid words the voice may mispronounce; test with `pnpm audio:sample --story <id> --locale <locale>`.
- Allowed Markdown: paragraphs, `## Chapter heading` (thirty and sixty minute stories only), `---` alone on a line for a long breath, `*emphasis*` (display only).

## 6. Structure by duration (validator warns outside ±15% of the target word count)
| Duration | Target words | Shape |
|---|---|---|
| 5 min | ~700 | 8–10 paragraphs: settle-in (1) → scene (2) → one small problem (3) → gentle resolution (2) → sleepy close (1–2) |
| 15 min | ~1,800 | 25–35 paragraphs, three beats, each ending in a small calm moment; no headings |
| 30 min | ~3,600 | 3–4 `##` chapters of ~900–1,200 words, each ending in a settling moment |
| 60 min | ~7,200 | 6–7 `##` chapters of 1,000–1,200 words, progressively slower and quieter, refrain at chapter ends |

## 7. Frontmatter
```yaml
---
title: Arjuna and the Bird's Eye
summary: One or two sentences a parent reads on the story page.
moral: One sentence.
reviewStatus: draft | needs_review | approved
# translations only:
translatedFromHash: <12-hex en contentHash printed by pnpm content:validate --stats>
translator: claude
# when approved:
reviewer: your-name
reviewedAt: 2026-09-10
---
```
A story is published only when its English text is `approved`. Translations are shown only when `approved`
(or `needs_review` when `CONTENT_INCLUDE_UNREVIEWED=true`, with a badge).
