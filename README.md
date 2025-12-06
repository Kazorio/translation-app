# Translation App

Real-time bidirectional speech translation app with single language selection per user. Built with Next.js 15, OpenAI APIs (Whisper, GPT-4o-mini, TTS-1), and Supabase Realtime.

## Features

- 🎤 **Push-to-talk recording** with custom WAV encoding
- 🗣️ **Speech-to-text** using OpenAI Whisper-1
- 🌍 **Real-time translation** via GPT-4o-mini
- 🔊 **Text-to-speech** with OpenAI TTS-1
- 👥 **Multi-device sync** via Supabase Realtime
- 🎨 **Color-coded messages** (Blue for you, Pink for partner)
- 🌐 **Single language per user** - automatic translation detection
- 📱 **Mobile-first design** with app-like layout

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript 5.4.5** (strict mode)
- **OpenAI APIs**: Whisper-1, GPT-4o-mini, TTS-1
- **Supabase**: PostgreSQL + Realtime subscriptions
- **Web Audio API**: Custom WAV recording

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/Kazorio/translation-app.git
cd translation-app
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI
OPENAI_API_KEY=sk-...
```

### 3. Database Setup

In Supabase SQL Editor, run `supabase-schema.sql`:

```sql
CREATE TABLE "trans-app_conversations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  speaker_role TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
ALTER TABLE "trans-app_conversations" REPLICA IDENTITY FULL;
```

Enable Realtime in **Database → Replication** for `trans-app_conversations` table.

### 4. Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Docker Deployment (Dokploy)

### Build & Run with Docker

```bash
# Build image
docker build -t translation-app .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  translation-app
```

### Deploy to Dokploy

1. **Create new service** in Dokploy
2. **Connect GitHub repository**: `Kazorio/translation-app`
3. **Set environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. **Deploy** - Dokploy will automatically:
   - Pull from GitHub
   - Build using Dockerfile
   - Deploy to your domain

### Docker Compose

```bash
docker-compose up -d
```

Make sure to set environment variables in `.env` file or Dokploy settings.

## How It Works

### Single Language Flow

1. **User A** selects German, **User B** selects Farsi
2. **User A** speaks in German → Whisper transcribes → translates to Farsi → saves to DB
3. **User B** receives message:
   - TTS plays in Farsi (their language)
   - Display shows Farsi text
4. **User B** speaks in Farsi → same process in reverse

### On-the-fly Re-translation

If a message arrives in the wrong language, the app automatically:
- Re-translates to the user's selected language
- Updates the entry in state
- Plays correct TTS
- Shows "Übersetze..." while processing

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts    # Whisper STT
│   │   ├── translate/route.ts     # GPT-4o-mini translation
│   │   └── tts/route.ts          # OpenAI TTS
│   ├── room/[id]/page.tsx        # Room session
│   └── page.tsx                   # Landing page
├── components/
│   ├── conversation/
│   │   ├── ConversationLog.tsx    # Chat display
│   │   ├── LanguageSelector.tsx   # Single language picker
│   │   └── SpeakerConsole.tsx     # Recording UI
│   └── ui/
│       └── PushToTalkButton.tsx   # Toggle recording
├── hooks/
│   └── useConversationController.ts  # Main logic
├── services/
│   ├── realtimeService.ts         # Supabase Realtime
│   ├── speechCaptureService.ts    # WAV recording + Whisper
│   ├── translationService.ts      # GPT-4o-mini
│   └── voiceService.ts            # TTS playback
└── types/
    └── conversation.ts            # TypeScript types
```

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Run production
npm run lint      # ESLint check
npm run test      # Vitest tests
npm run format    # Prettier format
```

## Debugging

### Realtime not syncing?
1. Check Supabase **Database → Replication**
2. Verify RLS policies allow SELECT + INSERT
3. Check browser console for WebSocket errors

### Translation mismatch?
- Check console logs for re-translation messages
- Verify `myLanguage` is set correctly
- Look for "Translation mismatch, re-translating" logs

### TTS not playing?
- Click anywhere on page to initialize AudioContext
- Check "Audio aktivieren" banner appears
- Verify TTS-1 API key is valid

## License

MIT

