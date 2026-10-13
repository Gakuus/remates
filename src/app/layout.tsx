import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { siteName, siteUrl } from "@/infrastructure/config/env";
import { SiteHeader } from "@/ui/features/layout/site-header";
import { SiteFooter } from "@/ui/features/layout/site-footer";
import { JsonLd } from "@/ui/components/json-ld";
import { organizationJsonLd } from "@/adapters/presentation/seo-presenter";
import "@/ui/styles/globals.css";

/** Serif elegante para títulos + Sans moderna para información (PLAN §9). */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Campos y terrenos rurales a la venta`,
    template: `%s | ${siteName}`,
  },
  description:
    "Campos y terrenos rurales a la venta en Uruguay. Descubrí propiedades agrícolas, ganaderas y mixtas por departamento, superficie y precio.",
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: siteName,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#2f4a3c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-UY" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <JsonLd data={organizationJsonLd({ siteName, url: siteUrl })} />
        <a
          href="#contenido"
          className="focus:rounded-suave focus:bg-monte focus:text-crema-50 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:text-sm"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
