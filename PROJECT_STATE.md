# PROJECT_STATE

## Frameworks & Libraries

- Next.js 15 (App Router) + React 18.3
- TypeScript strict mode
- ESLint (Next + `@typescript-eslint` + Prettier)
- Prettier 3
- Vitest + Testing Library
- Mocked speech/translation/TTS services (lokal)

## Ordnerüberblick

- `src/app`: Layout, Route-Einstieg, globale Styles
- `src/components`: Präsentations-Bausteine (Push-to-Talk Button, Log etc.)
- `src/features/conversation`: Feature-Shell inkl. Zustandsorchestrierung
- `src/hooks`: Business-Logik (`useConversationController`)
- `src/services`: Mock-Pipeline für Speech, Translation, Voice
- `src/lib`: Konstanten, Validierung, Audio Utilities
- `src/types`: Strikte Typdefinitionen

## Architekturentscheidungen

1. **Layered Feature Setup** - UI trennt strikt von Hook (State) und Services (Integration). Services liefern Promises und können durch echte APIs ersetzt werden.
2. **Mock Speech Pipeline** - MVP erfasst Texteingaben statt echter Audioeingabe, dennoch identische Workflow-Schritte (capture -> translate -> speak) für einfache Migration.
3. **In-Memory Transcript** - Kein Persistenzlayer, bewusst flüchtig. Erweiterbar über Repository-Interface, wenn Supabase benötigt wird.
4. **Accessibility & Audio** - Web Speech API wird nur clientseitig angesprochen (Guard gegen SSR), Status-Strings halten Screenreader up-to-date.

## Services / APIs / Datenbanken

- Aktuell keine externen Backends eingebunden.
- Platzhalter-ENV-Variablen (`SPEECH_API_KEY`, `TRANSLATION_API_KEY`, `VOICE_API_KEY`, `API_BASE_URL`) reserviert.

## ENV Variablen

| Variable              | Beschreibung                              |
| --------------------- | ----------------------------------------- |
| `SPEECH_API_KEY`      | Geplanter Key für Speech-to-Text Provider |
| `TRANSLATION_API_KEY` | Key für Übersetzungsdienst                |
| `VOICE_API_KEY`       | Key für Text-to-Speech                    |
| `API_BASE_URL`        | Proxy/Backend Base URL                    |

## Setup Hinweise

1. `npm install`
2. `.env` anhand `.env.example` anlegen (für MVP optional)
3. `npm run dev`
4. Tests via `npm run test`, Typen via `npm run typecheck`

## Bekannte Grenzen / TODOs

- Keine echte Audioaufnahme, nur Texte als Input (Mock STT).
- Übersetzungen nutzen Dictionary/Pass-Through, keine produktive Qualität.
- Kein Gerätesync oder Persistenz.
- Kein Auth oder Session-Recovery.
- Roadmap für echte Speech/Translation/TTS siehe `ROADMAP.md`.
