export const MYTHOLOGIES = ["indian", "greek", "egyptian"] as const;
export type Mythology = (typeof MYTHOLOGIES)[number];

export const DURATION_CLASSES = [5, 15, 30, 60] as const;
export type DurationClass = (typeof DURATION_CLASSES)[number];

/** Text languages (one Markdown file per language). */
export const LANGS = ["en", "te", "ta", "kn", "ml"] as const;
export type Lang = (typeof LANGS)[number];

/** Narration locales (one audio rendition per locale + voice). */
export const LOCALES = ["en-US", "en-GB", "en-IN", "te-IN", "ta-IN", "kn-IN", "ml-IN"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LANG: Record<Locale, Lang> = {
  "en-US": "en",
  "en-GB": "en",
  "en-IN": "en",
  "te-IN": "te",
  "ta-IN": "ta",
  "kn-IN": "kn",
  "ml-IN": "ml",
};

export type Script = "latin" | "telugu" | "tamil" | "kannada" | "malayalam";

export interface LangInfo {
  lang: Lang;
  label: string;
  nativeLabel: string;
  script: Script;
  /** BCP-47 tag for `lang` attributes on native-script text. */
  htmlLang: string;
}

export const LANG_INFO: Record<Lang, LangInfo> = {
  en: {
    lang: "en",
    label: "English",
    nativeLabel: "English",
    script: "latin",
    htmlLang: "en",
  },
  te: {
    lang: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    script: "telugu",
    htmlLang: "te",
  },
  ta: {
    lang: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    script: "tamil",
    htmlLang: "ta",
  },
  kn: {
    lang: "kn",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    script: "kannada",
    htmlLang: "kn",
  },
  ml: {
    lang: "ml",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    script: "malayalam",
    htmlLang: "ml",
  },
};

export type RegionId = "asia" | "americas" | "europe";

export interface LocaleInfo {
  locale: Locale;
  lang: Lang;
  label: string;
  nativeLabel: string;
  region: RegionId;
  /** Short accent/region hint shown under the language name. */
  hint: string;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  "en-IN": {
    locale: "en-IN",
    lang: "en",
    label: "English",
    nativeLabel: "English",
    region: "asia",
    hint: "Indian accent",
  },
  "te-IN": {
    locale: "te-IN",
    lang: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    region: "asia",
    hint: "India",
  },
  "ta-IN": {
    locale: "ta-IN",
    lang: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    region: "asia",
    hint: "India",
  },
  "kn-IN": {
    locale: "kn-IN",
    lang: "kn",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    region: "asia",
    hint: "India",
  },
  "ml-IN": {
    locale: "ml-IN",
    lang: "ml",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    region: "asia",
    hint: "India",
  },
  "en-US": {
    locale: "en-US",
    lang: "en",
    label: "English",
    nativeLabel: "English",
    region: "americas",
    hint: "American accent",
  },
  "en-GB": {
    locale: "en-GB",
    lang: "en",
    label: "English",
    nativeLabel: "English",
    region: "europe",
    hint: "British accent",
  },
};

export interface RegionInfo {
  id: RegionId;
  label: string;
  locales: Locale[];
}

export const REGIONS: RegionInfo[] = [
  {
    id: "asia",
    label: "Asia",
    locales: ["te-IN", "ta-IN", "kn-IN", "ml-IN", "en-IN"],
  },
  { id: "americas", label: "Americas", locales: ["en-US"] },
  { id: "europe", label: "Europe", locales: ["en-GB"] },
];

/** Default narration locale for first play. */
export const DEFAULT_LOCALE: Locale = "en-IN";

/** Effective narration speed is ~120 words/minute (Chirp at 0.9x plus paragraph pauses). Recalibrate with `audio:status --calibrate`. */
export const TARGET_WORDS: Record<DurationClass, number> = { 5: 700, 15: 1800, 30: 3600, 60: 7200 };

export const REVIEW_STATUSES = ["draft", "needs_review", "approved"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface CoverArt {
  /** Accent colour (hex) used for the book cover gradient and badges. */
  accent: string;
  /** Optional symbol id rendered as the cover illustration (see components/catalog/CoverArt). */
  symbol?: string;
}

export interface StoryMeta {
  id: string;
  collection: string;
  mythology: Mythology;
  durationClass: DurationClass;
  ageRange: [number, number];
  characters: string[];
  tags: string[];
  sourceNotes?: string;
  order: number;
  cover?: CoverArt;
}

export type ParagraphKind = "heading" | "text" | "dialogue" | "break";

export interface Paragraph {
  index: number;
  sectionIndex: number;
  kind: ParagraphKind;
  /** Light Markdown for display (keeps *emphasis*). Empty for breaks. */
  display: string;
  /** Plain, normalized text for narration. Empty for breaks. */
  narration: string;
}

export interface StoryText {
  lang: Lang;
  title: string;
  summary: string;
  moral: string;
  reviewStatus: ReviewStatus;
  translatedFromHash?: string;
  translator?: string;
  reviewer?: string;
  reviewedAt?: string;
  allowParagraphMismatch: boolean;
  paragraphs: Paragraph[];
  /** Derived */
  wordCount: number;
  charCount: number;
  contentHash: string;
  stale: boolean;
  file: string;
}

export interface Story {
  meta: StoryMeta;
  texts: Partial<Record<Lang, StoryText>>;
  dir: string;
}

export interface Collection {
  id: string;
  mythology: Mythology;
  order: number;
  cover?: CoverArt;
  title: Partial<Record<Lang, string>> & { en: string };
  description: Partial<Record<Lang, string>> & { en: string };
}

export interface Catalog {
  collections: Collection[];
  stories: Story[];
  loadedAt: string;
  includeUnreviewed: boolean;
}

export interface ContentIssue {
  level: "error" | "warn";
  file: string;
  message: string;
}
