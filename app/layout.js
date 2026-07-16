import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import TabCookieSync from "@/components/TabCookieSync";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  // title: "MMGC - Medical Management and General Care",
  description: "Created by Jamal Shah and Rehanullah",
  icons: {
    icon: '/mmgc-svg.svg',
    shortcut: '/mmgc-svg.svg',
    apple: '/mmgc-svg.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Handles background multi-tab cookie syncing automatically */}
        <TabCookieSync />

        {/* 2. Wrap the children in the AuthProvider */}
        <AuthProvider>
          {children}
        </AuthProvider>

        <footer>
          <Footer />
        </footer>

        {/* Vercel Analytics tracking */}
        <Analytics />
      </body>
    </html>
  );
}