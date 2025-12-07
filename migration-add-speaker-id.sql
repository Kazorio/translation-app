-- Migration: Add speaker_id column to trans-app_conversations table
-- This allows identifying messages from the same speaker across page reloads

-- Add speaker_id column (nullable first for existing data)
ALTER TABLE "trans-app_conversations" 
ADD COLUMN speaker_id TEXT;

-- Update existing rows with generated speaker IDs based on speaker_role and order
-- This gives each speaker a consistent ID based on when they first spoke
WITH speaker_assignments AS (
  SELECT 
    room_id,
    speaker_role,
    'speaker-' || speaker_role || '-' || room_id AS speaker_id
  FROM "trans-app_conversations"
  GROUP BY room_id, speaker_role
)
UPDATE "trans-app_conversations" c
SET speaker_id = sa.speaker_id
FROM speaker_assignments sa
WHERE c.room_id = sa.room_id 
  AND c.speaker_role = sa.speaker_role
  AND c.speaker_id IS NULL;

-- Make speaker_id NOT NULL now that all rows have values
ALTER TABLE "trans-app_conversations" 
ALTER COLUMN speaker_id SET NOT NULL;

-- Create index on speaker_id for efficient queries
CREATE INDEX "trans-app_idx_conversations_speaker_id" ON "trans-app_conversations"(speaker_id);
