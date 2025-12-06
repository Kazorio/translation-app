# Supabase Realtime Aktivierung

## Problem
Realtime Synchronisierung funktioniert nicht - Person B sieht nicht, wenn Person A eine Nachricht schickt.

## Lösung
Realtime Publications müssen in Supabase aktiviert werden.

### Schritt 1: Supabase Dashboard öffnen
1. Gehe zu: https://db.christian-kazor.com (oder dein Supabase Dashboard)
2. Logge dich ein

### Schritt 2: Realtime aktivieren
1. In der linken Sidebar: **Database** → **Replication**
2. Suche nach der Tabelle: `trans-app_conversations`
3. Aktiviere den Toggle für **"Enable Realtime"** oder **"Realtime Publication"**
4. Speichern/Apply

### Schritt 3: Prüfen
Nach der Aktivierung sollte die Tabelle in der Liste der "Realtime Publications" erscheinen.

## Alternative: SQL Command
Falls die UI-Option nicht verfügbar ist, kannst du auch direkt SQL ausführen:

```sql
-- Realtime Publication für die Tabelle erstellen
ALTER PUBLICATION supabase_realtime ADD TABLE "trans-app_conversations";
```

## Testen
1. Öffne zwei Browser-Tabs mit dem gleichen Room (`demo-room-2024`)
2. Schicke eine Nachricht in Tab 1
3. Tab 2 sollte die Nachricht sofort sehen

## Debugging
Öffne die Browser Console (F12) und schaue nach:
- Supabase Channel subscription status
- "SUBSCRIBED" status message
- Realtime events bei neuen Nachrichten

Im Server Log (Terminal) solltest du sehen:
```
Realtime: INSERT event received
```
