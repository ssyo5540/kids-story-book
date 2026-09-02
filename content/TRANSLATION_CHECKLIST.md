# Translation review checklist

1. Meaning is preserved paragraph by paragraph (same count, same order).
2. Register suits a child listener at bedtime: spoken, simple, warm. Not literary or formal.
3. Names follow `GLOSSARY.md` spellings everywhere.
4. Numbers are written as words. No digits.
5. Sentences end with a full stop or danda so the narrator pauses naturally.
6. No untranslated Latin-script words (except where a name has no native form).
7. Idioms are adapted, not translated literally.
8. The softening rules from `STYLE_GUIDE.md` still hold (no dwelling on violence, everyone safe at the end).
9. Listen: `pnpm audio:sample --story <id> --locale <locale> --paragraphs 0-3`. Note mispronunciations and fix
   by rewording or adding a `respell` entry in `content/voices/pronunciations.yaml`.
10. Set `reviewStatus: approved`, `reviewer: <you>`, `reviewedAt: <YYYY-MM-DD>`.
