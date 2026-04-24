# Smart Meeting Assistant

A real-time AI meeting copilot that listens to live microphone audio, transcribes conversations, generates useful context-aware suggestions, and expands those suggestions into detailed chat responses.

Built for meetings, interviews, brainstorming sessions, standups, lectures, and collaborative discussions.


## Features

### Live Audio & Transcript
- Live microphone recording
- Real-time speech preview while speaking
- Groq Whisper Large V3 transcription
- Transcript updates in chunks while recording
- Auto-scrolls to the latest transcript

### AI Suggestions
- First suggestion batch appears after the first transcript chunk
- Automatically refreshes every ~30 seconds
- Manual refresh for transcript + suggestions
- Exactly 3 suggestions per refresh
- Context-aware suggestions: answers, follow-up questions, clarifications, talking points, fact-check prompts
- New batches appear at the top
- Older batches remain visible
- Clickable suggestion cards

### AI Chat
- Detailed chat response for clicked suggestions
- Manual chat questions with transcript context
- Continuous chat session

### Settings
- Groq API key
- Live suggestion prompt
- Chat prompt
- Suggestion context window
- Detailed answer context window

### Export
Exports full session as JSON:
- transcript
- live speech preview
- suggestion batches
- chat history
- timestamps


## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend / AI
- Groq API

### Models Used
- `whisper-large-v3` → transcription
- `openai/gpt-oss-120b` → suggestions
- `openai/gpt-oss-120b` → chat responses

### Browser APIs
- MediaRecorder API
- SpeechRecognition API


## Project Structure

```txt
src/
  app/
    api/
      transcribe/
      suggestions/
      chat/
    globals.css
    layout.tsx
    page.tsx

  components/
    TranscriptPanel.tsx
    SuggestionsPanel.tsx
    ChatPanel.tsx
    SettingsModal.tsx
```


## Setup

### 1. Clone Repository

```bash
git clone https://github.com/reshmaraoch/Smart-Meeting-Assistant.git
cd smart-meeting-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create `.env.local`

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open in browser:

```txt
http://localhost:3000
```


## Deployment

### Deploy to Vercel

```bash
npm run build
vercel
```

Add environment variable:

```txt
GROQ_API_KEY
```


## Author

Built by **Reshma Rao Chandukudlu Hosamane**
