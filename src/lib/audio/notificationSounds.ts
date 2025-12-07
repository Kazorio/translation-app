/**
 * Notification Sounds Service
 * 
 * Provides simple, reliable notification sounds for chat messages.
 * Uses Web Audio API for synthetic sounds (works without external files).
 * 
 * Usage:
 * 1. Call initializeAudio() once on user interaction (button click)
 * 2. Call playTestSound() to verify audio is working
 * 3. Call playSendSound() when sending a message
 * 4. Call playReceiveSound() when receiving a message
 * 
 * Sound characteristics:
 * - Test sound: 800Hz beep (0.2s) - confirms audio works
 * - Send sound: 1000Hz quick chirp (0.1s) - bright, short
 * - Receive sound: 600Hz notification (0.15s) - deeper, distinct
 */

let audioContext: AudioContext | null = null;
let isAudioInitialized = false;

/**
 * Initialize the Web Audio API context.
 * MUST be called from a user gesture (e.g., button click) to comply with autoplay policies.
 * 
 * @returns true if initialization succeeded
 */
export const initializeAudio = (): boolean => {
  if (isAudioInitialized && audioContext?.state === 'running') {
    return true;
  }

  try {
    // Create AudioContext (works on all modern browsers)
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // On iOS/Safari, the context might be suspended until user interaction
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    
    isAudioInitialized = true;
    console.log('[NotificationSounds] Audio initialized successfully');
    return true;
  } catch (error) {
    console.error('[NotificationSounds] Failed to initialize audio:', error);
    return false;
  }
};

/**
 * Play a test beep to verify audio is working.
 * Should be called immediately after initializeAudio() within the same user gesture.
 */
export const playTestSound = (): void => {
  if (!isAudioInitialized || !audioContext) {
    console.warn('[NotificationSounds] Audio not initialized. Call initializeAudio() first.');
    return;
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Test sound: 800Hz beep
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    // Envelope: quick fade in/out
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);

    console.log('[NotificationSounds] Test sound played');
  } catch (error) {
    console.error('[NotificationSounds] Failed to play test sound:', error);
  }
};

/**
 * Play notification sound when sending a message.
 * Bright, short chirp (1000Hz, 0.1s)
 * 
 * To customize: Change frequency.value or duration
 */
export const playSendSound = (): void => {
  if (!isAudioInitialized || !audioContext) {
    return; // Silently fail if audio not initialized
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Send sound: bright, quick chirp
    oscillator.frequency.value = 1000; // Higher pitch = "send"
    oscillator.type = 'sine';

    // Quick envelope
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } catch (error) {
    console.error('[NotificationSounds] Failed to play send sound:', error);
  }
};

/**
 * Play notification sound when receiving a message.
 * Deeper, distinct tone (600Hz, 0.15s)
 * 
 * To customize: Change frequency.value or duration
 */
export const playReceiveSound = (): void => {
  if (!isAudioInitialized || !audioContext) {
    return; // Silently fail if audio not initialized
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Receive sound: deeper, notification-like
    oscillator.frequency.value = 600; // Lower pitch = "receive"
    oscillator.type = 'sine';

    // Envelope with slight sustain
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.03);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch (error) {
    console.error('[NotificationSounds] Failed to play receive sound:', error);
  }
};

/**
 * Check if audio has been initialized.
 */
export const isAudioReady = (): boolean => {
  return isAudioInitialized && audioContext?.state === 'running';
};

/**
 * Get current audio context state for debugging.
 */
export const getAudioState = (): string => {
  if (!audioContext) return 'not-initialized';
  return audioContext.state;
};
