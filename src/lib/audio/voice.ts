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
 * Plays audio using OpenAI TTS for all devices (Desktop & Mobile)
 * - Better quality and supports all languages including Persian
 * - Audio unlock via "Audio aktivieren" button ensures autoplay works on mobile
 */
export const speak = async (
  text: string,
  language: LanguageOption,
): Promise<void> => {
  if (!isClient) {
    console.warn('Speech API not available on server.');
    return;
  }

  console.log('[Audio] Using OpenAI TTS for all devices');
  
  // Ensure audio is unlocked first
  await unlockAudio();
  
  // Use OpenAI TTS exclusively
  await playOpenAITTS(text, language);
};

/**
 * Uses OpenAI Text-to-Speech API via Next.js API route
 */
const playOpenAITTS = async (
  text: string,
  language?: LanguageOption,
): Promise<void> => {
  // Ensure AudioContext is ready
  if (!audioContext) {
    initAudioContext();
  }
  
  // Resume if suspended - CRITICAL for mobile
  if (audioContext && audioContext.state === 'suspended') {
    console.log('[Audio] Resuming suspended AudioContext...');
    await audioContext.resume();
    console.log('[Audio] AudioContext state after resume:', audioContext.state);
  }

  console.log('[Audio] Using OpenAI TTS with voice for language:', language?.code);

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      text,
      language: language?.code 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS request failed: ${response.status} - ${errorText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  
  // Wait for audio to be ready before playing
  await new Promise<void>((resolve) => {
    audio.onloadeddata = () => {
      console.log('[Audio] Audio loaded and ready to play');
      resolve();
    };
  });
  
  console.log('[Audio] Starting playback...');
  await audio.play();

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      console.log('[Audio] Playback finished');
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (error) => {
      console.error('[Audio] Playback error:', error);
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed', { cause: error }));
    };
  });
};
