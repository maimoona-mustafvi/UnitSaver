import type { Metadata, Viewport } from "next";
import { DataProvider } from "@/components/DataProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "UnitSaver – save every unit",
  description: "Track electricity units, estimate your IESCO bill with all taxes, and stay under the 200-unit protected slab.",
};

export const viewport: Viewport = { themeColor: "#213F99", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
