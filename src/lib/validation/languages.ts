import type { LanguageOption } from '@/types/conversation';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';

export const isLanguageOption = (
  option: LanguageOption | undefined,
): option is LanguageOption => {
  if (!option) return false;
  return Boolean(option.code && option.label && option.locale);
};

export const findLanguageOption = (code: string): LanguageOption => {
  const language = SUPPORTED_LANGUAGES.find((candidate) => candidate.code === code);
  if (!language) {
    throw new Error(`Unsupported language code: ${code}`);
  }
  return language;
};
