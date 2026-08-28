import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://georgefejer91.github.io/minimal-social-threat-webxr";

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: "Social Threat Lab · social dyads, spatial audio, and WebXR",
  description: "A phone-first social-agent threat scenario with conversational dyads, HRTF spatial audio, a realtime companion, and optional WebXR.",
  openGraph: {
    title: "Social Threat Lab",
    description: "Three conversational dyads react to an approaching shrouded threat in 2D, spatial audio, and optional WebXR.",
    type: "website",
    url: siteUrl,
    images: [{ url: `${siteUrl}/og.png`, width: 1672, height: 941, alt: "Social Threat Lab scene with three agent dyads, an observer, and an approaching shadow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Threat Lab",
    description: "Three conversational dyads react to an approaching shrouded threat in 2D, spatial audio, and optional WebXR.",
    images: [`${siteUrl}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#071713",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <html lang="en">
      <head>
        <Script src={`${basePath}/vendor/vdoninja/1.5.5/vdoninja-sdk.min.js`} strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
