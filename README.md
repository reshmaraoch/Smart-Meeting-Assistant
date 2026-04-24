# Live Suggestions

A real-time AI meeting copilot that listens to live microphone audio, transcribes the conversation, generates useful suggestions, and expands those suggestions into detailed chat responses.

## Features

- Live microphone recording
- Real-time speech preview while speaking
- Groq Whisper Large V3 transcription
- Transcript updates in chunks while recording
- AI-generated suggestion batches every ~30 seconds
- Manual refresh for transcript + suggestions
- Exactly 3 suggestions per refresh
- Clickable suggestion cards
- Detailed chat response for clicked suggestions
- Manual chat questions with transcript context
- Settings screen for:
  - Groq API key
  - Live suggestion prompt
  - Chat prompt
  - Context window sizes
- Export full session as JSON:
  - transcript
  - suggestion batches
  - chat history

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Groq API
- Whisper Large V3 for transcription
- GPT-OSS 120B for suggestions and chat
- Browser MediaRecorder API
- Browser SpeechRecognition API for live preview

## Project Structure

```txt
src/
  app/
    api/
      transcribe/
        route.ts
      suggestions/
        route.ts
      chat/
        route.ts
    globals.css
    layout.tsx
    page.tsx

  components/
    TranscriptPanel.tsx
    SuggestionsPanel.tsx
    ChatPanel.tsx
    SettingsModal.tsx
