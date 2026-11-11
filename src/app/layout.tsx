import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DataProvider } from "@/components/DataProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { dirOf, isLang, LANG_COOKIE } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "UnitSaver – save every unit",
  description: "Track electricity units, estimate your IESCO bill with all taxes, and stay under the 200-unit protected slab. English and اردو.",
};

export const viewport: Viewport = { themeColor: "#213F99", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language lives in a cookie so the first HTML already has the right lang/dir (no LTR→RTL flash).
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(saved) ? saved : "en";
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body>
        <LanguageProvider initial={lang} chosen={isLang(saved)}>
          <DataProvider>{children}</DataProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
