import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { getDict } from "@/lib/lang";
import "./globals.css";

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return {
    title: { default: t.trustName, template: `%s · ${t.trustName}` },
    description: t.formIntro,
    // Internal tool for yatris and staff: keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#b4410e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getDict();
  return (
    <html lang={lang} className={devanagari.variable}>
      <body className="flex min-h-dvh flex-col bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
