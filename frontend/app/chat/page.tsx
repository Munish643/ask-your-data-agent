"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Bot,
  Check,
  FileSearch,
  History,
  MessageSquarePlus,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Send,
  Sparkles,
  X
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api, streamChat } from "@/lib/api";
import clsx from "@/lib/clsx";
import type { ChatMessage, ChatSession, SourceEvent } from "@/types/api";

type LocalMessage = Pick<ChatMessage, "id" | "role" | "content" | "sources">;

const EMPTY_PROMPTS = [
  "Give me an overview of the indexed documents",
  "What are the key topics in my knowledge base?",
  "List important definitions from the sources"
];

const FOLLOW_UP_PROMPTS = [
  "Summarize that in bullets",
  "Which source supports this?",
  "Explain it in simpler words",
  "What should I ask next?"
];

type SendOptions = {
  editedMessageId?: string | null;
};

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sources, setSources] = useState<SourceEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const [streamCompletionTick, setStreamCompletionTick] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const answerBuffersRef = useRef<Record<string, string>>({});
  const streamFinishedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    loadSessions().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statuses]);

  useEffect(() => {
    if (!activeAssistantId) return;

    const interval = window.setInterval(() => {
      const target = answerBuffersRef.current[activeAssistantId] ?? "";
      setMessages((current) => {
        let changed = false;
        const nextMessages = current.map((message) => {
          if (message.id !== activeAssistantId) {
            return message;
          }

          if (message.content.length >= target.length) {
            return message;
          }

          const remaining = target.length - message.content.length;
          const step = remaining > 280 ? 18 : remaining > 120 ? 10 : remaining > 32 ? 6 : 3;
          changed = true;
          return { ...message, content: target.slice(0, message.content.length + step) };
        });
        return changed ? nextMessages : current;
      });
    }, 18);

    return () => window.clearInterval(interval);
  }, [activeAssistantId]);

  useEffect(() => {
    if (!activeAssistantId || !streamFinishedRef.current[activeAssistantId]) return;

    const target = answerBuffersRef.current[activeAssistantId] ?? "";
    const message = messages.find((item) => item.id === activeAssistantId);
    if (message && message.content.length >= target.length) {
      delete answerBuffersRef.current[activeAssistantId];
      delete streamFinishedRef.current[activeAssistantId];
      setActiveAssistantId(null);
      setIsStreaming(false);
    }
  }, [activeAssistantId, messages, streamCompletionTick]);

  async function loadSessions() {
    const nextSessions = await api.sessions();
    setSessions(nextSessions);
  }

  async function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    setStatuses([]);
    setSources([]);
    setError(null);
    setEditingMessageId(null);
    setEditingText("");
    setActiveAssistantId(null);
    answerBuffersRef.current = {};
    streamFinishedRef.current = {};
    const detail = await api.session(sessionId);
    setMessages(detail.messages.map((message) => ({ id: message.id, role: message.role, content: message.content, sources: message.sources })));
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setStatuses([]);
    setSources([]);
    setError(null);
    setEditingMessageId(null);
    setEditingText("");
    setActiveAssistantId(null);
    answerBuffersRef.current = {};
    streamFinishedRef.current = {};
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(query);
  }

  async function sendMessage(rawQuery: string, options: SendOptions = {}) {
    const cleanQuery = rawQuery.trim();
    if (!cleanQuery || isStreaming) return;

    const localUserId = options.editedMessageId ?? createClientId();
    const assistantId = createClientId();
    answerBuffersRef.current[assistantId] = "";
    streamFinishedRef.current[assistantId] = false;
    setActiveAssistantId(assistantId);
    setMessages((current) => {
      if (options.editedMessageId) {
        const editIndex = current.findIndex((message) => message.id === options.editedMessageId);
        if (editIndex >= 0) {
          return [
            ...current.slice(0, editIndex),
            { ...current[editIndex], content: cleanQuery, sources: [] },
            { id: assistantId, role: "assistant", content: "", sources: [] }
          ];
        }
      }

      return [
        ...current,
        { id: localUserId, role: "user", content: cleanQuery, sources: [] },
        { id: assistantId, role: "assistant", content: "", sources: [] }
      ];
    });
    setQuery("");
    setEditingMessageId(null);
    setEditingText("");
    setSources([]);
    setStatuses([]);
    setError(null);
    setIsStreaming(true);

    try {
      await streamChat({ query: cleanQuery, session_id: activeSessionId, edited_message_id: options.editedMessageId }, (event) => {
        if (event.type === "status") {
          setStatuses((current) => [...current, event.message]);
        }
        if (event.type === "source") {
          setSources((current) => [...current, event]);
        }
        if (event.type === "answer_delta") {
          answerBuffersRef.current[assistantId] = `${answerBuffersRef.current[assistantId] ?? ""}${event.text}`;
        }
        if (event.type === "done") {
          setActiveSessionId(event.session_id);
          setStatuses((current) => [...current, formatCompletionStatus(event.latency_ms, event.timings)]);
          if (event.user_message_id && !options.editedMessageId) {
            setMessages((current) =>
              current.map((message) => (message.id === localUserId ? { ...message, id: event.user_message_id ?? message.id } : message))
            );
          }
          loadSessions().catch(() => undefined);
        }
        if (event.type === "error") {
          setError(event.message);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Streaming failed");
    } finally {
      streamFinishedRef.current[assistantId] = true;
      setStreamCompletionTick((current) => current + 1);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void sendMessage(query);
  }

  function startEditing(message: LocalMessage) {
    if (isStreaming || message.role !== "user") return;
    setEditingMessageId(message.id);
    setEditingText(message.content);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditingText("");
  }

  function saveEditedMessage() {
    if (!editingMessageId || !editingText.trim()) return;
    void sendMessage(editingText, { editedMessageId: editingMessageId });
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }

    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    saveEditedMessage();
  }

  const currentStatus = statuses.at(-1);
  const canUseFollowUps = messages.length > 0 && !isStreaming;

  return (
    <AppShell
      title="Chat"
      subtitle="Ask questions and receive permission-filtered, source-backed answers."
      contentClassName="max-w-none px-0 py-0 md:px-0"
    >
      <div className="flex h-[calc(100vh-82px)] min-h-[680px] overflow-hidden bg-[#fafafa]">
        <HistoryPanel
          open={historyOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={selectSession}
          onNew={startNewChat}
          onClose={() => setHistoryOpen(false)}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#ebebeb] bg-white px-3 md:px-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryOpen((current) => !current)}
                data-anime-hover
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-[#4d4d4d] transition hover:border-[#ebebeb] hover:bg-[#fafafa] hover:text-[#171717]"
                title={historyOpen ? "Close chats" : "Open chats"}
              >
                <History size={19} />
              </button>
              <button
                onClick={startNewChat}
                data-anime-hover
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f5f5f5]"
              >
                <MessageSquarePlus size={17} />
                New chat
              </button>
            </div>
            <button
              onClick={() => setSourcesOpen((current) => !current)}
              data-anime-hover
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f5f5f5]"
            >
              {sourcesOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
              Sources
              {sources.length ? <span className="rounded-full bg-[#d3e5ff] px-2 py-0.5 font-mono text-xs text-[#0761d1]">{sources.length}</span> : null}
            </button>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 md:px-8">
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-[#ebebeb] bg-white text-[#171717] shadow-[0_1px_1px_#00000008,0_2px_2px_#0000000a]">
                    <Sparkles size={26} />
                  </div>
                  <h2 className="text-2xl font-semibold text-[#171717] md:text-3xl">What do you want to know?</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#4d4d4d]">
                    Ask from your indexed company knowledge base and the answer will stream here with sources.
                  </p>
                  <FollowUpChips prompts={EMPTY_PROMPTS} onAsk={(prompt) => void sendMessage(prompt)} disabled={isStreaming} />
                </div>
              ) : (
                <div className="space-y-8 pb-4">
                  {messages.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      isStreaming={isStreaming && message.id === activeAssistantId}
                      currentStatus={currentStatus}
                      canEdit={!isStreaming && Boolean(activeSessionId)}
                      isEditing={editingMessageId === message.id}
                      editingText={editingText}
                      onEdit={() => startEditing(message)}
                      onEditTextChange={setEditingText}
                      onEditKeyDown={handleEditKeyDown}
                      onSaveEdit={saveEditedMessage}
                      onCancelEdit={cancelEditing}
                    />
                  ))}
                  {canUseFollowUps ? <FollowUpChips prompts={FOLLOW_UP_PROMPTS} onAsk={(prompt) => void sendMessage(prompt)} disabled={isStreaming} /> : null}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </div>

          {error ? (
            <div className="mx-auto mb-3 w-full max-w-4xl px-4 md:px-8">
              <div className="rounded-md border border-[#f7d4d6] bg-[#fff5f5] p-3 text-sm text-[#c50000]">{error}</div>
            </div>
          ) : null}

          <form onSubmit={submit} className="shrink-0 border-t border-[#ebebeb] bg-[#fafafa] px-3 py-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-end gap-3 rounded-lg border border-[#ebebeb] bg-white p-2 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] focus-within:border-[#a1a1a1]">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  className="max-h-44 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-6 text-[#171717] outline-none placeholder:text-[#888888]"
                  placeholder="Message Ask-Your-Data"
                />
                <button
                  data-anime-hover
                  type="submit"
                  disabled={isStreaming || !query.trim()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#171717] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#ebebeb] disabled:text-[#888888]"
                  title="Send"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 px-1 font-mono text-[11px] text-[#888888]">Enter sends. Shift + Enter adds a new line.</div>
            </div>
          </form>
        </section>

        <SourcesPanel open={sourcesOpen} sources={sources} onClose={() => setSourcesOpen(false)} />
      </div>
    </AppShell>
  );
}

function HistoryPanel({
  open,
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onClose
}: {
  open: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-[#ebebeb] bg-white lg:flex">
      <div className="flex h-14 items-center justify-between border-b border-[#ebebeb] px-4">
        <h2 className="text-sm font-semibold text-[#171717]">Chats</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNew}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
            title="New chat"
          >
            <MessageSquarePlus size={17} />
          </button>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
            title="Close chats"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
      </div>
      <div className="thin-scrollbar flex-1 overflow-y-auto p-3">
        {sessions.length ? (
          <div className="space-y-1.5">
            {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              data-anime-hover
              className={clsx(
                  "block w-full rounded-md px-3 py-3 text-left transition",
                  activeSessionId === session.id ? "bg-[#f5f5f5] text-[#171717]" : "text-[#4d4d4d] hover:bg-[#fafafa] hover:text-[#171717]"
                )}
              >
                <span className="line-clamp-2 text-sm font-medium leading-5">{session.title}</span>
                <span className="mt-1 block font-mono text-xs text-[#888888]">{new Date(session.updated_at).toLocaleString()}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#ebebeb] bg-[#fafafa] p-4 text-sm leading-6 text-[#888888]">Your chats will appear here.</div>
        )}
      </div>
    </aside>
  );
}

function MessageRow({
  message,
  isStreaming,
  currentStatus,
  canEdit,
  isEditing,
  editingText,
  onEdit,
  onEditTextChange,
  onEditKeyDown,
  onSaveEdit,
  onCancelEdit
}: {
  message: LocalMessage;
  isStreaming: boolean;
  currentStatus?: string;
  canEdit: boolean;
  isEditing: boolean;
  editingText: string;
  onEdit: () => void;
  onEditTextChange: (value: string) => void;
  onEditKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const isAssistant = message.role === "assistant";

  if (!isAssistant) {
    return (
      <motion.div data-anime-reveal initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex justify-end">
        <div className="group max-w-[82%] md:max-w-[72%]">
          {isEditing ? (
            <div className="rounded-lg border border-[#ebebeb] bg-white p-2 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
              <textarea
                value={editingText}
                onChange={(event) => onEditTextChange(event.target.value)}
                onKeyDown={onEditKeyDown}
                rows={Math.min(8, Math.max(2, editingText.split("\n").length))}
                className="min-h-24 w-full resize-y bg-transparent px-3 py-2 text-[15px] leading-7 text-[#171717] outline-none"
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ebebeb] text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
                  title="Cancel edit"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={onSaveEdit}
                  disabled={!editingText.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#171717] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#ebebeb] disabled:text-[#888888]"
                  title="Save and resend"
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-end gap-2">
              {canEdit ? (
                <button
                  onClick={onEdit}
                  data-anime-hover
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#4d4d4d] opacity-100 transition hover:bg-[#f5f5f5] hover:text-[#171717] md:opacity-0 md:group-hover:opacity-100"
                  title="Edit message"
                >
                  <Pencil size={14} />
                </button>
              ) : null}
              <div className="rounded-lg bg-[#171717] px-4 py-3 text-[15px] leading-7 text-white">
                {message.content}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div data-anime-reveal initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="grid grid-cols-[34px_minmax(0,1fr)] gap-4">
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#ebebeb] bg-white text-[#171717]">
        <Bot size={17} />
      </div>
      <div className="min-w-0 text-[15px] leading-7 text-[#171717]">
        {message.content ? (
          <div className={clsx("whitespace-pre-wrap", isStreaming && "streaming-answer")}>
            {message.content}
            {isStreaming ? <span className="stream-cursor" /> : null}
          </div>
        ) : isStreaming ? (
          <ThinkingIndicator status={currentStatus} />
        ) : (
          <span className="text-[#888888]">No answer was returned.</span>
        )}
      </div>
    </motion.div>
  );
}

function FollowUpChips({ prompts, onAsk, disabled }: { prompts: string[]; onAsk: (prompt: string) => void; disabled: boolean }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 pt-2">
      {prompts.map((prompt) => (
        <motion.button
          key={prompt}
          onClick={() => onAsk(prompt)}
          disabled={disabled}
          data-anime-hover
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-full border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#4d4d4d] transition hover:border-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}

function ThinkingIndicator({ status }: { status?: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm text-[#4d4d4d] shadow-[0_1px_1px_#00000005]">
      <span>{status ?? "Thinking"}</span>
      <span className="thinking-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

function SourcesPanel({ open, sources, onClose }: { open: boolean; sources: SourceEvent[]; onClose: () => void }) {
  if (!open) return null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-[#ebebeb] bg-white xl:flex">
      <div className="flex h-14 items-center justify-between border-b border-[#ebebeb] px-4">
        <div className="flex items-center gap-2">
          <FileSearch size={17} className="text-[#0070f3]" />
          <h2 className="text-sm font-semibold text-[#171717]">Sources</h2>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#4d4d4d] transition hover:bg-[#f5f5f5] hover:text-[#171717]"
          title="Close sources"
        >
          <PanelRightClose size={17} />
        </button>
      </div>
      <div className="thin-scrollbar flex-1 overflow-y-auto p-4">
        {sources.length ? (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div key={`${source.document_id}-${index}`} className="rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium leading-5 text-[#171717]">{source.title}</h3>
                  <span className="rounded-full bg-[#d3e5ff] px-2 py-1 font-mono text-xs text-[#0761d1]">{Math.round(source.score * 100)}%</span>
                </div>
                <div className="mb-2 font-mono text-xs text-[#888888]">{source.source_type ?? "upload"}</div>
                <p className="text-sm leading-6 text-[#4d4d4d]">{source.snippet}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#ebebeb] bg-[#fafafa] p-4 text-sm leading-6 text-[#888888]">Retrieved sources will appear here.</div>
        )}
      </div>
    </aside>
  );
}

function formatCompletionStatus(latencyMs: number, timings?: Record<string, number>) {
  if (!timings) {
    return `Completed in ${latencyMs} ms`;
  }

  const parts = [
    timings.embedding_ms !== undefined ? `embed ${timings.embedding_ms} ms` : null,
    timings.retrieval_ms !== undefined ? `search ${timings.retrieval_ms} ms` : null,
    timings.generation_ms !== undefined ? `Gemini ${timings.generation_ms} ms` : null
  ].filter(Boolean);

  return parts.length ? `Completed in ${latencyMs} ms (${parts.join(", ")})` : `Completed in ${latencyMs} ms`;
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
