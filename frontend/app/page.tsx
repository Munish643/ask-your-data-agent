"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileSearch,
  LockKeyhole,
  LogIn,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UserPlus
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const promises = [
  { label: "SSO-ready", detail: "Replace mock auth with OIDC/JWT", icon: LockKeyhole },
  { label: "Role-based access", detail: "Tenant and role-scoped retrieval", icon: ShieldCheck },
  { label: "Citations", detail: "Sources returned with every answer", icon: FileSearch },
  { label: "Streaming answers", detail: "SSE response events in the chat UI", icon: RadioTower }
];

const stats = [
  { value: "4", label: "file types", detail: "TXT, MD, PDF, DOCX" },
  { value: "3", label: "core steps", detail: "upload, index, ask" },
  { value: "100%", label: "tenant scoped", detail: "queries filter by workspace" }
];

const pipeline = [
  { label: "Upload", value: "Multi-file queue" },
  { label: "Index", value: "pgvector + worker" },
  { label: "Answer", value: "Citations + audit" }
];

const flow = [
  { title: "Upload", body: "Drop one or many files into the knowledge base and queue ingestion jobs." },
  { title: "Index", body: "Extract text, chunk content, embed vectors, and store citations in PostgreSQL + pgvector." },
  { title: "Ask", body: "Stream source-backed answers with audit logs, usage records, and permission checks." }
];

const controls = [
  "Document ACLs by tenant and role",
  "Audit trail for uploads, deletes, and chat",
  "Usage logs with token and latency records",
  "Gemini generation and embedding settings",
  "Redis-backed worker queue",
  "PostgreSQL SSL configuration"
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main data-anime-page className="min-h-screen bg-[#070A12] text-white">
      <section
        className="relative min-h-[88dvh] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero-knowledge-graph.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,18,0.98)_0%,rgba(7,10,18,0.83)_44%,rgba(7,10,18,0.48)_76%,rgba(7,10,18,0.28)_100%)]" />
        <motion.nav
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-4 sm:px-5 md:px-10"
        >
          <Link href="/" data-anime-hover className="inline-flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15">
            <BookOpen size={18} />
            <span className="truncate">Ask-Your-Data</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard"
              data-anime-hover
              className="hidden h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/10 sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              data-anime-hover
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/10"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Login</span>
            </Link>
            <Link
              href="/signup"
              data-anime-hover
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#171717] transition hover:bg-slate-100"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Sign up</span>
            </Link>
          </div>
        </motion.nav>

        <div className="relative z-10 mx-auto grid min-h-[88dvh] max-w-7xl items-end gap-8 px-4 pb-8 pt-28 sm:px-5 sm:pt-24 md:px-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:pb-10">
          <motion.div data-anime-reveal className="max-w-4xl" variants={container} initial="hidden" animate="show">
            <motion.div variants={item} className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-sm text-[#fdba74]">
              <Sparkles size={14} />
              Enterprise RAG workspace
            </motion.div>

            <motion.h1 variants={item} className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal sm:text-5xl md:text-6xl xl:text-7xl">
              Ask your company data with source-backed AI.
            </motion.h1>

            <motion.p variants={item} className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:mt-6 sm:text-lg sm:leading-8">
              Upload files, index knowledge, stream answers, and keep every response scoped to users, workspaces, citations, and audit logs.
            </motion.p>

            <motion.div variants={item} className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/signup"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-semibold text-white transition hover:bg-orange-500 sm:w-auto"
                >
                  Create account
                  <UserPlus size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 sm:w-auto"
                >
                  Log in
                  <LogIn size={18} />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3 rounded-lg border border-white/10 bg-[#070A12]/75 p-4 backdrop-blur lg:mb-0"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="font-mono text-xs uppercase text-slate-400">Workspace loop</div>
                <div className="mt-1 text-sm font-semibold text-white">Ready for private files</div>
              </div>
              <Database size={20} className="text-[#f97316]" />
            </div>
            {pipeline.map((step) => (
              <motion.div key={step.label} variants={item} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.05] px-3 py-3">
                <span className="text-sm font-medium text-slate-100">{step.label}</span>
                <span className="text-right font-mono text-xs text-slate-400">{step.value}</span>
              </motion.div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={item} className="rounded-md border border-white/10 bg-white/[0.05] p-3">
                  <div className="text-lg font-semibold text-white">{stat.value}</div>
                  <div className="mt-1 text-[11px] leading-4 text-slate-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[#232A37] bg-[#070A12] px-4 py-6 sm:px-5 sm:py-8 md:px-10">
        <motion.div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          {promises.map((promise) => {
            const Icon = promise.icon;
            return (
              <motion.div
                key={promise.label}
                data-anime-reveal
                data-anime-hover
                variants={item}
                whileHover={{ y: -4 }}
                className="rounded-lg border border-[#232A37] bg-[#10151F] p-4"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[#232A37] bg-[#070A12] text-[#f97316]">
                  <Icon size={19} />
                </div>
                <div className="text-sm font-medium text-slate-100">{promise.label}</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">{promise.detail}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="bg-[#fafafa] px-4 py-12 text-[#171717] sm:px-5 sm:py-16 md:px-10">
        <motion.div className="mx-auto max-w-7xl" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <motion.div variants={item} className="mb-8 max-w-2xl">
            <div className="mb-3 font-mono text-xs text-[#888888]">RAG workflow</div>
            <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">From files to governed answers.</h2>
            <p className="mt-3 text-base leading-7 text-[#4d4d4d]">
              The workspace already connects ingestion, retrieval, streaming chat, document governance, and admin visibility in one loop.
            </p>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-3">
            {flow.map((step, index) => (
              <motion.div
                key={step.title}
                data-anime-reveal
                data-anime-hover
                variants={item}
                whileHover={{ y: -5 }}
                className="rounded-lg border border-[#ebebeb] bg-white p-5 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-[#171717] font-mono text-sm text-white">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4d4d4d]">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bg-white px-4 py-12 text-[#171717] sm:px-5 sm:py-16 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.35 }}>
            <div className="mb-3 font-mono text-xs text-[#888888]">Controls</div>
            <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Built for teams, not just demos.</h2>
            <p className="mt-3 text-base leading-7 text-[#4d4d4d]">
              The app includes the operational pieces you need before connecting real identity, hosted databases, and managed storage.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/knowledge-base" data-anime-hover className="inline-flex h-10 items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-medium text-white">
                Manage Knowledge
              </Link>
              <Link href="/admin" data-anime-hover className="inline-flex h-10 items-center justify-center rounded-md border border-[#ebebeb] bg-white px-4 text-sm font-medium text-[#171717]">
                View Admin
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {controls.map((control) => (
              <motion.div key={control} data-anime-reveal data-anime-hover variants={item} className="flex items-start gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-4">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#0070f3]" />
                <span className="text-sm leading-6 text-[#4d4d4d]">{control}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[#ebebeb] bg-[#fafafa] px-4 py-10 text-[#171717] sm:px-5 sm:py-12 md:px-10">
        <motion.div
          data-anime-reveal
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-7xl flex-col gap-5 rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] sm:p-6 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#171717]">
              <Database size={18} className="text-[#0070f3]" />
              Ready for your next local test
            </div>
            <p className="text-sm leading-6 text-[#4d4d4d]">
              Upload multiple files, re-index with Gemini embeddings, and ask questions against tenant-scoped sources.
            </p>
          </div>
          <Link href="/signup" data-anime-hover className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#0070f3] px-4 text-sm font-medium text-white">
            Create account
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
