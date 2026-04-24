import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

type SuggestionItem = {
  type?: string;
  title: string;
  preview: string;
};

const DEFAULT_SUGGESTION_PROMPT = `
You are a real-time meeting copilot.

Your job is to surface the right thing at the right time during a live conversation.

Based on the transcript, generate exactly 3 helpful suggestions.

Choose the best mix from:
- answer: a useful answer to a question that was asked
- follow-up: a smart question the user can ask next
- clarification: something unclear that should be clarified
- fact-check: a claim or detail that should be verified
- talking-point: a useful point the user can bring up

Rules:
- Return exactly 3 items
- Each item must be specific to the transcript
- Each preview should already be useful without clicking
- Avoid generic advice like "ask for more details" unless the transcript truly needs it
- Do not invent facts
- Keep each preview to 1-2 sentences
- Return ONLY valid JSON
- Do not wrap the JSON in markdown

Expected format:
[
  {
    "type": "answer",
    "title": "Short title",
    "preview": "1-2 sentence useful preview"
  },
  {
    "type": "follow-up",
    "title": "Short title",
    "preview": "1-2 sentence useful preview"
  },
  {
    "type": "talking-point",
    "title": "Short title",
    "preview": "1-2 sentence useful preview"
  }
]
`.trim();

export async function POST(req: Request) {
  try {
    const apiKey =
      req.headers.get("x-groq-api-key") || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing Groq API key. Add it in Settings or set GROQ_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const transcript =
      typeof body?.transcript === "string" ? body.transcript.trim() : "";

    const customPrompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!transcript) {
      return NextResponse.json({ suggestions: [] });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = customPrompt || DEFAULT_SUGGESTION_PROMPT;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Transcript:\n${transcript}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    let suggestions: SuggestionItem[] = [];

    try {
      suggestions = JSON.parse(raw);
    } catch {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        suggestions = JSON.parse(cleaned);
      } catch {
        suggestions = [];
      }
    }

    if (!Array.isArray(suggestions)) {
      suggestions = [];
    }

    suggestions = suggestions
      .filter(
        (item) =>
          item &&
          typeof item.title === "string" &&
          typeof item.preview === "string"
      )
      .map((item) => ({
        type: typeof item.type === "string" ? item.type.trim() : "general",
        title: item.title.trim(),
        preview: item.preview.trim(),
      }))
      .filter((item) => item.title && item.preview)
      .slice(0, 3);

    while (suggestions.length < 3) {
      suggestions.push({
        type: "clarification",
        title: "Clarify the current point",
        preview:
          "Ask for the missing detail before moving forward so the conversation stays accurate.",
      });
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("Groq suggestions error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "Suggestion generation failed",
      },
      { status: 500 }
    );
  }
}