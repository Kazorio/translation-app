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
 * Detects if the device is mobile
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Plays audio using the best available TTS method:
 * - Desktop: OpenAI TTS (better quality, more languages)
 * - Mobile: Browser TTS (more reliable with autoplay restrictions)
 */
export const speak = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  if (!isClient) {
    console.warn('Speech API not available on server.');
    return;
  }

  const isMobile = isMobileDevice();
  console.log('[Audio] Device type:', isMobile ? 'Mobile' : 'Desktop');

  // Use browser TTS on mobile for reliability
  if (isMobile) {
    console.log('[Audio] Using browser TTS for mobile');
    return useBrowserTTS(text, language);
  }

  // Try OpenAI TTS on desktop, fallback to browser TTS
  try {
    console.log('[Audio] Trying OpenAI TTS for desktop');
    await useOpenAITTS(text);
  } catch (error) {
    console.warn('[Audio] OpenAI TTS failed, falling back to browser TTS:', error);
    return useBrowserTTS(text, language);
  }
};

/**
 * Uses OpenAI Text-to-Speech API via Next.js API route
 */
const useOpenAITTS = async (
  text: string,
): Promise<void> => {
  // Ensure AudioContext is ready
  if (!audioContext) {
    initAudioContext();
  }
  
  // Resume if suspended
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }

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
  
  await audio.play();

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };
  });
};

/**
 * Uses browser's built-in Speech Synthesis API
 */
const useBrowserTTS = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  if (!window.speechSynthesis) {
    console.warn('Speech Synthesis API ist nicht verfügbar.');
    return;
  }

  console.log('[Audio] Speaking:', text.substring(0, 50), 'in', language.locale);

  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.locale;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      console.log('[Audio] Finished speaking');
      resolve();
    };

    utterance.onerror = (error) => {
      console.error('[Audio] Speech error:', error);
      resolve(); // Resolve anyway to not block
    };

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  });
};

