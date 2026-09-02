import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nightlight Tales",
    short_name: "Nightlight",
    description: "Bedtime stories from Indian, Greek and Egyptian mythology, read softly in many voices and languages.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b1030",
    theme_color: "#0b1030",
    lang: "en",
    categories: ["kids", "education", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Stories", url: "/collections" },
      { name: "Downloads", url: "/downloads" },
    ],
  };
}
