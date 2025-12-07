'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

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
}

/**
 * Hook for managing audio playback queue with mobile browser autoplay support
 */
export const useAudioQueue = (): AudioQueueHook => {
  const queueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // Initialize AudioContext on first mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        // Type-safe AudioContext initialization with webkit prefix support
        const AudioContextClass = window.AudioContext || 
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          console.log('[useAudioQueue] AudioContext initialized:', audioContextRef.current.state);
        }
      } catch (error) {
        console.error('[useAudioQueue] Failed to create AudioContext:', error);
      }
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

    console.log('[useAudioQueue] Playing audio item:', item.id);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentItemId(item.id);

    if (item.onStart) {
      item.onStart();
    }

    try {
      // Resume AudioContext if suspended (mobile browsers)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('[useAudioQueue] Resuming suspended AudioContext');
        await audioContextRef.current.resume();
      }

      const audioUrl = URL.createObjectURL(item.audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      // Set up event handlers
      audio.onended = () => {
        console.log('[useAudioQueue] Audio ended:', item.id);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
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
      };

      audio.onerror = (error) => {
        console.error('[useAudioQueue] Audio error:', error);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentItemId(null);

        if (item.onError) {
          item.onError(new Error('Audio playback failed'));
        }

        // Play next in queue
        setTimeout(() => {
          void playNext();
        }, 100);
      };

      // Attempt to play
      await audio.play();
      console.log('[useAudioQueue] Audio playback started successfully');
    } catch (error) {
      console.error('[useAudioQueue] Failed to play audio:', error);
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
  }, []);

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
   * Unlocks audio playback for mobile browsers
   * Must be called from a user gesture (click, touch)
   */
  const unlock = useCallback(async (): Promise<boolean> => {
    console.log('[useAudioQueue] Attempting to unlock audio...');

    try {
      // Resume AudioContext
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('[useAudioQueue] AudioContext resumed');
        }
      }

      // Play a silent audio to unlock (required for iOS)
      // Create a minimal silent audio blob (0.1 seconds of silence)
      const sampleRate = 44100;
      const duration = 0.1;
      const numChannels = 1;
      const numSamples = sampleRate * duration;
      
      // Create WAV file manually
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);
      
      // Write silence (all zeros)
      for (let i = 0; i < numSamples; i++) {
        view.setInt16(44 + i * 2, 0, true);
      }
      
      const silentBlob = new Blob([buffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(silentBlob);
      const audio = new Audio(audioUrl);
      
      // Set volume to very low (but not 0, as that might not unlock)
      audio.volume = 0.01;

      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => {
          audio.play()
            .then(() => {
              console.log('[useAudioQueue] Silent audio played successfully');
              setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
                resolve();
              }, 200);
            })
            .catch(reject);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Failed to play silent audio'));
        };
      });

      setIsUnlocked(true);
      console.log('[useAudioQueue] Audio unlocked successfully');
      return true;
    } catch (error) {
      console.error('[useAudioQueue] Failed to unlock audio:', error);
      // Mark as unlocked anyway to allow attempts
      setIsUnlocked(true);
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  return {
    enqueue,
    isPlaying,
    currentItemId,
    isUnlocked,
    unlock,
  };
};
