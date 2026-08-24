import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ParQwish Planner",
  description: "Your Disneyland Resort trip planning companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ParQwish Planner",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFD700",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="app-version" content={process.env.NEXT_PUBLIC_APP_VERSION} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var V = "${process.env.NEXT_PUBLIC_APP_VERSION}";
  var KEY = "pwa-app-version";
  try {
    var prev = localStorage.getItem(KEY);
    if (prev !== V) {
      localStorage.setItem(KEY, V);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r) { r.unregister(); });
        });
      }
      if ("caches" in window) {
        caches.keys().then(function(names) {
          names.forEach(function(n) { caches.delete(n); });
        });
      }
      if (prev) {
        location.reload();
      }
    }
  } catch(e) {}
})();
`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <ThemeProvider>
          <ErrorBoundary>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
                         focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
            >
              Skip to main content
            </a>
            {children}
          </ErrorBoundary>

          <footer className="py-4 px-6 text-center text-[10px] text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)] space-y-2">
            <div className="flex justify-center gap-4">
              <a href="https://parqwish.com/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text-secondary)] underline">Privacy Policy</a>
              <a href="https://parqwish.com/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text-secondary)] underline">Terms of Service</a>
              <a href="https://parqwish.com/contact.html" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text-secondary)] underline">Contact & FAQ</a>
            </div>
            <p>ParQwish is an unofficial fan app and is not affiliated with, endorsed by, or sponsored by The Walt Disney Company or any of its subsidiaries.</p>
            <p className="opacity-60" suppressHydrationWarning>
              v{process.env.NEXT_PUBLIC_APP_VERSION}
              {process.env.NEXT_PUBLIC_BUILD_TIME && (
                <> · Built {new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("en-US", {
                  dateStyle: "medium", timeStyle: "short",
                })}</>
              )}
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
