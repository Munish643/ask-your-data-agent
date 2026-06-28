"use client";

import { useEffect, useState } from "react";
import { Clock3, FileText, Gauge, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ListCardSkeleton, StatCardSkeleton } from "@/components/LoadingSkeleton";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { AdminStats } from "@/types/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  const isLoading = !stats && !error;

  return (
    <AppShell title="Dashboard" subtitle="Workspace health, indexed knowledge, and recent activity.">
      {error ? <div className="mb-4 rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-4 text-sm text-[#c50000]">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard label="Total documents" value={stats?.total_documents ?? 0} icon={FileText} />
            <StatCard label="Indexed documents" value={stats?.indexed_documents ?? 0} icon={Gauge} />
            <StatCard label="Total questions" value={stats?.total_questions ?? 0} icon={MessageSquareText} />
            <StatCard label="Average latency" value={stats ? `${stats.average_latency_ms} ms` : "0 ms"} icon={Clock3} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#171717]">Recent documents</h2>
          </div>
          {isLoading ? (
            <ListCardSkeleton rows={4} />
          ) : (
            <div className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
              {stats?.recent_documents.length ? (
              <div className="divide-y divide-[#ebebeb]">
                {stats.recent_documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#171717]">{document.title}</div>
                      <div className="mt-1 truncate font-mono text-xs text-[#888888]">{document.file_name}</div>
                    </div>
                    <StatusBadge status={document.status} />
                  </div>
                ))}
              </div>
              ) : (
                <EmptyState icon={FileText} title="No documents yet" body="Upload a policy, handbook, memo, or markdown file to begin indexing." />
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#171717]">Recent chat sessions</h2>
          </div>
          {isLoading ? (
            <ListCardSkeleton rows={4} />
          ) : (
            <div className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
              {stats?.recent_sessions.length ? (
              <div className="divide-y divide-[#ebebeb]">
                {stats.recent_sessions.map((session) => (
                  <div key={session.id} className="p-4">
                    <div className="text-sm font-medium text-[#171717]">{session.title}</div>
                    <div className="mt-1 font-mono text-xs text-[#888888]">{new Date(session.updated_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              ) : (
                <EmptyState icon={MessageSquareText} title="No chats yet" body="Ask a question after indexing documents to create source-backed session history." />
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
