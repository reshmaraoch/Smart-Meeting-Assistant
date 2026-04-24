import { NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-groq-api-key") || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        { error: "No valid audio file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await uploaded.arrayBuffer();

    if (!bytes || bytes.byteLength === 0) {
      return NextResponse.json(
        { error: "Uploaded audio file is empty" },
        { status: 400 }
      );
    }

    console.log("Transcribe request received:", {
      name: uploaded.name,
      type: uploaded.type,
      size: uploaded.size,
    });

    const groq = new Groq({ apiKey });

    const groqFile = await toFile(
      Buffer.from(bytes),
      uploaded.name || "audio.webm",
      {
        type: uploaded.type || "audio/webm",
      }
    );

    const transcription = await groq.audio.transcriptions.create({
      file: groqFile,
      model: "whisper-large-v3",
      response_format: "verbose_json",
      language: "en",
      temperature: 0,
    });

    return NextResponse.json({
      text: transcription.text || "",
    });
  } catch (error: any) {
    console.error("Groq transcription route failure:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "Transcription failed inside /api/transcribe",
      },
      { status: 500 }
    );
  }
}