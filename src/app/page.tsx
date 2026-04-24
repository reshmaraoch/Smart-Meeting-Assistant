"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Settings as SettingsIcon } from "lucide-react";

import TranscriptPanel from "@/components/TranscriptPanel";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import ChatPanel from "@/components/ChatPanel";
import SettingsModal from "@/components/SettingsModal";

type TranscriptItem = {
  id: string;
  text: string;
  timestamp: string;
};

type SuggestionItem = {
  type?: string;
  title: string;
  preview: string;
};

type SuggestionBatch = {
  id: string;
  timestamp: string;
  suggestions: SuggestionItem[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type AppSettings = {
  groqApiKey: string;
  suggestionPrompt: string;
  chatPrompt: string;
  suggestionContextWindow: number;
  answerContextWindow: number;
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const TRANSCRIPT_INTERVAL_MS = 30_000;
const SUGGESTION_INTERVAL_MS = 30_000;

const DEFAULT_SUGGESTION_PROMPT = `
You are a real-time meeting copilot.

Based on the recent transcript context, generate exactly 3 fresh and useful live suggestions.

Choose a smart mix based on the conversation:
- answer: a useful answer to a question that was just asked
- follow-up: a strong question the user can ask next
- clarification: something unclear that should be clarified
- fact-check: a claim or detail that should be verified
- talking-point: a useful point the user can bring up

Rules:
- Return exactly 3 items.
- Each suggestion must be specific to the transcript.
- Each preview must already be useful even if not clicked.
- Avoid generic filler.
- Do not invent facts.
- Return ONLY valid JSON.

Expected format:
[
  {
    "type": "answer",
    "title": "Short title",
    "preview": "Useful 1-2 sentence preview"
  }
]
`.trim();

const DEFAULT_CHAT_PROMPT = `
You are a real-time meeting copilot.

Use the transcript as context and give a practical, specific answer.
If the user clicked a suggestion, expand it into a useful detailed answer.
Do not hallucinate. If something is unclear, say what is unclear and suggest what to ask next.
Use short paragraphs and bullets when helpful.
`.trim();

export default function HomePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [audioChunksCount, setAudioChunksCount] = useState(0);

  const [liveText, setLiveText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    groqApiKey: "",
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    suggestionContextWindow: 10,
    answerContextWindow: 30,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkBufferRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<TranscriptItem[]>([]);
  const liveTextRef = useRef("");
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const hasGeneratedFirstSuggestionsRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("live-suggestions-settings");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<AppSettings>;

      setAppSettings({
        groqApiKey: parsed.groqApiKey || "",
        suggestionPrompt: parsed.suggestionPrompt || DEFAULT_SUGGESTION_PROMPT,
        chatPrompt: parsed.chatPrompt || DEFAULT_CHAT_PROMPT,
        suggestionContextWindow: parsed.suggestionContextWindow || 10,
        answerContextWindow: parsed.answerContextWindow || 30,
      });
    } catch {
      console.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    liveTextRef.current = liveText;
  }, [liveText]);

  const getTranscriptText = useCallback(
    (items: TranscriptItem[], limit?: number) => {
      const scoped = limit ? items.slice(-limit) : items;
      return scoped.map((item) => `[${item.timestamp}] ${item.text}`).join("\n");
    },
    []
  );

  const getLiveSuggestionContext = useCallback(() => {
    const transcriptText = getTranscriptText(
      transcriptRef.current,
      appSettings.suggestionContextWindow
    );

    const livePreview = liveTextRef.current.trim();

    if (transcriptText && livePreview) {
      return `${transcriptText}\n\nCurrent live speech:\n${livePreview}`;
    }

    if (livePreview) {
      return `Current live speech:\n${livePreview}`;
    }

    return transcriptText;
  }, [appSettings.suggestionContextWindow, getTranscriptText]);

  const getGroqHeaders = useCallback((): Record<string, string> => {
    return appSettings.groqApiKey.trim()
      ? { "x-groq-api-key": appSettings.groqApiKey.trim() }
      : {};
  }, [appSettings.groqApiKey]);

  const handleSaveSettings = (nextSettings: AppSettings) => {
    setAppSettings(nextSettings);
    localStorage.setItem("live-suggestions-settings", JSON.stringify(nextSettings));
  };

  const stopLiveSpeechPreview = useCallback(() => {
    setLiveText("");

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // no-op
      }

      speechRecognitionRef.current = null;
    }
  }, []);

  const startLiveSpeechPreview = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    stopLiveSpeechPreview();

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalPreviewText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          finalPreviewText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }

      setLiveText((interimText || finalPreviewText).trim());
    };

    recognition.onerror = (event: any) => {
      console.warn("Live speech preview error:", event.error);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          // no-op
        }
      }
    };

    try {
      recognition.start();
    } catch {
      // no-op
    }
  }, [stopLiveSpeechPreview]);

  const generateSuggestions = useCallback(async () => {
    const recentTranscript = getLiveSuggestionContext();

    if (!recentTranscript.trim()) return;

    try {
      setIsGeneratingSuggestions(true);
      setError(null);

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGroqHeaders(),
        },
        body: JSON.stringify({
          transcript: recentTranscript,
          prompt: appSettings.suggestionPrompt,
        }),
      });

      const rawText = await response.text();
      const data = rawText ? JSON.parse(rawText) : null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate suggestions.");
      }

      const suggestions = Array.isArray(data?.suggestions)
        ? data.suggestions.slice(0, 3)
        : [];

      if (suggestions.length === 3) {
        setSuggestionBatches((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            suggestions,
          },
          ...prev,
        ]);
      }
    } catch (err: unknown) {
      console.error("Suggestions error:", err);
      setError(
        err instanceof Error ? err.message : "Could not generate suggestions."
      );
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [
    appSettings.suggestionPrompt,
    getGroqHeaders,
    getLiveSuggestionContext,
  ]);

  const askChat = useCallback(
    async (message: string, suggestion?: SuggestionItem) => {
      try {
        setIsChatLoading(true);
        setError(null);

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: suggestion ? `Clicked suggestion: ${suggestion.title}` : message,
          timestamp: new Date().toLocaleTimeString(),
        };

        setChatMessages((prev) => [...prev, userMessage]);

        const transcriptText = getTranscriptText(
          transcriptRef.current,
          appSettings.answerContextWindow
        );

        const livePreview = liveTextRef.current.trim();
        const chatContext = livePreview
          ? `${transcriptText}\n\nCurrent live speech:\n${livePreview}`
          : transcriptText;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGroqHeaders(),
          },
          body: JSON.stringify({
            transcript: chatContext,
            message,
            suggestion: suggestion || null,
            prompt: appSettings.chatPrompt,
          }),
        });

        const rawText = await response.text();
        const data = rawText ? JSON.parse(rawText) : null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to get chat answer.");
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data?.answer || "No answer returned.",
          timestamp: new Date().toLocaleTimeString(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);

        setTimeout(() => {
          document
            .getElementById("chat-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (err: unknown) {
        console.error("Chat error:", err);
        setError(err instanceof Error ? err.message : "Could not get chat response.");
      } finally {
        setIsChatLoading(false);
      }
    },
    [
      appSettings.answerContextWindow,
      appSettings.chatPrompt,
      getGroqHeaders,
      getTranscriptText,
    ]
  );

  const transcribeChunk = useCallback(
    async (audioBlob: Blob) => {
      try {
        setIsTranscribing(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: getGroqHeaders(),
          body: formData,
        });

        const rawText = await response.text();
        const data = rawText ? JSON.parse(rawText) : null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to transcribe audio.");
        }

        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (!text) return;

        const newItem: TranscriptItem = {
          id: crypto.randomUUID(),
          text,
          timestamp: new Date().toLocaleTimeString(),
        };

        setTranscript((prev) => {
          const updated = [...prev, newItem];
          transcriptRef.current = updated;

          if (!hasGeneratedFirstSuggestionsRef.current) {
            hasGeneratedFirstSuggestionsRef.current = true;

            setTimeout(() => {
              void generateSuggestions();
            }, 300);
          }

          return updated;
        });

        setLiveText("");
        setAudioChunksCount((prev) => prev + 1);
      } catch (err: unknown) {
        console.error("Transcription error:", err);
        setError(err instanceof Error ? err.message : "Could not transcribe audio.");
      } finally {
        setIsTranscribing(false);
      }
    },
    [generateSuggestions, getGroqHeaders]
  );

  const startRecorderSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    chunkBufferRef.current = [];

    const preferredTypes = ["audio/webm;codecs=opus", "audio/webm"];
    const supportedMimeType =
      preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

    const recorder = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunkBufferRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const completeBlob = new Blob(chunkBufferRef.current, { type: mimeType });
      chunkBufferRef.current = [];

      if (completeBlob.size > 0) {
        await transcribeChunk(completeBlob);
      }

      if (isRecordingRef.current && streamRef.current) {
        startRecorderSegment();
      } else {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      }
    };

    recorder.onerror = () => {
      setError("Recording failed.");
    };

    recorder.start();
  }, [transcribeChunk]);

  const forceCurrentTranscriptChunk = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }, []);

  const cleanupTimers = useCallback(() => {
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    if (suggestionTimerRef.current) clearInterval(suggestionTimerRef.current);

    segmentTimerRef.current = null;
    suggestionTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupTimers();
      stopLiveSpeechPreview();
      forceCurrentTranscriptChunk();
    };
  }, [cleanupTimers, forceCurrentTranscriptChunk, stopLiveSpeechPreview]);

  const startRecording = async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setIsRecording(true);
      isRecordingRef.current = true;
      hasGeneratedFirstSuggestionsRef.current = false;

      startRecorderSegment();
      startLiveSpeechPreview();

      segmentTimerRef.current = setInterval(() => {
        forceCurrentTranscriptChunk();
      }, TRANSCRIPT_INTERVAL_MS);

      suggestionTimerRef.current = setInterval(() => {
        forceCurrentTranscriptChunk();
        setTimeout(() => void generateSuggestions(), 1500);
      }, SUGGESTION_INTERVAL_MS);
    } catch {
      setError("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;

    cleanupTimers();
    stopLiveSpeechPreview();
    forceCurrentTranscriptChunk();
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else void startRecording();
  };

  const handleRefreshSuggestions = async () => {
    forceCurrentTranscriptChunk();
    setTimeout(() => void generateSuggestions(), 1500);
  };

  const handleSuggestionClick = async (suggestion: SuggestionItem) => {
    setTimeout(() => {
      document
        .getElementById("chat-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    await askChat(suggestion.preview, suggestion);
  };

  const handleExportSession = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      transcript,
      liveText,
      suggestionBatches,
      chatHistory: chatMessages,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `live-suggestions-session-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const buttonClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="flex h-screen overflow-hidden bg-neutral-950 text-white">
      <div className="flex min-h-0 w-full flex-col">
        <div className="shrink-0 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <h1 className="text-xl font-semibold tracking-tight">
              Live Suggestions
            </h1>

            <div className="flex shrink-0 items-center gap-3">
              <button onClick={handleExportSession} className={buttonClass}>
                <Download size={16} />
                Export
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className={buttonClass}
              >
                <SettingsIcon size={16} />
                Settings
              </button>

              <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 text-sm font-medium text-neutral-300">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isRecording ? "bg-red-400" : "bg-neutral-500"
                  }`}
                />
                <span>{isRecording ? "Recording" : "Ready"}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-3">
          <TranscriptPanel
            transcript={transcript}
            liveText={
              liveText || (isTranscribing ? "Processing latest audio segment..." : "")
            }
            isRecording={isRecording}
            audioChunkCount={audioChunksCount}
            onMicClick={handleMicClick}
          />

          <SuggestionsPanel
            batches={suggestionBatches}
            onRefresh={handleRefreshSuggestions}
            onSuggestionClick={handleSuggestionClick}
            isLoading={isGeneratingSuggestions}
          />

          <ChatPanel
            messages={chatMessages}
            onSendMessage={(message) => void askChat(message)}
            isLoading={isChatLoading}
          />
        </div>

        <SettingsModal
          open={settingsOpen}
          settings={appSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      </div>
    </main>
  );
}