-- Prüfe ob die Tabelle in Realtime Publications ist
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Falls die Tabelle NICHT in der Liste ist, führe aus:
ALTER PUBLICATION supabase_realtime ADD TABLE "trans-app_conversations";

-- Prüfe nochmal:
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
