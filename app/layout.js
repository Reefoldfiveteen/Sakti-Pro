import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🌟 SATUKAN METADATA (Didefinisikan hanya 1 kali)
export const metadata = {
  title: "SAKTI PRO ENTERPRISE",
  description: "Sistem Akuntansi POS Terintegrasi Penyimpanan Hybrid Cloud GDrive",
};

// 🌟 SATUKAN ROOT LAYOUT (Didefinisikan hanya 1 kali)
export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 🚀 SUNTIKAN KUNCI UTAMA: Biar OAuth Google bisa jalan aman di Web maupun WebView APK Android */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAFA]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}