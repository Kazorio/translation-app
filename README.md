# biTranslationApp

Live bidirectional translation app for German-Farsi conversations with push-to-talk functionality. Each participant uses the app on their own device, and messages are synchronized in real-time via Supabase.

## Architecture

- **Next.js 15** (App Router, React Server Components)
- **TypeScript 5.4.5** (strict mode, no `any`)
- **Supabase** (PostgreSQL + Realtime subscriptions)
- **Mock Services** (STT, translation, TTS - production APIs in future phase)

### Multi-Device Sync Flow

1. Person A opens app → creates new session → gets unique `roomId`
2. Person A shares `roomId` URL with Person B
3. Both join same room via `/room/[id]` route
4. Each person sees:
   - Their own microphone button (push-to-talk)
   - Shared conversation log (both original + translated messages)
5. Real-time sync via Supabase Realtime:
   - Person A speaks → inserts to `conversations` table → Person B receives via subscription
   - Person B speaks → inserts to `conversations` table → Person A receives via subscription

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create new project
2. Copy your project URL and anon key from Settings → API

### 3. Configure Environment Variables

Create `.env.local` in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Database Schema

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Run the SQL from `supabase-schema.sql`:

```sql
-- Create conversations table for bilingual chat room
CREATE TABLE "trans-app_conversations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('self', 'partner')),
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX "trans-app_idx_conversations_room_id" ON "trans-app_conversations"(room_id);
CREATE INDEX "trans-app_idx_conversations_created_at" ON "trans-app_conversations"(created_at);

-- Enable Realtime
ALTER TABLE "trans-app_conversations" REPLICA IDENTITY FULL;

-- Enable Row Level Security
ALTER TABLE "trans-app_conversations" ENABLE ROW LEVEL SECURITY;

-- Policies (adjust for production auth)
CREATE POLICY "trans-app_enable_read_access" ON "trans-app_conversations"
  FOR SELECT USING (true);

CREATE POLICY "trans-app_enable_insert_access" ON "trans-app_conversations"
  FOR INSERT WITH CHECK (true);
```

3. Go to **Database → Replication** and enable Realtime for `trans-app_conversations` table

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint + TypeScript checks
npm run test      # Vitest unit tests
npm run format    # Prettier formatting
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page (session creation)
│   ├── room/[id]/         # Dynamic room route
│   │   └── page.tsx       # Room session UI
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── conversation/      # Conversation UI
│   │   ├── ConversationLog.tsx
│   │   ├── LanguagePairSelector.tsx
│   │   ├── SpeakerConsole.tsx
│   │   └── StatusIndicator.tsx
│   └── ui/                # Generic UI components
│       └── PushToTalkButton.tsx
├── features/              # Feature modules
│   └── conversation/      # Conversation feature
│       ├── ConversationShell.tsx
│       └── __tests__/
├── hooks/                 # React hooks
│   ├── useConversationController.ts
│   └── __tests__/
├── lib/                   # Library code
│   ├── supabase.ts       # Supabase client singleton
│   ├── audio/voice.ts    # Voice synthesis
│   ├── constants/        # App constants
│   └── utils/            # Utilities
├── services/             # Business logic
│   ├── realtimeService.ts      # Supabase Realtime API
│   ├── speechCaptureService.ts # STT (mock)
│   ├── translationService.ts   # Translation (mock)
│   └── voiceService.ts         # TTS (mock)
└── types/                # TypeScript types
    ├── conversation.ts   # Domain types
    └── database.ts       # Supabase schema types
```

## Type Safety

- **Strict TypeScript**: `noImplicitAny`, `noUnusedLocals`, `strict: true`
- **ESLint**: Type-checked rules with `@typescript-eslint`
- **Supabase Types**: Generated from schema, synced with `Database` type

## Testing

```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
```

Tests use Vitest + React Testing Library:

- `src/hooks/__tests__/useConversationController.test.tsx`
- `src/features/conversation/__tests__/`

## Current State (MVP)

✅ **Completed**:
- Multi-device architecture with room-based routing
- Supabase Realtime integration
- Mock STT/translation/TTS services
- Full TypeScript strict mode + linting
- Unit tests for core logic

⏳ **Next Phase** (Production):
- Replace mock services with real APIs:
  - **STT**: Azure Speech Services / Google Speech-to-Text
  - **Translation**: Azure Translator / Google Translate
  - **TTS**: Azure Speech Services / Google Text-to-Speech
- Add authentication (Supabase Auth)
- Update RLS policies for authenticated users
- Add room expiration/cleanup
- Mobile-first responsive design
- PWA configuration for offline support

## Debugging

If app throws "Missing Supabase environment variables" error:

1. Verify `.env.local` exists in project root
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Restart dev server (`npm run dev`)

If Realtime sync doesn't work:

1. Check Supabase dashboard → **Database → Replication**
2. Verify `conversations` table has Realtime enabled
3. Verify RLS policies allow INSERT + SELECT
4. Check browser console for WebSocket errors

## License

MIT

