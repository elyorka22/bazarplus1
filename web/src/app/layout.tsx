import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { uz } from "@/lib/i18n/uz";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: uz.meta.title,
  description: uz.meta.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={`${inter.className} bg-white text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
