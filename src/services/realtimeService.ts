import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ConversationEntry, SpeakerRole } from '@/types/conversation';
import type { Database } from '@/types/database';

type DbConversation = Database['public']['Tables']['trans-app_conversations']['Row'];
type DbConversationInsert =
  Database['public']['Tables']['trans-app_conversations']['Insert'];

const mapDbToEntry = (row: DbConversation): ConversationEntry => ({
  id: row.id,
  speaker: row.speaker_role,
  originalText: row.original_text,
  translatedText: row.translated_text,
  createdAt: new Date(row.created_at).getTime(),
  roomId: row.room_id,
  sourceLanguage: row.source_language,
  targetLanguage: row.target_language,
});

export const subscribeToRoom = (
  roomId: string,
  onInsert: (entry: ConversationEntry) => void,
  onPresenceChange?: (count: number) => void,
): RealtimeChannel => {
  console.log('[Realtime] Creating channel for room:', roomId);
  
  const channel = supabase
    .channel(`room:${roomId}`)
    .on<DbConversation>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trans-app_conversations',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        console.log('[Realtime] INSERT event received:', payload.new);
        onInsert(mapDbToEntry(payload.new));
      },
    );

  // Track presence if callback is provided
  if (onPresenceChange) {
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userCount = Object.keys(state).length;
        // Only log significant changes, not every sync
        onPresenceChange(userCount);
      })
      .subscribe(async (status) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Track this user as present
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });
  } else {
    channel.subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });
  }

  return channel;
};

export const insertConversationEntry = async (
  roomId: string,
  speaker: SpeakerRole,
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ConversationEntry | null> => {
  const payload: DbConversationInsert = {
    room_id: roomId,
    speaker_role: speaker,
    original_text: originalText,
    translated_text: translatedText,
    source_language: sourceLanguage,
    target_language: targetLanguage,
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  const result = await supabase
    .from('trans-app_conversations')
    .insert(payload)
    .select()
    .single();

  if (result.error || !result.data) {
    console.error('Insert conversation error:', result.error);
    return null;
  }

  return mapDbToEntry(result.data as DbConversation);
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
};

export const fetchRoomHistory = async (
  roomId: string,
): Promise<ConversationEntry[]> => {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  const result = await supabase
    .from('trans-app_conversations')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (result.error || !result.data) {
    console.error('Fetch room history error:', result.error);
    return [];
  }

  return (result.data as DbConversation[]).map(mapDbToEntry);
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
};
