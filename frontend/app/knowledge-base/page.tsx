"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { FilePlus2, Loader2, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ListRowsSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { DocumentItem } from "@/types/api";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments({ showSkeleton: true });
    const interval = window.setInterval(() => loadDocuments({ background: true }), 5000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadDocuments(options: { showSkeleton?: boolean; background?: boolean } = {}) {
    if (options.showSkeleton) {
      setIsLoadingDocuments(true);
    } else if (!options.background) {
      setIsRefreshing(true);
    }

    try {
      setDocuments(await api.documents());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents");
    } finally {
      if (options.showSkeleton) {
        setIsLoadingDocuments(false);
      }
      if (!options.background) {
        setIsRefreshing(false);
      }
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    try {
      await api.uploadDocuments(formData);
      clearSelectedFiles();
      await loadDocuments({ background: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function reindex(id: string) {
    setPendingDocumentId(id);
    setError(null);
    try {
      await api.reindexDocument(id);
      await loadDocuments({ background: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-index failed");
    } finally {
      setPendingDocumentId(null);
    }
  }

  async function remove(id: string) {
    setPendingDocumentId(id);
    setError(null);
    try {
      await api.deleteDocument(id);
      await loadDocuments({ background: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPendingDocumentId(null);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setFiles((current) => {
      const existingKeys = new Set(current.map(fileKey));
      const nextFiles = [...current];
      for (const file of selectedFiles) {
        if (!existingKeys.has(fileKey(file))) {
          nextFiles.push(file);
        }
      }
      return nextFiles;
    });
  }

  function removeSelectedFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function clearSelectedFiles() {
    setFiles([]);
    setInputKey((current) => current + 1);
  }

  return (
    <AppShell title="Knowledge Base" subtitle="Upload and manage tenant-scoped documents for retrieval.">
      {error ? <div className="mb-4 rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-4 text-sm text-[#c50000]">{error}</div> : null}
      <section className="mb-5 rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] sm:mb-6 sm:p-5" aria-busy={isUploading}>
        <form onSubmit={upload} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-lg border border-dashed border-[#ebebeb] bg-[#fafafa] px-4 py-4 transition hover:border-[#a1a1a1] sm:px-5">
            <div className="mb-2 flex items-center gap-3 text-sm font-medium text-[#171717]">
              <UploadCloud size={20} className="text-[#0070f3]" />
              {files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose TXT, MD, PDF, or DOCX files"}
            </div>
            <div className="text-sm text-[#4d4d4d]">Select one or many files. Each file is queued for worker ingestion.</div>
            <input key={inputKey} type="file" accept=".txt,.md,.pdf,.docx" multiple disabled={isUploading} onChange={selectFile} className="hidden" />
          </label>
          <button
            type="submit"
            disabled={!files.length || isUploading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FilePlus2 size={18} />}
            {isUploading ? "Uploading" : files.length > 1 ? `Upload ${files.length}` : "Upload"}
          </button>
        </form>
        {files.length ? (
          <div className="mt-4 rounded-md border border-[#ebebeb] bg-[#fafafa]">
            <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-3 py-3 sm:px-4">
              <div className="text-sm font-medium text-[#171717]">Selected files</div>
              <button
                type="button"
                onClick={clearSelectedFiles}
                disabled={isUploading}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-[#ebebeb] bg-white px-2.5 text-sm text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
              >
                <X size={14} />
                Clear
              </button>
            </div>
            <div className="divide-y divide-[#ebebeb]">
              {files.map((selectedFile, index) => (
                <div key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#171717]">{selectedFile.name}</div>
                    <div className="mt-1 font-mono text-xs text-[#888888]">{formatBytes(selectedFile.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    disabled={isUploading}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
        <div className="flex items-center justify-between border-b border-[#ebebeb] p-4">
          <h2 className="text-base font-semibold text-[#171717]">Documents</h2>
          <button
            onClick={() => loadDocuments()}
            disabled={isRefreshing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ebebeb] text-[#4d4d4d] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : undefined} />
          </button>
        </div>
        {isLoadingDocuments ? (
          <ListRowsSkeleton rows={5} />
        ) : documents.length ? (
          <div className="divide-y divide-[#ebebeb]">
            {documents.map((document) => (
              <div key={document.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center md:grid-cols-[1fr_auto_auto] md:gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#171717]">{document.title}</div>
                  <div className="mt-1 truncate font-mono text-xs text-[#888888]">
                    {document.file_name} - {new Date(document.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="justify-self-start sm:justify-self-end">
                  <StatusBadge status={document.status} />
                </div>
                <div className="flex gap-2 sm:justify-self-end">
                  <button
                    onClick={() => reindex(document.id)}
                    disabled={Boolean(pendingDocumentId)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ebebeb] text-[#4d4d4d] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Re-index"
                  >
                    <RefreshCw size={16} className={pendingDocumentId === document.id ? "animate-spin" : undefined} />
                  </button>
                  <button
                    onClick={() => remove(document.id)}
                    disabled={Boolean(pendingDocumentId)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f7d4d6] text-[#c50000] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={FilePlus2} title="No documents uploaded" body="Upload one or more files to create metadata, ACL entries, sync jobs, chunks, and embeddings." />
        )}
      </section>
    </AppShell>
  );
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
