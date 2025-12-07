export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      'trans-app_conversations': {
        Row: {
          id: string;
          room_id: string;
          speaker_role: 'self' | 'partner';
          speaker_id: string;
          original_text: string;
          translated_text: string;
          source_language: string;
          target_language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          speaker_role: 'self' | 'partner';
          speaker_id: string;
          original_text: string;
          translated_text: string;
          source_language: string;
          target_language: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          speaker_role?: 'self' | 'partner';
          speaker_id?: string;
          original_text?: string;
          translated_text?: string;
          source_language?: string;
          target_language?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
