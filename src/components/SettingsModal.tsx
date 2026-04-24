"use client";

import { useEffect, useRef } from "react";

type Settings = {
  groqApiKey: string;
  suggestionPrompt: string;
  chatPrompt: string;
  suggestionContextWindow: number;
  answerContextWindow: number;
};

type Props = {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
};

export default function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      firstInputRef.current?.focus();
    }, 50);
  }, [open]);

  if (!open) return null;

  const updateField = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSave({
      ...settings,
      [key]: value,
    });
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-blue-400/60";

  const buttonClass =
    "inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-neutral-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h2 className="text-xl font-semibold">Settings</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Configure API key, prompts, and context windows.
            </p>
          </div>

          <button onClick={onClose} className={buttonClass}>
            Close
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Groq API Key
            </label>
            <input
              ref={firstInputRef}
              type="password"
              value={settings.groqApiKey}
              onChange={(e) => updateField("groqApiKey", e.target.value)}
              placeholder="gsk_..."
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Suggestion Context Window
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.suggestionContextWindow}
                onChange={(e) =>
                  updateField(
                    "suggestionContextWindow",
                    Number(e.target.value)
                  )
                }
                className={fieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Expanded Answer Context Window
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.answerContextWindow}
                onChange={(e) =>
                  updateField("answerContextWindow", Number(e.target.value))
                }
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Live Suggestion Prompt
            </label>
            <textarea
              rows={10}
              value={settings.suggestionPrompt}
              onChange={(e) =>
                updateField("suggestionPrompt", e.target.value)
              }
              className={`${fieldClass} resize-y leading-6`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Detailed Chat Prompt
            </label>
            <textarea
              rows={8}
              value={settings.chatPrompt}
              onChange={(e) => updateField("chatPrompt", e.target.value)}
              className={`${fieldClass} resize-y leading-6`}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 p-5">
          <button
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-medium text-white transition hover:bg-blue-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}