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

-- Create index on room_id for efficient querying
CREATE INDEX "trans-app_idx_conversations_room_id" ON "trans-app_conversations"(room_id);

-- Create index on created_at for ordering
CREATE INDEX "trans-app_idx_conversations_created_at" ON "trans-app_conversations"(created_at);

-- Enable Realtime for this table
ALTER TABLE "trans-app_conversations" REPLICA IDENTITY FULL;

-- Enable Row Level Security (RLS)
ALTER TABLE "trans-app_conversations" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all conversations (adjust based on your auth needs)
CREATE POLICY "trans-app_enable_read_access" ON "trans-app_conversations"
  FOR SELECT USING (true);

-- Allow anyone to insert conversations (adjust based on your auth needs)
CREATE POLICY "trans-app_enable_insert_access" ON "trans-app_conversations"
  FOR INSERT WITH CHECK (true);
