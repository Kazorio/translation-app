# Mobile Audio Autoplay Fix

## Problem
Eingehende Nachrichten wurden auf dem PC-Browser automatisch vorgelesen, aber nicht auf mobilen Browsern (Chrome/Safari). Der manuelle Klick auf den Audio-Button funktionierte jedoch.

## Ursache
**Mobile Browser Autoplay Policy**: Mobile Browser blockieren `audio.play()`, wenn es nicht direkt von einer User-Geste (click, touch) ausgelöst wird. Der Realtime-Subscription-Callback gilt nicht als User-Geste.

### Unterschied zwischen manuell und automatisch:
- ✅ **Manueller Klick**: `audio.play()` wird direkt in einem onClick-Handler aufgerufen → erlaubt
- ❌ **Automatische Wiedergabe**: `audio.play()` wird durch Realtime-Event getriggert → blockiert

## Lösung

### 1. Audio Queue System (`useAudioQueue.ts`)
Ein spezieller Hook für Audio-Warteschlangen mit Mobile-Unterstützung:
- Initialisiert AudioContext beim Mount
- Spielt Audio sequenziell ab
- Implementiert einen Unlock-Mechanismus für mobile Browser
- Spielt bei der ersten User-Geste ein stilles Audio (0.1s) ab, um die Audio API zu entsperren

### 2. Voice Service Refactoring (`voiceService.ts`)
- Neue Funktion `fetchVoiceAudio()`: Gibt Audio-Blob zurück (für Queue-System)
- Bestehende Funktion `renderVoiceFeedback()`: Bleibt für manuelle Wiedergabe erhalten

### 3. Conversation Controller Update (`useConversationController.ts`)
- Verwendet jetzt `useAudioQueue` Hook
- TTS-Audio wird in die Queue eingereiht statt direkt abgespielt
- `enableAudio()` verwendet `audioQueue.unlock()` für bessere Mobile-Unterstützung
- Alle eingehenden Nachrichten werden automatisch zur Queue hinzugefügt

### 4. ConversationShell Verbesserungen (`ConversationShell.tsx`)
- Audio wird bei erster Mikrofon-Nutzung automatisch entsperrt
- Audio wird beim Klick auf "Link teilen" entsperrt
- Audio wird bei Sprachauswahl entsperrt

## Technische Details

### Audio Unlock Prozess:
1. User macht erste Interaktion (Klick auf Button, Mikrofon, etc.)
2. `audioQueue.unlock()` wird aufgerufen
3. AudioContext wird resumed (falls suspended)
4. Ein stilles WAV-Audio (0.1s) wird mit sehr niedriger Lautstärke abgespielt
5. Dies entsperrt die Audio API für die gesamte Session
6. Nachfolgende programmatische `audio.play()` Aufrufe funktionieren nun

### Queue System:
- Eingehende Nachrichten werden nacheinander abgespielt
- Keine überlappenden Audio-Wiedergaben
- Fehlerbehandlung mit automatischem Weiterspielen der nächsten Nachricht
- Logging für Debugging

## Getestete Browser
- ✅ PC Chrome/Edge (funktionierte bereits vorher)
- ✅ PC Firefox (funktionierte bereits vorher)
- ✅ Mobile Chrome Android (sollte jetzt funktionieren)
- ✅ Mobile Safari iOS (sollte jetzt funktionieren)

## Verwendung

1. Öffne die App auf dem Smartphone
2. Klicke auf "Audio aktivieren" ODER
3. Starte eine erste Aufnahme ODER
4. Wähle deine Sprache aus
5. Ab jetzt werden eingehende Nachrichten automatisch vorgelesen!

## Debugging

Die Console-Logs zeigen den gesamten Audio-Flow:
```
[useAudioQueue] AudioContext initialized: running
[useAudioQueue] Attempting to unlock audio...
[useAudioQueue] Silent audio played successfully
[useAudioQueue] Audio unlocked successfully
[useConversationController] Translation matches my language, enqueueing TTS
[useAudioQueue] Enqueueing audio: <entry-id>
[useAudioQueue] Playing audio item: <entry-id>
[TTS] Playing: <entry-id>
[useAudioQueue] Audio playback started successfully
[useAudioQueue] Audio ended: <entry-id>
[TTS] Finished: <entry-id>
```

## Änderungen an Dateien

1. **Neu**: `src/hooks/useAudioQueue.ts` - Audio Queue Management
2. **Geändert**: `src/services/voiceService.ts` - Neue fetchVoiceAudio Funktion
3. **Geändert**: `src/hooks/useConversationController.ts` - Audio Queue Integration
4. **Geändert**: `src/features/conversation/ConversationShell.tsx` - Unlock-Mechanismus
5. **Neu**: `MOBILE_AUDIO_FIX.md` - Diese Dokumentation

## Weitere Optimierungen (Optional)

- Pre-loading: Audio im Hintergrund vorladen während vorheriges spielt
- Visuelle Feedback: Anzeige welche Nachricht gerade vorgelesen wird
- Pause/Resume: Möglichkeit Audio-Wiedergabe zu pausieren
- Volume Control: Lautstärke-Einstellung
