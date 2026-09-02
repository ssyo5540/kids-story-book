import { z } from "zod";
import { LANGS, LOCALES, MYTHOLOGIES, REVIEW_STATUSES } from "./types";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, hyphens)")
  .min(3)
  .max(64);

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");

export const coverSchema = z.object({
  accent: hexColour,
  symbol: z.string().min(1).max(40).optional(),
});

export const storyMetaSchema = z
  .object({
    id: slugSchema,
    collection: slugSchema,
    mythology: z.enum(MYTHOLOGIES),
    durationClass: z.union([z.literal(5), z.literal(15), z.literal(30), z.literal(60)]),
    ageRange: z.tuple([z.number().int().min(2).max(16), z.number().int().min(2).max(16)]),
    characters: z.array(z.string().min(1)).default([]),
    tags: z.array(slugSchema).default([]),
    sourceNotes: z.string().max(500).optional(),
    order: z.number().int().nonnegative().default(0),
    cover: coverSchema.optional(),
  })
  .refine((m) => m.ageRange[0] <= m.ageRange[1], {
    message: "ageRange must be [min, max]",
    path: ["ageRange"],
  });

export const hash12 = z.string().regex(/^[0-9a-f]{12}$/, "must be a 12-hex content hash");

export const storyFrontmatterSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  moral: z.string().min(1).max(240),
  reviewStatus: z.enum(REVIEW_STATUSES).default("draft"),
  translatedFromHash: hash12.optional(),
  translator: z.string().max(80).optional(),
  reviewer: z.string().max(80).optional(),
  reviewedAt: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"))
    .optional(),
  allowParagraphMismatch: z.boolean().default(false),
});

type LangKey = (typeof LANGS)[number];

const langMap = <T extends z.ZodTypeAny>(inner: T) =>
  z
    .object(
      Object.fromEntries(LANGS.map((l) => [l, l === "en" ? inner : inner.optional()])) as Record<string, z.ZodTypeAny>,
    )
    .transform((v) => v as Partial<Record<LangKey, z.infer<T>>> & { en: z.infer<T> });

export const collectionSchema = z.object({
  id: slugSchema,
  mythology: z.enum(MYTHOLOGIES),
  order: z.number().int().nonnegative().default(0),
  cover: coverSchema.optional(),
  title: langMap(z.string().min(1).max(80)),
  description: langMap(z.string().min(1).max(300)),
});

export const chirpVoiceNameSchema = z
  .string()
  .regex(/^[A-Z][a-z]+$/, "Chirp voice names are capitalised words, e.g. Aoede");

const personaSchema = z.object({
  displayName: z.string().min(1).max(40),
  displayNameLatin: z.string().min(1).max(40).optional(),
  blurb: z.string().min(1).max(80),
  avatar: z.string().min(1).max(40).optional(),
});

const localeVoicesSchema = z.object({
  default: chirpVoiceNameSchema,
  speakingRate: z.number().min(0.25).max(2).optional(),
  audioQuality: z.enum(["stable", "beta"]).default("stable"),
  personas: z.record(chirpVoiceNameSchema, personaSchema),
});

export const voicesFileSchema = z.object({
  chirpVoices: z
    .array(
      z.object({
        name: chirpVoiceNameSchema,
        gender: z.enum(["female", "male"]),
      }),
    )
    .min(1)
    .max(29),
  previewText: z.object(
    Object.fromEntries(LANGS.map((l) => [l, z.string().min(20).max(400)])) as Record<LangKey, z.ZodString>,
  ),
  locales: z.object(
    Object.fromEntries(LOCALES.map((loc) => [loc, localeVoicesSchema])) as Record<
      (typeof LOCALES)[number],
      typeof localeVoicesSchema
    >,
  ),
});

export type VoicesFile = z.infer<typeof voicesFileSchema>;
export type LocaleVoices = z.infer<typeof localeVoicesSchema>;
export type VoicePersona = z.infer<typeof personaSchema>;

export const pronunciationsFileSchema = z.object({
  locales: z
    .record(
      z.string(),
      z.object({
        respell: z.record(z.string(), z.string()).default({}),
        ipa: z.record(z.string(), z.string()).default({}),
      }),
    )
    .default({}),
});

export type PronunciationsFile = z.infer<typeof pronunciationsFileSchema>;
