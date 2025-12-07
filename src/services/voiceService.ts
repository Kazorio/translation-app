import type { LanguageOption } from '@/types/conversation';

/**
 * Fetches audio blob from OpenAI TTS API
 * Returns the blob for use with the audio queue system
 */
export const fetchVoiceAudio = async (
  text: string,
  language: LanguageOption,
): Promise<Blob> => {
  console.log('[voiceService] Fetching TTS for language:', language.code);
  
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language: language.code }),
  });

  if (!response.ok) {
    throw new Error(`TTS request failed: ${response.status}`);
  }

  const audioBlob = await response.blob();
  console.log('[voiceService] Audio blob fetched successfully');
  return audioBlob;
};

/**
 * Legacy function - plays audio directly (kept for manual click functionality)
 * For automatic playback, use fetchVoiceAudio with the audio queue instead
 */
export const renderVoiceFeedback = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  try {
    console.log('[voiceService] Playing TTS for language:', language.code);
    
    const audioBlob = await fetchVoiceAudio(text, language);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Wait for audio to be ready
    await new Promise<void>((resolve) => {
      audio.onloadeddata = () => {
        console.log('[voiceService] Audio loaded and ready');
        resolve();
      };
    });
    
    console.log('[voiceService] Starting playback...');
    await audio.play();
    
    // Clean up after playback
    await new Promise<void>((resolve) => {
      audio.onended = () => {
        console.log('[voiceService] Playback finished');
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('[voiceService] Playback error:', error);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
    });
    
    console.log('[voiceService] TTS playback completed');
  } catch (error) {
    console.error('[voiceService] TTS playback failed:', error);
  }
};
