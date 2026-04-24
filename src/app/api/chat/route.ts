import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const DEFAULT_CHAT_PROMPT = `
You are a real-time meeting copilot.

Your job is to help the user during a live conversation.

Use the transcript as context. Give a practical, clear, and useful answer.

Rules:
- Be specific to the transcript.
- Do not hallucinate facts.
- If information is unclear, say what is unclear and suggest what to ask next.
- Keep the answer useful during a live meeting.
- Use short paragraphs and bullets when helpful.
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
      typeof body?.transcript === "string" ? body.transcript : "";

    const userMessage =
      typeof body?.message === "string" ? body.message : "";

    const suggestion = body?.suggestion ?? null;

    const customPrompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!userMessage.trim() && !suggestion) {
      return NextResponse.json(
        { error: "No message or suggestion provided" },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    const userPrompt = suggestion
      ? `
Transcript:
${transcript}

The user clicked this live suggestion:
Title: ${suggestion.title}
Preview: ${suggestion.preview}
Type: ${suggestion.type || "general"}

Give a detailed answer that expands this suggestion.
`.trim()
      : `
Transcript:
${transcript}

User question:
${userMessage}

Answer the user's question using the transcript context.
`.trim();

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0.4,
      messages: [
        { role: "system", content: customPrompt || DEFAULT_CHAT_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    return NextResponse.json({
      answer: completion.choices[0]?.message?.content || "",
    });
  } catch (error: any) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "Chat response failed",
      },
      { status: 500 }
    );
  }
}