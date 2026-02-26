import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharOS Margin Defense",
  description: "PharOS V1",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: [
      { url: "/favicon.ico" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    images: ["/favicon.ico"],
  },
  twitter: {
    images: ["/favicon.ico"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
