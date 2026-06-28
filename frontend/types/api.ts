export type DocumentStatus = "uploaded" | "processing" | "indexed" | "failed";

export interface DocumentItem {
  id: string;
  title: string;
  file_name: string;
  source_type: string;
  source_uri?: string | null;
  mime_type?: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  indexed_at?: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: SourceEvent[];
  created_at: string;
  latency_ms?: number | null;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface SourceEvent {
  document_id: string;
  title: string;
  score: number;
  source_type?: string;
  snippet: string;
  source_uri?: string | null;
}

export interface Connector {
  id?: string | null;
  provider: string;
  status: string;
  config: Record<string, unknown>;
}

export interface AdminStats {
  total_documents: number;
  indexed_documents: number;
  total_questions: number;
  average_latency_ms: number;
  users: Array<{ id: string; name: string; email: string; role: string; status: string }>;
  recent_documents: Array<{ id: string; title: string; status: string; file_name: string; created_at: string }>;
  recent_sessions: Array<{ id: string; title: string; updated_at: string }>;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  audit_metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageLog {
  id: string;
  event_type: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  usage_metadata: Record<string, unknown>;
  created_at: string;
}

export type ChatStreamEvent =
  | { type: "status"; message: string }
  | ({ type: "source" } & SourceEvent)
  | { type: "answer_delta"; text: string }
  | {
      type: "done";
      latency_ms: number;
      session_id: string;
      user_message_id?: string;
      assistant_message_id?: string;
      timings?: Record<string, number>;
    }
  | { type: "error"; message: string };
