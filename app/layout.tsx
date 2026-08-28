import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Threat Lab",
  description: "Minimal WebXR social-agent study prototype.",
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
