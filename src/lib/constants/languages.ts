import type { LanguageOption } from '@/types/conversation';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'fa', label: 'Farsi (Persisch)', locale: 'fa-IR' },
  { code: 'en', label: 'Englisch', locale: 'en-US' },
  { code: 'fr', label: 'Französisch', locale: 'fr-FR' },
];

export const DEFAULT_LANGUAGE_PAIR = {
  self: SUPPORTED_LANGUAGES[0],
  partner: SUPPORTED_LANGUAGES[1],
};
