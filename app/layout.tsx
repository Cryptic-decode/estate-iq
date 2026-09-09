import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/ui/skip-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EstateIQ - Rent Intelligence Platform",
  description: "Know the state of your rent. Always.",
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
