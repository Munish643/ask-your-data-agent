"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, BookOpen, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck, User } from "lucide-react";
import { saveMockSession } from "@/lib/auth";
import { api } from "@/lib/api";

type AuthMode = "login" | "signup";

const proofPoints = [
  "Tenant-scoped retrieval",
  "Source-backed answers",
  "Audit and usage records"
];

const formVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: "easeOut" as const,
      staggerChildren: 0.06
    }
  }
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

function getNameFromEmail(email: string) {
  const [firstPart] = email.split("@");
  const fallback = firstPart || "Demo user";
  return fallback
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("Demo workspace");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      mode === "login"
        ? {
            eyebrow: "Welcome back",
            title: "Log in to your data workspace",
            body: "Continue asking governed questions across indexed files, sources, roles, and audit logs.",
            action: "Log in",
            switchText: "Need a workspace?",
            switchHref: "/signup",
            switchLabel: "Create account"
          }
        : {
            eyebrow: "Create workspace",
            title: "Start your secure RAG workspace",
            body: "Set up a local demo account, upload files, and connect production identity when you are ready.",
            action: "Create account",
            switchText: "Already have an account?",
            switchHref: "/login",
            switchLabel: "Log in"
          },
    [mode]
  );

  async function openWorkspace(provider: "password" | "sso") {
    setIsSubmitting(true);
    setError(null);

    const cleanEmail = email.trim() || "admin@example.com";
    const cleanName = mode === "signup" && name.trim() ? name.trim() : getNameFromEmail(cleanEmail);
    const cleanWorkspace = mode === "signup" && workspace.trim() ? workspace.trim() : "Demo workspace";

    try {
      const session = await api.createAuthSession({
        email: cleanEmail,
        name: cleanName,
        workspace: cleanWorkspace,
        provider
      });
      saveMockSession({
        email: session.email,
        name: session.name,
        workspace: session.workspace,
        token: session.token,
        provider: session.auth_mode
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open workspace");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openWorkspace("password");
  }

  return (
    <main data-anime-page className="min-h-screen bg-[#fafafa] text-[#171717]">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section
          className="relative hidden overflow-hidden bg-cover bg-center px-10 py-8 text-white lg:block"
          style={{ backgroundImage: "url('/images/hero-knowledge-graph.png')" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(7,10,18,0.98)_0%,rgba(7,10,18,0.86)_48%,rgba(7,10,18,0.46)_100%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <Link href="/" data-anime-hover className="inline-flex w-fit items-center gap-3 rounded-md border border-white/12 bg-white/8 px-3 py-2 text-sm font-medium text-white backdrop-blur">
              <BookOpen size={18} />
              Ask-Your-Data
            </Link>

            <motion.div
              className="mt-auto max-w-xl pb-8"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-sm text-[#fdba74]">
                <ShieldCheck size={14} />
                Enterprise-ready access layer
              </div>
              <h1 className="text-5xl font-semibold leading-tight tracking-normal">
                Secure access before every answer.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-200">
                Keep chat, uploads, retrieval, and admin views wrapped in a familiar workspace entry point.
              </p>
              <div className="mt-8 grid gap-3">
                {proofPoints.map((point) => (
                  <motion.div
                    key={point}
                    data-anime-reveal
                    data-anime-hover
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-slate-100 backdrop-blur"
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <CheckCircle2 size={17} className="text-[#fdba74]" />
                    {point}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 md:px-8">
          <motion.div
            data-anime-reveal
            variants={formVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-md rounded-lg border border-[#ebebeb] bg-white p-6 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]"
          >
            <motion.div variants={fieldVariants} className="mb-8">
              <Link href="/" data-anime-hover className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#4d4d4d] transition hover:text-[#171717] lg:hidden">
                <BookOpen size={18} />
                Ask-Your-Data
              </Link>
              <div className="mb-3 font-mono text-xs uppercase tracking-normal text-[#888888]">{copy.eyebrow}</div>
              <h2 className="text-3xl font-semibold tracking-normal text-[#171717]">{copy.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4d4d4d]">{copy.body}</p>
            </motion.div>

            {error ? (
              <motion.div variants={fieldVariants} className="mb-4 rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-3 text-sm text-[#c50000]">
                {error}
              </motion.div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" ? (
                <>
                  <motion.label variants={fieldVariants} className="block">
                    <span className="mb-2 block text-sm font-medium text-[#171717]">Full name</span>
                    <span className="flex h-11 items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3 transition focus-within:border-[#a1a1a1]">
                      <User size={18} className="text-[#888888]" />
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#888888]"
                        placeholder="Munish Kumar"
                        autoComplete="name"
                      />
                    </span>
                  </motion.label>

                  <motion.label variants={fieldVariants} className="block">
                    <span className="mb-2 block text-sm font-medium text-[#171717]">Workspace</span>
                    <span className="flex h-11 items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3 transition focus-within:border-[#a1a1a1]">
                      <Building2 size={18} className="text-[#888888]" />
                      <input
                        value={workspace}
                        onChange={(event) => setWorkspace(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#888888]"
                        placeholder="Acme knowledge"
                        autoComplete="organization"
                      />
                    </span>
                  </motion.label>
                </>
              ) : null}

              <motion.label variants={fieldVariants} className="block">
                <span className="mb-2 block text-sm font-medium text-[#171717]">Email</span>
                <span className="flex h-11 items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3 transition focus-within:border-[#a1a1a1]">
                  <Mail size={18} className="text-[#888888]" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#888888]"
                    placeholder="admin@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </span>
              </motion.label>

              <motion.label variants={fieldVariants} className="block">
                <span className="mb-2 block text-sm font-medium text-[#171717]">Password</span>
                <span className="flex h-11 items-center gap-3 rounded-md border border-[#ebebeb] bg-white px-3 transition focus-within:border-[#a1a1a1]">
                  <LockKeyhole size={18} className="text-[#888888]" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#888888]"
                    placeholder="Enter password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                  />
                </span>
              </motion.label>

              <motion.div variants={fieldVariants} className="rounded-md border border-[#ffefcf] bg-[#fff8ea] p-3 text-xs leading-5 text-[#ab570a]">
                Demo auth creates separate backend users by email and workspace, then stores a signed API session token in this browser.
              </motion.div>

              <motion.button
                data-anime-hover
                variants={fieldVariants}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#171717] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#ebebeb] disabled:text-[#888888]"
              >
                {isSubmitting ? "Opening workspace..." : copy.action}
                <ArrowRight size={17} />
              </motion.button>

              <motion.button
                data-anime-hover
                variants={fieldVariants}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                disabled={isSubmitting}
                onClick={() => openWorkspace("sso")}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d3e5ff] bg-[#eef6ff] px-4 text-sm font-semibold text-[#0761d1] transition hover:border-[#9bc7ff] hover:bg-[#e3f0ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue with SSO
                <ShieldCheck size={17} />
              </motion.button>
            </form>

            <motion.div variants={fieldVariants} className="mt-6 flex items-center justify-center gap-2 text-sm text-[#4d4d4d]">
              <span>{copy.switchText}</span>
              <Link href={copy.switchHref} data-anime-hover className="font-medium text-[#0070f3] transition hover:text-[#0761d1]">
                {copy.switchLabel}
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
