# Migration: Speaker ID Fix

## Problem
Nach dem Neuladen der App waren alle Nachrichten linksbündig, weil keine persistente Speaker-ID gespeichert wurde.

## Lösung
Die `speaker_id` Spalte wurde zur Datenbank hinzugefügt, um Nachrichten des gleichen Sprechers auch nach einem Reload zu identifizieren.

## Migration Schritte

### 1. Datenbank aktualisieren
Führe das Migrations-Skript in deiner Supabase SQL-Editor aus:

```sql
-- Siehe migration-add-speaker-id.sql
```

Oder direkt in Supabase:
1. Öffne Supabase Dashboard
2. Gehe zu SQL Editor
3. Kopiere den Inhalt von `migration-add-speaker-id.sql`
4. Führe das Skript aus

### 2. Neue Tabelle erstellen (Alternative)
Falls du die Tabelle neu erstellen möchtest, verwende das aktualisierte Schema:

```sql
-- Siehe supabase-schema.sql für die vollständige neue Tabellen-Definition
```

### 3. App testen
1. Lösche `localStorage` im Browser (DevTools → Application → Local Storage → Clear All)
2. Lade die App neu
3. Starte einen neuen Chat
4. Lade die Seite neu
5. Überprüfe, dass deine Nachrichten weiterhin rechtsbündig angezeigt werden

## Was wurde geändert?

### Datenbank
- Neue Spalte `speaker_id TEXT NOT NULL` in `trans-app_conversations`
- Index auf `speaker_id` für effiziente Abfragen

### TypeScript Types
- `Database` Type erweitert um `speaker_id`
- Alle Insert/Update/Row Types aktualisiert

### Services
- `insertConversationEntry()` benötigt jetzt `speakerId` Parameter
- `fetchRoomHistory()` setzt `isMine` basierend auf `speaker_id`

### Hooks
- `useConversationController` speichert `speakerId` in localStorage
- `speakerId` wird bei jedem App-Start geladen oder neu erstellt
- Alle eigenen Nachrichten werden mit dieser ID markiert

## Wie es funktioniert

1. Beim ersten App-Start wird eine zufällige `speakerId` generiert und in localStorage gespeichert
2. Diese ID wird bei jeder neuen Nachricht in der Datenbank gespeichert
3. Beim Laden der History vergleicht die App die `speaker_id` jeder Nachricht mit der lokalen ID
4. Nachrichten mit übereinstimmender ID werden als `isMine: true` markiert
5. Die UI zeigt eigene Nachrichten rechtsbündig, fremde linksbündig

## Wichtig

Die `speakerId` wird im Browser-localStorage gespeichert. Das bedeutet:
- ✅ Funktioniert über mehrere Tabs im gleichen Browser
- ✅ Bleibt bestehen nach Reload
- ❌ Geht verloren beim Löschen des Browser-Cache
- ❌ Ist nicht zwischen verschiedenen Browsern/Geräten synchronisiert

Für eine vollständige Multi-Device-Lösung wäre eine Benutzer-Authentifizierung notwendig.
