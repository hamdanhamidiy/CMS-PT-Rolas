import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Digital Signage CMS — PT Rolas Nusantara Medika",
    template: "%s — Digital Signage CMS",
  },
  description: "Sistem manajemen konten digital signage terpusat untuk layar TV rumah sakit PT Rolas Nusantara Medika.",
  keywords: ["digital signage", "CMS", "PT Rolas", "rumah sakit", "healthcare"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={outfit.variable}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'var(--font-outfit)',
            },
          }}
        />
      </body>
    </html>
  );
}
