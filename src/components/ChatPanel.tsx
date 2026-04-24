"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type Props = {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
};

export default function ChatPanel({
  messages = [],
  onSendMessage = () => {},
  isLoading = false,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const value = input.trim();
    if (!value || isLoading) return;

    onSendMessage(value);
    setInput("");
  };

  return (
    <section
      id="chat-panel"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-semibold tracking-tight">Chat</h2>
        <p className="text-sm text-neutral-400">
          Click a suggestion or ask your own question
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4 pr-2">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-neutral-500">
              No messages yet.
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl border px-4 py-3 shadow-sm ${
                      isUser
                        ? "border-blue-500/30 bg-blue-500/15"
                        : "border-white/10 bg-neutral-900/80"
                    }`}
                  >
                    <p className="mb-2 text-xs text-neutral-500">
                      {isUser ? "You" : "Assistant"} · {message.timestamp}
                    </p>

                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-6 text-white">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none leading-6 prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-strong:text-white prose-headings:text-white">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex shrink-0 gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question..."
          className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-blue-400/50"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}