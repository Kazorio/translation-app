'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Howl } from 'howler';

interface AudioQueueItem {
  id: string;
  audioBlob: Blob;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface AudioQueueHook {
  enqueue: (item: AudioQueueItem) => void;
  isPlaying: boolean;
  currentItemId: string | null;
  isUnlocked: boolean;
  unlock: () => Promise<boolean>;
  blockedAudioIds: Set<string>; // IDs of audio that were blocked
  playBlockedAudio: (id: string) => void; // Manual trigger for blocked audio
}

/**
 * Hook for managing audio playback queue with mobile browser autoplay support
 * Uses Howler.js for better mobile compatibility
 */
export const useAudioQueue = (): AudioQueueHook => {
  const queueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentHowlRef = useRef<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [blockedAudioIds, setBlockedAudioIds] = useState<Set<string>>(new Set());
  
  // Store blocked audio for manual playback
  const blockedAudioMapRef = useRef<Map<string, Blob>>(new Map());

  /**
   * Triggers vibration if supported (mobile feedback)
   */
  const triggerVibration = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms
      console.log('[useAudioQueue] Vibration triggered');
    }
  }, []);

  /**
   * Plays the next item in the queue
   */
  const playNext = useCallback(async (): Promise<void> => {
    if (isPlayingRef.current || queueRef.current.length === 0) {
      return;
    }

    const item = queueRef.current.shift();
    if (!item) return;

    console.log('[useAudioQueue] Attempting to play audio item:', item.id);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentItemId(item.id);

    if (item.onStart) {
      item.onStart();
    }

    try {
      // Convert Blob to URL for Howler
      const audioUrl = URL.createObjectURL(item.audioBlob);
      
      // Create Howl instance
      const howl = new Howl({
        src: [audioUrl],
        format: ['mp3', 'wav', 'webm'], // Support multiple formats
        html5: true, // Use HTML5 Audio for better mobile support
        autoplay: false, // We'll trigger manually
        volume: 1.0,
        onload: () => {
          console.log('[useAudioQueue] Audio loaded:', item.id);
        },
        onplay: () => {
          console.log('[useAudioQueue] Audio playback started:', item.id);
        },
        onend: () => {
          console.log('[useAudioQueue] Audio ended:', item.id);
          URL.revokeObjectURL(audioUrl);
          currentHowlRef.current = null;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentItemId(null);

          if (item.onEnd) {
            item.onEnd();
          }

          // Play next in queue
          setTimeout(() => {
            void playNext();
          }, 100);
        },
        onloaderror: (_id, error) => {
          console.error('[useAudioQueue] Load error:', item.id, error);
          URL.revokeObjectURL(audioUrl);
          currentHowlRef.current = null;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentItemId(null);

          if (item.onError) {
            item.onError(new Error('Audio load failed'));
          }

          // Try next item
          setTimeout(() => {
            void playNext();
          }, 100);
        },
        onplayerror: (_id, error) => {
          console.error('[useAudioQueue] Play error (BLOCKED?):', item.id, error);
          
          // Audio was blocked - store for manual playback
          blockedAudioMapRef.current.set(item.id, item.audioBlob);
          setBlockedAudioIds((prev) => new Set(prev).add(item.id));
          
          // Trigger vibration as feedback
          triggerVibration();
          
          URL.revokeObjectURL(audioUrl);
          currentHowlRef.current = null;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentItemId(null);

          if (item.onError) {
            item.onError(new Error('Audio playback blocked by browser'));
          }

          // Try next item
          setTimeout(() => {
            void playNext();
          }, 100);
        },
      });

      currentHowlRef.current = howl;

      // Attempt to play
      howl.play();
    } catch (error) {
      console.error('[useAudioQueue] Failed to create/play audio:', error);
      
      // Store as blocked
      blockedAudioMapRef.current.set(item.id, item.audioBlob);
      setBlockedAudioIds((prev) => new Set(prev).add(item.id));
      triggerVibration();
      
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentItemId(null);

      if (item.onError) {
        item.onError(error instanceof Error ? error : new Error('Unknown playback error'));
      }

      // Try next item
      setTimeout(() => {
        void playNext();
      }, 100);
    }
  }, [triggerVibration]);

  /**
   * Adds an audio item to the queue
   */
  const enqueue = useCallback(
    (item: AudioQueueItem): void => {
      console.log('[useAudioQueue] Enqueueing audio:', item.id);
      queueRef.current.push(item);

      // Start playing if not already playing
      if (!isPlayingRef.current) {
        void playNext();
      }
    },
    [playNext]
  );

  /**
   * Manually play a blocked audio (called from UI tap)
   */
  const playBlockedAudio = useCallback((id: string): void => {
    const audioBlob = blockedAudioMapRef.current.get(id);
    if (!audioBlob) {
      console.warn('[useAudioQueue] No blocked audio found for id:', id);
      return;
    }

    console.log('[useAudioQueue] Manually playing blocked audio:', id);
    
    // Remove from blocked set
    setBlockedAudioIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    // Play immediately (user gesture = allowed!)
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create and play Howl (no need to store reference as it auto-plays and cleans up)
    new Howl({
      src: [audioUrl],
      format: ['mp3', 'wav', 'webm'],
      html5: true,
      autoplay: true, // Safe here - user gesture
      volume: 1.0,
      onend: () => {
        URL.revokeObjectURL(audioUrl);
        blockedAudioMapRef.current.delete(id);
      },
      onloaderror: () => {
        URL.revokeObjectURL(audioUrl);
        blockedAudioMapRef.current.delete(id);
      },
    });
  }, []);

  /**
   * Unlocks audio playback for mobile browsers
   * Must be called from a user gesture (click, touch)
   */
  const unlock = useCallback(async (): Promise<boolean> => {
    console.log('[useAudioQueue] Attempting to unlock audio...');

    try {
      // Method 1: Resume AudioContext directly (critical for PWA!)
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const ctx = (Howler as { ctx?: AudioContext }).ctx;
        if (ctx && ctx.state === 'suspended') {
          console.log('[useAudioQueue] Resuming suspended AudioContext...');
          await ctx.resume();
          console.log('[useAudioQueue] AudioContext resumed, state:', ctx.state);
        }
      }

      // Method 2: Use Howler's unlock mechanism - play a very short silent audio
      new Howl({
        src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='],
        volume: 0.01,
        autoplay: true,
        html5: false, // Use Web Audio for unlock
        onend: () => {
          console.log('[useAudioQueue] Silent audio played for unlock');
          setIsUnlocked(true);
        },
        onloaderror: (_id, error) => {
          console.warn('[useAudioQueue] Unlock audio load error:', error);
          setIsUnlocked(true); // Still mark as unlocked to allow attempts
        },
        onplayerror: (_id, error) => {
          console.warn('[useAudioQueue] Unlock audio play error:', error);
          setIsUnlocked(true); // Still mark as unlocked to allow attempts
        },
      });

      // Wait a bit for unlock to process
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log('[useAudioQueue] Audio unlock completed');
      return true;
    } catch (error) {
      console.error('[useAudioQueue] Failed to unlock audio:', error);
      setIsUnlocked(true); // Mark as unlocked anyway to allow attempts
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentHowlRef.current) {
        currentHowlRef.current.unload();
        currentHowlRef.current = null;
      }
      // Clean up all blocked audio
      blockedAudioMapRef.current.clear();
    };
  }, []);

  return {
    enqueue,
    isPlaying,
    currentItemId,
    isUnlocked,
    unlock,
    blockedAudioIds,
    playBlockedAudio,
  };
};
