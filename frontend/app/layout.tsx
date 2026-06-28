import type { Metadata } from "next";
import { AnimeProvider } from "@/components/AnimeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask-Your-Data Agent",
  description: "Enterprise RAG assistant with source-backed streaming answers"
};

const themeScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("askdata-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script src="/runtime-config.js" />
      </head>
      <body>
        <AnimeProvider>{children}</AnimeProvider>
      </body>
    </html>
  );
}
