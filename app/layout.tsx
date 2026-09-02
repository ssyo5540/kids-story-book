import type { Metadata, Viewport } from "next";
import {
  Baloo_2,
  Baloo_Chettan_2,
  Baloo_Tamma_2,
  Baloo_Tammudu_2,
  Baloo_Thambi_2,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Nunito,
} from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { APP_NAME } from "@/components/layout/Logo";
import { Providers } from "./providers";
import "./globals.css";

// Display faces (rounded, friendly). The Indic Baloo variants only download when their script is on the page.
const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });
const balooTe = Baloo_Tammudu_2({ subsets: ["telugu"], variable: "--font-baloo-te", display: "swap", preload: false });
const balooTa = Baloo_Thambi_2({ subsets: ["tamil"], variable: "--font-baloo-ta", display: "swap", preload: false });
const balooKn = Baloo_Tamma_2({ subsets: ["kannada"], variable: "--font-baloo-kn", display: "swap", preload: false });
const balooMl = Baloo_Chettan_2({
  subsets: ["malayalam"],
  variable: "--font-baloo-ml",
  display: "swap",
  preload: false,
});

// Body faces
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const notoTe = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-noto-te", display: "swap", preload: false });
const notoTa = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-noto-ta", display: "swap", preload: false });
const notoKn = Noto_Sans_Kannada({ subsets: ["kannada"], variable: "--font-noto-kn", display: "swap", preload: false });
const notoMl = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  variable: "--font-noto-ml",
  display: "swap",
  preload: false,
});

const fontVars = [baloo, balooTe, balooTa, balooKn, balooMl, nunito, notoTe, notoTa, notoKn, notoMl]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Bedtime stories from Indian, Greek and Egyptian mythology, read softly in many voices and languages.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Nightlight" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1030",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
