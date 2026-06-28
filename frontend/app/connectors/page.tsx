"use client";

import { useEffect, useState } from "react";
import { Globe2, HardDrive, Loader2, MessageSquare, PlugZap, Share2, Workflow } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CardGridSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { Connector } from "@/types/api";

const labels: Record<string, { title: string; icon: typeof HardDrive }> = {
  google_drive: { title: "Google Drive", icon: HardDrive },
  slack: { title: "Slack", icon: MessageSquare },
  notion: { title: "Notion", icon: Workflow },
  sharepoint: { title: "SharePoint", icon: Share2 },
  website: { title: "Website", icon: Globe2 }
};

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .connectors()
      .then(setConnectors)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function start(provider: string) {
    setPendingProvider(provider);
    setError(null);
    try {
      await api.startConnector(provider);
      setConnectors(await api.connectors());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start connector");
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <AppShell title="Connectors" subtitle="Prepared provider architecture for future source sync.">
      {error ? <div className="mb-4 rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-4 text-sm text-[#c50000]">{error}</div> : null}
      {isLoading ? <CardGridSkeleton count={5} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connectors.map((connector) => {
          const meta = labels[connector.provider] ?? { title: connector.provider, icon: PlugZap };
          const Icon = meta.icon;
          const isPending = pendingProvider === connector.provider;
          return (
            <div key={connector.provider} className="rounded-lg border border-[#ebebeb] bg-white p-5 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-[#fafafa] text-[#0070f3]">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#171717]">{meta.title}</h2>
                    <p className="mt-1 text-sm text-[#4d4d4d]">Source sync connector</p>
                  </div>
                </div>
                <StatusBadge status={connector.status} />
              </div>
              <p className="mb-5 text-sm leading-6 text-[#4d4d4d]">
                Coming soon. The backend has a connector model, start callback, audit event, and sync-job-ready structure.
              </p>
              <button
                onClick={() => start(connector.provider)}
                disabled={Boolean(pendingProvider)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#ebebeb] bg-white px-4 text-sm font-medium text-[#171717] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Coming soon
              </button>
            </div>
          );
        })}
      </div>}
    </AppShell>
  );
}
