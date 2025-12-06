import type { TranslationPayload } from '@/types/conversation';

/**
 * Translates text using OpenAI ChatGPT API via Next.js API route.
 * Optimized for German-Farsi bidirectional translation.
 */
export const translateText = async (
  payload: TranslationPayload,
): Promise<{ translatedText: string }> => {
  const sourceLang = payload.sourceLanguage.label;
  const targetLang = payload.targetLanguage.label;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: payload.text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation request failed');
    }

    const data = (await response.json()) as { translatedText: string };
    return { translatedText: data.translatedText };
  } catch (error) {
    console.error('ChatGPT translation error:', error);
    throw new Error('Übersetzung fehlgeschlagen. Bitte versuche es erneut.');
  }
};

