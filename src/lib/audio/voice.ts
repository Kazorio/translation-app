import type { LanguageOption } from '@/types/conversation';

const isClient = typeof window !== 'undefined';

// Global AudioContext that gets initialized on first user interaction
let audioContext: AudioContext | null = null;

/**
 * Initialize AudioContext on user interaction to bypass autoplay restrictions
 */
const initAudioContext = (): void => {
  if (!isClient || audioContext) return;
  
  try {
    audioContext = new AudioContext();
    console.log('[Audio] AudioContext initialized:', audioContext.state);
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
  } catch (error) {
    console.warn('[Audio] Failed to create AudioContext:', error);
  }
};

/**
 * Export function to manually initialize audio (for explicit user interaction)
 */
export const unlockAudio = async (): Promise<void> => {
  if (!isClient) return;
  
  // Initialize AudioContext
  initAudioContext();
  
  // Resume if suspended
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
    console.log('[Audio] AudioContext resumed, state:', audioContext.state);
  }
  
  // Play silent audio to fully unlock
  const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
  try {
    await audio.play();
    console.log('[Audio] Silent audio played successfully');
  } catch (err) {
    console.warn('[Audio] Silent audio play failed:', err);
  }
};

// Initialize on first click/touch anywhere on the page
if (isClient) {
  const initOnInteraction = (): void => {
    initAudioContext();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
}

/**
 * Plays audio using OpenAI Text-to-Speech API via Next.js API route.
 * Falls back to browser's SpeechSynthesis if API fails.
 */
export const speak = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  if (!isClient) {
    console.warn('Speech API not available on server.');
    return;
  }

  // Ensure AudioContext is ready
  if (!audioContext) {
    initAudioContext();
  }
  
  // Resume if suspended
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    
    // Try to play - this should work after user interaction
    try {
      await audio.play();
    } catch (playError) {
      console.warn('[Audio] Play blocked, trying to resume AudioContext:', playError);
      if (audioContext) {
        await audioContext.resume();
        await audio.play(); // Retry
      } else {
        throw playError;
      }
    }

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
    });
  } catch (error) {
    console.warn('OpenAI TTS failed, falling back to browser TTS:', error);
    await fallbackToSpeechSynthesis(text, language);
  }
};

/**
 * Fallback to browser's built-in SpeechSynthesis API.
 */
const fallbackToSpeechSynthesis = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  if (!window.speechSynthesis) {
    console.warn('Speech Synthesis API ist nicht verfügbar.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language.locale;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

