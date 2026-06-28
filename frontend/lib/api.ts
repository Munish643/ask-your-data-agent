import type {
  AdminStats,
  AuditLog,
  ChatSession,
  ChatSessionDetail,
  ChatStreamEvent,
  Connector,
  DocumentItem,
  UsageLog
} from "@/types/api";

declare global {
  interface Window {
    __ASKDATA_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_REQUEST_TIMEOUT_MS = 120000;

type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
};

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const runtimeBaseUrl = window.__ASKDATA_CONFIG__?.apiBaseUrl?.trim();
    if (runtimeBaseUrl) {
      return runtimeBaseUrl;
    }
  }

  return API_BASE_URL;
}

async function request<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...fetchInit,
      headers: {
        ...(fetchInit.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...fetchInit.headers
      },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Request failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The server did not respond in time. Check backend and worker logs, then try again.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export const api = {
  stats: () => request<AdminStats>("/api/admin/stats"),
  documents: () => request<DocumentItem[]>("/api/documents"),
  uploadDocument: (formData: FormData) =>
    request<DocumentItem>("/api/documents/upload", { method: "POST", body: formData, timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS }),
  uploadDocuments: (formData: FormData) =>
    request<DocumentItem[]>("/api/documents/upload-batch", { method: "POST", body: formData, timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS }),
  deleteDocument: (id: string) => request<{ status: string }>(`/api/documents/${id}`, { method: "DELETE" }),
  reindexDocument: (id: string) => request<DocumentItem>(`/api/documents/${id}/reindex`, { method: "POST" }),
  sessions: () => request<ChatSession[]>("/api/chat/sessions"),
  session: (id: string) => request<ChatSessionDetail>(`/api/chat/sessions/${id}`),
  createSession: () => request<ChatSession>("/api/chat/sessions", { method: "POST", body: JSON.stringify({ title: "New chat" }) }),
  connectors: () => request<Connector[]>("/api/connectors"),
  startConnector: (provider: string) => request<Connector>(`/api/connectors/${provider}/start`, { method: "POST" }),
  auditLogs: () => request<AuditLog[]>("/api/admin/audit-logs"),
  usageLogs: () => request<UsageLog[]>("/api/admin/usage-logs")
};

export async function streamChat(
  input: { query: string; session_id?: string | null; edited_message_id?: string | null },
  onEvent: (event: ChatStreamEvent) => void
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok || !response.body) {
    throw new Error(`Chat stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent);
      if (parsed) onEvent(parsed);
    }
  }
}

function parseSseEvent(raw: string): ChatStreamEvent | null {
  const eventLine = raw.split("\n").find((line) => line.startsWith("event:"));
  const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;

  const event = eventLine.replace("event:", "").trim();
  const data = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;
  if (event === "status") return { type: "status", message: String(data.message) };
  if (event === "source") {
    return {
      type: "source",
      document_id: String(data.document_id),
      title: String(data.title),
      score: Number(data.score),
      source_type: String(data.source_type ?? "upload"),
      snippet: String(data.snippet)
    };
  }
  if (event === "answer_delta") return { type: "answer_delta", text: String(data.text) };
  if (event === "done") {
    return {
      type: "done",
      latency_ms: Number(data.latency_ms),
      timings: parseTimings(data.timings),
      session_id: String(data.session_id),
      user_message_id: data.user_message_id ? String(data.user_message_id) : undefined,
      assistant_message_id: data.assistant_message_id ? String(data.assistant_message_id) : undefined
    };
  }
  if (event === "error") return { type: "error", message: String(data.message) };
  return null;
}

function parseTimings(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const timings: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const nextValue = Number(raw);
    if (Number.isFinite(nextValue)) {
      timings[key] = nextValue;
    }
  }
  return Object.keys(timings).length ? timings : undefined;
}
