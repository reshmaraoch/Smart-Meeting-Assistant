"use client";

import { useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";

type TranscriptItem = {
  id: string;
  text: string;
  timestamp: string;
};

type Props = {
  transcript: TranscriptItem[];
  liveText: string;
  isRecording: boolean;
  audioChunkCount: number;
  onMicClick: () => void;
};

export default function TranscriptPanel({
  transcript,
  liveText,
  isRecording,
  audioChunkCount,
  onMicClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveText]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex shrink-0 items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transcript</h2>
          <p className="text-sm text-neutral-400">
            {isRecording ? "Listening..." : "Mic is off"}
          </p>
        </div>

        <button
          onClick={onMicClick}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
            isRecording
              ? "border-red-400 bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "border-emerald-400 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
          }`}
          aria-label={isRecording ? "Stop microphone" : "Start microphone"}
        >
          {isRecording ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Mic size={22} />
          )}
        </button>
      </div>

      <div className="mb-4 shrink-0 text-right text-xs text-neutral-400">
        <p>Audio chunks: {audioChunkCount}</p>
        <p>{isRecording ? "Recording active" : "Idle"}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
        {transcript.length === 0 && !liveText && (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-neutral-400">
            Start the mic and your speech will appear here.
          </div>
        )}

        {transcript.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <p className="text-sm leading-6 text-neutral-100">{item.text}</p>
            <p className="mt-2 text-xs text-neutral-500">{item.timestamp}</p>
          </div>
        ))}

        {liveText && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
            <p className="text-sm italic text-blue-100">{liveText}</p>
            <p className="mt-2 text-xs text-blue-300">Live status</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}