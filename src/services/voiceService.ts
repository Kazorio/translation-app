import type { LanguageOption } from '@/types/conversation';
import { speak } from '@/lib/audio/voice';

export const renderVoiceFeedback = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  console.log('[voiceService] Starting TTS playback:', {
    text: text.substring(0, 50),
    language: language.code,
  });
  
  try {
    await speak(text, language);
    console.log('[voiceService] TTS playback completed');
  } catch (error) {
    console.warn('[voiceService] TTS playback failed', error);
  }
};
