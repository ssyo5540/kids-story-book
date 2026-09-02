"use client";

import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Locale } from "@/lib/content/types";

export interface DownloadRecord {
  key: string; // `${storyId}|${locale}|${voice}`
  storyId: string;
  locale: Locale;
  voice: string;
  title: string;
  collectionTitle: string;
  audioUrl: string;
  manifestUrl: string;
  coverUrl: string;
  bytes: number;
  durationMs: number;
  renditionHash: string;
  contentHash: string;
  createdAt: number;
}

interface NightlightDB extends DBSchema {
  downloads: { key: string; value: DownloadRecord; indexes: { byStory: string } };
}

let dbPromise: Promise<IDBPDatabase<NightlightDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NightlightDB>("nightlight", 1, {
      upgrade(db) {
        const store = db.createObjectStore("downloads", { keyPath: "key" });
        store.createIndex("byStory", "storyId");
      },
    });
  }
  return dbPromise;
}

export function downloadKey(storyId: string, locale: string, voice: string) {
  return `${storyId}|${locale}|${voice}`;
}
