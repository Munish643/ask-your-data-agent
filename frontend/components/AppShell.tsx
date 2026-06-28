"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Database,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X
} from "lucide-react";
import clsx from "@/lib/clsx";
import { clearMockSession, loadMockSession, type MockSession } from "@/lib/auth";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Chat", href: "/chat", icon: MessageSquareText },
  { label: "Knowledge Base", href: "/knowledge-base", icon: Database },
  { label: "Connectors", href: "/connectors", icon: Plug },
  { label: "Users & Roles", href: "/admin", icon: Users },
  { label: "Analytics", href: "/admin", icon: BarChart3 },
  { label: "Audit Logs", href: "/admin", icon: ShieldCheck },
  { label: "Settings", href: "/admin", icon: Settings }
];

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = window.localStorage.getItem("askdata-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function AppShell({
  children,
  title,
  subtitle,
  contentClassName
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [session, setSession] = useState<MockSession | null>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("askdata-sidebar-collapsed") === "true");
    } catch {
      setCollapsed(false);
    }
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    const nextSession = loadMockSession();
    setSession(nextSession);
    if (!nextSession) {
      router.replace("/login");
    }
  }, []);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const hrefs = Array.from(new Set(["/", "/login", "/signup", ...navItems.map((item) => item.href)]));
    hrefs.forEach((href) => router.prefetch(href));
  }, [router]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem("askdata-sidebar-collapsed", String(!current));
      } catch {
        // localStorage may be unavailable in private browsing.
      }
      return !current;
    });
  }

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("askdata-theme", next);
      } catch {
        // localStorage may be unavailable in private browsing.
      }
      applyTheme(next);
      return next;
    });
  }

  function handleNavigate(href: string) {
    if (href !== pathname) {
      setPendingHref(href);
      router.prefetch(href);
    }
    setMobileOpen(false);
  }

  function handleLogout() {
    clearMockSession();
    setSession(null);
    router.push("/login");
  }

  return (
    <div data-anime-page className="min-h-screen bg-[#fafafa] text-[#171717]">
      {pendingHref ? (
        <div className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-[#ebebeb]" role="status" aria-label="Loading page">
          <div className="route-progress-bar h-full bg-[#0070f3]" />
        </div>
      ) : null}
      {mobileOpen ? (
        <button
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      ) : null}
      <aside
        data-anime-reveal
        className={clsx(
          "fixed inset-y-0 left-0 z-30 flex h-dvh flex-col border-r border-[#ebebeb] bg-white px-3 py-4 transition-all duration-200",
          collapsed ? "w-[min(20rem,calc(100vw-1rem))] lg:w-16" : "w-[min(20rem,calc(100vw-1rem))] lg:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={clsx("mb-6 flex shrink-0 items-center gap-2 sm:mb-8", collapsed ? "lg:flex-col" : "justify-between")}>
          <Link
            href="/"
            data-anime-hover
            className={clsx(
              "flex min-w-0 items-center gap-3 px-2",
              collapsed && "lg:h-11 lg:w-11 lg:justify-center lg:px-0"
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-[#171717] text-white shadow-[0_1px_1px_#00000008,0_2px_2px_#0000000a]">
              <BookOpen size={20} />
            </div>
            <div className={clsx("min-w-0", collapsed && "lg:hidden")}>
              <div className="text-sm font-medium text-[#171717]">Ask-Your-Data</div>
              <div className="font-mono text-xs text-[#888888]">Enterprise agent</div>
            </div>
          </Link>
          <button
            onClick={toggleCollapsed}
            data-anime-hover
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#4d4d4d] transition hover:bg-[#f5f5f5] lg:inline-flex"
            title={collapsed ? "Open sidebar" : "Close sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            data-anime-hover
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ebebeb] text-[#4d4d4d] hover:bg-[#f5f5f5] lg:hidden"
            title="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch
                data-anime-hover
                className={clsx(
                  "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition",
                  collapsed && "lg:justify-center lg:px-0",
                  active || pendingHref === item.href
                    ? "bg-[#f5f5f5] text-[#171717]"
                    : "text-[#4d4d4d] hover:bg-[#fafafa] hover:text-[#171717]"
                )}
                title={collapsed ? item.label : undefined}
                onClick={() => handleNavigate(item.href)}
                onFocus={() => router.prefetch(item.href)}
                onMouseEnter={() => router.prefetch(item.href)}
              >
                {active || pendingHref === item.href ? (
                  <span className={clsx("absolute left-0 h-5 w-0.5 rounded-full bg-[#171717]", collapsed && "lg:hidden")} />
                ) : null}
                <Icon size={18} className={active || pendingHref === item.href ? "text-[#171717]" : "text-[#888888] group-hover:text-[#171717]"} />
                <span className={clsx(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={clsx("mt-3 shrink-0 rounded-md border border-[#ebebeb] bg-[#fafafa] p-3", collapsed && "lg:hidden")}>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#171717]">
            <Activity size={15} className="text-[#0070f3]" />
            {session ? session.name : "Mock auth active"}
          </div>
          <p className="font-mono text-xs leading-5 text-[#888888]">
            {session ? `${session.email} via ${session.provider.toUpperCase()} scoped to ${session.workspace}.` : "admin@example.com scoped to demo."}
          </p>
          {session ? (
            <button
              onClick={handleLogout}
              data-anime-hover
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#ebebeb] bg-white text-xs font-medium text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
            >
              <LogOut size={14} />
              Log out
            </button>
          ) : null}
        </div>
      </aside>
      <main className={clsx("transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-72")}>
        <motion.header
          data-anime-reveal
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="sticky top-0 z-10 border-b border-[#ebebeb] bg-white/95 px-3 py-3 backdrop-blur sm:px-4 md:px-8 md:py-4"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                data-anime-hover
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] text-[#4d4d4d] hover:bg-[#f5f5f5] lg:hidden"
                title="Open sidebar"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-[#171717] sm:text-xl md:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1 hidden max-w-[64vw] truncate text-sm text-[#4d4d4d] sm:block">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={toggleTheme}
                data-anime-hover
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden max-w-48 truncate rounded-md border border-[#ebebeb] bg-white px-3 py-2 font-mono text-xs text-[#888888] md:block">
                {session?.workspace ?? "Demo workspace"}
              </div>
            </div>
          </div>
        </motion.header>
        <motion.div
          data-anime-reveal
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={clsx(contentClassName ?? "mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-8 md:py-6")}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
