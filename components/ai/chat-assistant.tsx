"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatContextFilter, ChatMessage } from "@/lib/ai/types";
import type { Branch } from "@/lib/dealership/types";
import { MessageMarkdown } from "@/components/ai/message-markdown";
import { QuerySuggestionChips } from "@/components/ai/query-suggestions";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatAssistant({
  open,
  onOpenChange,
  context,
  branches,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: ChatContextFilter;
  branches: Branch[];
}) {
  const titleId = useId();
  const panelId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const history = [...messages, userMsg];
    const assistantId = uid();
    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          context,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) {
          if (!block.startsWith("data: ")) continue;
          let payload: { type?: string; text?: string; message?: string };
          try {
            payload = JSON.parse(block.slice(6)) as typeof payload;
          } catch {
            continue;
          }
          if (payload.type === "token" && payload.text) {
            acc += payload.text;
            setMessages((m) =>
              m.map((x) =>
                x.id === assistantId ? { ...x, content: acc } : x,
              ),
            );
          }
          if (payload.type === "error") {
            throw new Error(payload.message ?? "Stream error");
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      setMessages((m) => m.filter((x) => x.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }, [context, input, messages, streaming]);

  const onPickSuggestion = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg shadow-teal-900/25 ring-2 ring-white/40 transition hover:from-teal-500 hover:to-teal-700 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
        onClick={() => onOpenChange(!open)}
      >
        <span className="sr-only">Open chat assistant</span>
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="11" r="1.15" fill="currentColor" />
          <circle cx="12" cy="11" r="1.15" fill="currentColor" />
          <circle cx="15" cy="11" r="1.15" fill="currentColor" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            id={panelId}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0 sm:p-4"
          >
            <div
              className="fixed inset-0 z-0"
              aria-hidden
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              exit={{ y: 24 }}
              className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div>
                  <h2
                    id={titleId}
                    className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                  >
                    DealerPulse AI
                  </h2>
                  <p className="text-xs text-zinc-500">
                    RAG-powered answers over your dealership dataset
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </button>
              </header>

              <div
                role="log"
                aria-live="polite"
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              >
                {messages.length === 0 && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Ask about pipeline health, branch performance, stale leads,
                    or delivery timelines. Answers use vector search over embedded
                    records — never paste secrets into the chat.
                  </p>
                )}
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-teal-700 text-white"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <MessageMarkdown content={m.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {streaming && (
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                      aria-hidden
                    >
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce [animation-delay:120ms]">●</span>
                        <span className="animate-bounce [animation-delay:240ms]">●</span>
                      </span>
                    </div>
                  </div>
                )}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                <QuerySuggestionChips
                  branches={branches}
                  context={context}
                  onPick={onPickSuggestion}
                />
                <label className="sr-only" htmlFor="ai-chat-input">
                  Message
                </label>
                <textarea
                  id="ai-chat-input"
                  ref={inputRef}
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Ask a question about pipeline, branches, or leads…"
                  className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none focus:ring-2 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    onClick={() => {
                      setMessages([]);
                      setError(null);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={streaming || !input.trim()}
                    className="rounded-lg bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-50"
                    onClick={() => void send()}
                  >
                    Send
                  </button>
                </div>
              </footer>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
