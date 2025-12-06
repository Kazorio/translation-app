export type SpeakerRole = 'self' | 'partner';

export interface LanguageOption {
  code: string;
  label: string;
  locale: string;
}

// Deprecated: Use single LanguageOption per user instead
export interface LanguagePair {
  self: LanguageOption;
  partner: LanguageOption;
}

export interface ConversationEntry {
  id: string;
  speaker: SpeakerRole;
  originalText: string;
  translatedText: string;
  createdAt: number;
  roomId?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  isMine?: boolean; // Client-side only: true if this entry was created by current user
}

export type ConversationStatus = 'idle' | 'recording' | 'processing' | 'error';

export interface TranslationPayload {
  text: string;
  sourceLanguage: LanguageOption;
  targetLanguage: LanguageOption;
}
