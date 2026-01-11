import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

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
          {children}
          <Toaster
            position="top-right"
            closeButton
            theme="system"
            duration={4000}
            toastOptions={{
              classNames: {
                toast:
                  'relative pr-10 bg-white text-zinc-900 border-0 shadow-xl rounded-lg dark:bg-zinc-900 dark:text-zinc-50',
                success:
                  'bg-white text-zinc-900 border-emerald-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-emerald-800/50',
                error:
                  'bg-white text-zinc-900 border-red-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-red-800/50',
                info:
                  'bg-white text-zinc-900 border-blue-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-blue-800/50',
                warning:
                  'bg-white text-zinc-900 border-amber-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-amber-800/50',
                description: 'text-zinc-600 dark:text-zinc-400',
                actionButton:
                  'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
                cancelButton:
                  'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                closeButton:
                  'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
