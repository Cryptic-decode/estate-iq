import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/ui/skip-link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: "%s | EstateIQ",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "property management software",
    "rent operations",
    "rent collection",
    "tenant management",
    "property portfolio reporting",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: "Cryptic Solutions Ltd",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1613" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SkipLink />
          {children}
          <Toaster
            position="top-right"
            closeButton
            theme="system"
            duration={4000}
            toastOptions={{
              classNames: {
                toast:
                  'relative pr-10 border-0 shadow-xl rounded-lg bg-card text-card-foreground',
                description: 'text-muted-foreground',
                actionButton:
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                cancelButton:
                  'bg-secondary text-secondary-foreground hover:bg-accent',
                closeButton:
                  'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
