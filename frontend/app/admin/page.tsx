"use client";

import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ListRowsSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { AdminStats, AuditLog, UsageLog } from "@/types/api";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.stats(), api.auditLogs(), api.usageLogs()])
      .then(([nextStats, nextAuditLogs, nextUsageLogs]) => {
        setStats(nextStats);
        setAuditLogs(nextAuditLogs);
        setUsageLogs(nextUsageLogs);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell title="Admin" subtitle="Users, roles, audit trail, and usage accounting.">
      {error ? <div className="mb-4 rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-4 text-sm text-[#c50000]">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
          <div className="flex items-center gap-2 border-b border-[#ebebeb] p-4">
            <Users size={18} className="text-[#0070f3]" />
            <h2 className="text-base font-semibold text-[#171717]">Users & Roles</h2>
          </div>
          {isLoading ? (
            <ListRowsSkeleton rows={4} />
          ) : stats?.users.length ? (
            <div className="divide-y divide-[#ebebeb]">
              {stats.users.map((user) => (
                <div key={user.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center md:grid-cols-[1fr_auto_auto]">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#171717]">{user.name}</div>
                    <div className="mt-1 break-all font-mono text-xs text-[#888888]">{user.email}</div>
                  </div>
                  <span className="w-fit rounded-full border border-[#ebebeb] bg-[#fafafa] px-2.5 py-1 font-mono text-xs text-[#4d4d4d] sm:justify-self-end">{user.role}</span>
                  <div className="sm:justify-self-end">
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No users loaded" body="The mock admin user is seeded on backend startup." />
          )}
          <div className="border-t border-[#ebebeb] p-4 text-sm text-[#4d4d4d]">
            Role editing is intentionally a placeholder in the MVP UI. The model and permission checks are in place.
          </div>
        </section>

        <section className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
          <div className="flex items-center gap-2 border-b border-[#ebebeb] p-4">
            <ShieldCheck size={18} className="text-[#0070f3]" />
            <h2 className="text-base font-semibold text-[#171717]">Audit Logs</h2>
          </div>
          <div className="thin-scrollbar max-h-[410px] overflow-auto">
            {isLoading ? (
              <TableSkeleton rows={5} columns={3} />
            ) : (
              <>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-[#ebebeb] font-mono text-xs text-[#888888]">
                    <tr>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Resource</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebebeb]">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-[#171717]">{log.action}</td>
                        <td className="px-4 py-3 text-[#4d4d4d]">{log.resource_type}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#888888]">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!auditLogs.length ? <EmptyState icon={ShieldCheck} title="No audit events" body="Uploads, deletes, chat queries, and admin views write audit records." /> : null}
              </>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
        <div className="flex items-center gap-2 border-b border-[#ebebeb] p-4">
          <Activity size={18} className="text-[#0070f3]" />
          <h2 className="text-base font-semibold text-[#171717]">Usage Logs</h2>
        </div>
        <div className="thin-scrollbar overflow-auto">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[#ebebeb] font-mono text-xs text-[#888888]">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Input</th>
                    <th className="px-4 py-3">Output</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebeb]">
                  {usageLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-[#171717]">{log.event_type}</td>
                      <td className="px-4 py-3 text-[#4d4d4d]">{log.input_tokens}</td>
                      <td className="px-4 py-3 text-[#4d4d4d]">{log.output_tokens}</td>
                      <td className="px-4 py-3 text-[#4d4d4d]">{log.latency_ms} ms</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#888888]">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!usageLogs.length ? <EmptyState icon={Activity} title="No usage yet" body="Chat completions create usage records with token and cost placeholders." /> : null}
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
