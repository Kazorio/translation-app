'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ConversationEntry,
  ConversationStatus,
  LanguageOption,
  SpeakerRole,
} from '@/types/conversation';
import { captureUtterance } from '@/services/speechCaptureService';
import { translateText } from '@/services/translationService';
import {
  subscribeToRoom,
  insertConversationEntry,
  fetchRoomHistory,
} from '@/services/realtimeService';
import { useAudioQueue } from '@/hooks/useAudioQueue';
import { 
  initializeAudio, 
  playTestSound, 
  playSendSound, 
  playReceiveSound 
} from '@/lib/audio/notificationSounds';

interface ConversationController {
  entries: ConversationEntry[];
  status: ConversationStatus;
  activeSpeaker: SpeakerRole | null;
  errorMessage: string | null;
  myLanguage: LanguageOption | null;
  userCount: number;
  audioEnabled: boolean;
  audioUnlocking: boolean;
  updateMyLanguage: (language: LanguageOption) => void;
  triggerUtterance: (speaker: SpeakerRole, audioBlob: Blob) => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>; // New: Send text message
  clearTranscript: () => void;
  retranslatingIds: Set<string>; // Track entries being retranslated
  enableAudio: () => Promise<void>;
  blockedAudioIds: Set<string>; // IDs of messages with blocked audio
  playBlockedAudio: (id: string) => void; // Manually play blocked audio
  isAudioUnlocked: boolean; // Whether audio context is unlocked for auto-play
}

interface ConversationControllerOptions {
  forcedLanguage?: LanguageOption;
}

export const useConversationController = (
  roomId: string,
  options?: ConversationControllerOptions,
): ConversationController => {
  // Initialize language from localStorage immediately (before first render)
  const [myLanguage, setMyLanguage] = useState<LanguageOption | null>(() => {
    if (options?.forcedLanguage) {
      return options.forcedLanguage;
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('myLanguage');
      if (saved) {
        try {
          return JSON.parse(saved) as LanguageOption;
        } catch (e) {
          console.warn('[useConversationController] Failed to parse saved language:', e);
        }
      }
    }
    return null;
  });
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [audioUnlocking, setAudioUnlocking] = useState<boolean>(false);
  const audioEnabledRef = useRef<boolean>(false);
  const processedTtsIdsRef = useRef<Set<string>>(new Set());
  const entriesRef = useRef<ConversationEntry[]>([]);
  const myEntriesRef = useRef<Set<string>>(new Set()); // Track my own entry IDs
  const [retranslatingIds, setRetranslatingIds] = useState<Set<string>>(new Set());
  const lastUserCountRef = useRef<number>(0); // Debounce user count updates
  const mySpeakerIdRef = useRef<string | null>(null); // Persistent speaker ID
  const forcedLanguage = options?.forcedLanguage;
  
  // Audio queue for managing playback on mobile
  const audioQueue = useAudioQueue();

  // Load speaker ID from localStorage on mount (client-side only, after hydration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load or create persistent speaker ID
      let speakerId = localStorage.getItem('mySpeakerId');
      if (!speakerId) {
        speakerId = `speaker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('mySpeakerId', speakerId);
        console.log('[useConversationController] Created new speaker ID:', speakerId);
      } else {
        console.log('[useConversationController] Loaded speaker ID from localStorage:', speakerId);
      }
      mySpeakerIdRef.current = speakerId;
    }
  }, []); // Only run once on mount

  // Keep audioEnabledRef in sync with audioEnabled state
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    // Persist audio state to localStorage
    if (audioEnabled) {
      localStorage.setItem('audioEnabled', 'true');
    }
  }, [audioEnabled]);

  // Auto-enable audio on first load if previously enabled OR on desktop
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasEnabled = localStorage.getItem('audioEnabled') === 'true';
      const isDesktop = window.innerWidth > 768;
      
      if ((wasEnabled || isDesktop) && !audioEnabled) {
        console.log('[useConversationController] Auto-enabling audio (wasEnabled:', wasEnabled, 'isDesktop:', isDesktop, ')');
        setAudioEnabled(true);
        // DON'T call unlock() here - it needs a real user interaction!
        // The user must click the "Audio aktivieren" button
      }
    }
  }, [audioQueue]); // Only run once on mount

  useEffect(() => {
    if (forcedLanguage) {
      setMyLanguage(forcedLanguage);
    }
  }, [forcedLanguage]);

  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      const history = await fetchRoomHistory(roomId, mySpeakerIdRef.current);
      setEntries(history);
      entriesRef.current = history; // Keep ref in sync
      
      // Populate myEntriesRef with my message IDs from history
      history.forEach((entry) => {
        if (entry.isMine) {
          myEntriesRef.current.add(entry.id);
        }
      });
      console.log('[useConversationController] Loaded history with', history.length, 'entries,', myEntriesRef.current.size, 'are mine');
    };

    void loadHistory();

    const channel = subscribeToRoom(
      roomId,
      (entry) => {
        console.log('[useConversationController] INSERT received:', {
          id: entry.id,
          speaker: entry.speaker,
          text: entry.translatedText.substring(0, 30),
          alreadyProcessed: processedTtsIdsRef.current.has(entry.id),
        });
        
        // Check if entry already exists (synchronous check using ref)
        const exists = entriesRef.current.some((e) => e.id === entry.id);
        const isNewEntry = !exists;
        // Check if this message is mine based on myEntriesRef (set during optimistic update)
        // OR if we haven't tracked it yet, check against mySpeakerId from DB
        const isMine = myEntriesRef.current.has(entry.id);
        
        console.log('[useConversationController] Entry status:', {
          exists,
          isNewEntry,
          isMine,
          entryId: entry.id,
          myEntriesSize: myEntriesRef.current.size,
          myEntriesList: Array.from(myEntriesRef.current),
          currentEntriesCount: entriesRef.current.length,
        });
        
        // Update state and ref
        if (isNewEntry) {
          console.log('[useConversationController] Adding new entry to state');
          const entryWithOwnership = { ...entry, isMine };
          setEntries((prev) => {
            const updated = [...prev, entryWithOwnership];
            entriesRef.current = updated; // Keep ref in sync
            return updated;
          });
        } else {
          console.log('[useConversationController] Entry already exists, skipping');
        }
        
        // DEBUG: Log incoming handling (auto-read disabled)
        console.log('[useConversationController] Incoming message check:', {
          isNewEntry,
          alreadyProcessed: processedTtsIdsRef.current.has(entry.id),
          hasLanguage: !!myLanguage,
          isMine,
          shouldHandle: isNewEntry && !processedTtsIdsRef.current.has(entry.id) && !!myLanguage && !isMine,
        });

        // Auto read-aloud disabled: process incoming message state only
        if (isNewEntry && !processedTtsIdsRef.current.has(entry.id) && myLanguage && !isMine) {
          processedTtsIdsRef.current.add(entry.id);

          // Keep lightweight receive notification sound (no TTS auto-play)
          if (audioEnabledRef.current) {
            playReceiveSound();
          }

          // Keep re-translation for display consistency when needed (without auto playback)
          if (entry.targetLanguage !== myLanguage.code && entry.sourceLanguage !== myLanguage.code) {
            console.log('[useConversationController] Translation mismatch, re-translating for display only');
            const sourceText = entry.originalText;
            const sourceCode = entry.sourceLanguage || 'en';

            setRetranslatingIds((prev) => new Set(prev).add(entry.id));

            void translateText({
              text: sourceText,
              sourceLanguage: { code: sourceCode, label: sourceCode, locale: sourceCode },
              targetLanguage: myLanguage,
            })
              .then((result) => {
                setEntries((prev) => {
                  const updated = prev.map((e) =>
                    e.id === entry.id
                      ? { ...e, translatedText: result.translatedText, targetLanguage: myLanguage.code }
                      : e,
                  );
                  entriesRef.current = updated;
                  return updated;
                });
              })
              .catch((error) => {
                console.warn('[useConversationController] Re-translation failed:', error);
              })
              .finally(() => {
                setRetranslatingIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(entry.id);
                  return newSet;
                });
              });
          }
        } else {
          console.log('[useConversationController] Skipping incoming processing - duplicate/already processed/own message');
        }
      },
      (count) => {
        // Only update if count actually changed (debounce)
        if (count !== lastUserCountRef.current) {
          console.log('[useConversationController] User count changed:', lastUserCountRef.current, '→', count);
          lastUserCountRef.current = count;
          setUserCount(count);
        }
      }
    );

    return () => {
      console.log('[useConversationController] Cleaning up channel');
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only re-subscribe when roomId changes, not on language change!

  const updateMyLanguage = useCallback((language: LanguageOption) => {
    if (forcedLanguage) {
      setMyLanguage(forcedLanguage);
      return;
    }

    setMyLanguage(language);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('myLanguage', JSON.stringify(language));
    }
  }, [forcedLanguage]);

  const clearTranscript = useCallback(() => {
    setEntries([]);
    entriesRef.current = []; // Keep ref in sync
  }, []);

  const triggerUtterance = useCallback(
    async (speaker: SpeakerRole, audioBlob: Blob) => {
      // Check if language is selected
      if (!myLanguage) {
        setErrorMessage('Bitte wähle zuerst deine Sprache aus.');
        setStatus('error');
        setTimeout(() => {
          setErrorMessage(null);
          setStatus('idle');
        }, 2000);
        return;
      }
      
      setErrorMessage(null);
      setActiveSpeaker(speaker);
      setStatus('recording');

      // My language is the source, need to determine target from the entry
      // For now, we'll get the target from the first entry or use a default
      // In a real scenario, we'd detect the other user's language from their entries
      const sourceLanguage = myLanguage;
      
      const targetLanguage: LanguageOption = forcedLanguage ?? (() => {
        let detectedLanguage: LanguageOption = myLanguage;
        const recentEntries = entriesRef.current.slice(-5);
        for (const entry of recentEntries) {
          if (entry.sourceLanguage && entry.sourceLanguage !== myLanguage.code) {
            detectedLanguage = {
              code: entry.sourceLanguage,
              label: entry.sourceLanguage,
              locale: entry.sourceLanguage,
            };
            break;
          }
        }
        return detectedLanguage;
      })();

      try {
        const capture = await captureUtterance({
          speaker,
          language: sourceLanguage,
          audioBlob,
        });

        setStatus('processing');
        const translation = await translateText({
          text: capture.transcript,
          sourceLanguage,
          targetLanguage,
        });

        const newEntry = await insertConversationEntry(
          roomId,
          speaker,
          mySpeakerIdRef.current!, // Pass my speaker ID
          capture.transcript,
          translation.translatedText,
          sourceLanguage.code,
          targetLanguage.code,
        );

        // Optimistic update: add entry immediately to local state
        // (don't wait for Realtime subscription to trigger)
        if (newEntry) {
          // Mark as processed FIRST (synchronously) to prevent TTS when Realtime event arrives
          processedTtsIdsRef.current.add(newEntry.id);
          myEntriesRef.current.add(newEntry.id); // Mark as mine
          
          const entryWithOwnership = { ...newEntry, isMine: true };
          setEntries((prev) => {
            const exists = prev.some((e) => e.id === newEntry.id);
            const updated = exists ? prev : [...prev, entryWithOwnership];
            entriesRef.current = updated; // Keep ref in sync
            return updated;
          });
          
          // SEND NOTIFICATION SOUND: Play when audio message successfully sent
          playSendSound();
        }

        // Don't play TTS for own messages - only the other person hears it via Realtime
        setStatus('idle');
        setActiveSpeaker(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler.';
        setErrorMessage(message);
        setStatus('error');
        setActiveSpeaker(null);
        setTimeout(() => setStatus('idle'), 1200);
      }
    },
    [forcedLanguage, myLanguage, roomId],
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      // Check if language is selected
      if (!myLanguage) {
        setErrorMessage('Bitte wähle zuerst deine Sprache aus.');
        setStatus('error');
        setTimeout(() => {
          setErrorMessage(null);
          setStatus('idle');
        }, 2000);
        return;
      }
      
      setErrorMessage(null);
      setActiveSpeaker('self');
      setStatus('processing');

      const sourceLanguage = myLanguage;
      
      const targetLanguage: LanguageOption = forcedLanguage ?? (() => {
        let detectedLanguage: LanguageOption = myLanguage;
        const recentEntries = entriesRef.current.slice(-5);
        for (const entry of recentEntries) {
          if (entry.sourceLanguage && entry.sourceLanguage !== myLanguage.code) {
            detectedLanguage = {
              code: entry.sourceLanguage,
              label: entry.sourceLanguage,
              locale: entry.sourceLanguage,
            };
            break;
          }
        }
        return detectedLanguage;
      })();

      try {
        const translation = await translateText({
          text,
          sourceLanguage,
          targetLanguage,
        });

        const newEntry = await insertConversationEntry(
          roomId,
          'self',
          mySpeakerIdRef.current!, // Pass my speaker ID
          text, // Original text from user
          translation.translatedText,
          sourceLanguage.code,
          targetLanguage.code,
        );

        // Optimistic update: add entry immediately to local state
        if (newEntry) {
          // Mark as processed FIRST (synchronously) to prevent TTS when Realtime event arrives
          processedTtsIdsRef.current.add(newEntry.id);
          myEntriesRef.current.add(newEntry.id); // Mark as mine
          
          const entryWithOwnership = { ...newEntry, isMine: true };
          setEntries((prev) => {
            const exists = prev.some((e) => e.id === newEntry.id);
            const updated = exists ? prev : [...prev, entryWithOwnership];
            entriesRef.current = updated; // Keep ref in sync
            return updated;
          });
          
          // SEND NOTIFICATION SOUND: Play when message successfully sent
          playSendSound();
        }

        setStatus('idle');
        setActiveSpeaker(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler.';
        setErrorMessage(message);
        setStatus('error');
        setActiveSpeaker(null);
        setTimeout(() => setStatus('idle'), 1200);
      }
    },
    [forcedLanguage, myLanguage, roomId],
  );

  const enableAudio = useCallback(async (): Promise<void> => {
    setAudioUnlocking(true);
    console.log('[useConversationController] Starting audio unlock... (already enabled:', audioEnabled, ')');
    
    try {
      // ALWAYS unlock on user interaction - critical for PWA auto-play
      const success = await audioQueue.unlock();
      
      if (success) {
        console.log('[useConversationController] Audio unlocked successfully');
      } else {
        console.warn('[useConversationController] Audio unlock reported failure, but continuing');
      }
      
      // Initialize notification sounds (must be in user gesture context)
      const notificationInitialized = initializeAudio();
      if (notificationInitialized) {
        // Play test sound immediately to verify audio works
        playTestSound();
        console.log('[useConversationController] Notification sounds initialized and test sound played');
      }
      
      // Ensure state is set to enabled
      if (!audioEnabled) {
        setAudioEnabled(true);
      }
      setAudioUnlocking(false);
    } catch (error) {
      console.error('[useConversationController] Audio unlock failed:', error);
      // Still enable audio to allow attempts
      if (!audioEnabled) {
        setAudioEnabled(true);
      }
      setAudioUnlocking(false);
    }
  }, [audioQueue, audioEnabled]);

  return {
    entries,
    status,
    activeSpeaker,
    errorMessage,
    myLanguage,
    userCount,
    audioEnabled,
    audioUnlocking,
    retranslatingIds,
    updateMyLanguage,
    triggerUtterance,
    sendTextMessage,
    clearTranscript,
    enableAudio,
    blockedAudioIds: audioQueue.blockedAudioIds,
    playBlockedAudio: audioQueue.playBlockedAudio,
    isAudioUnlocked: audioQueue.isUnlocked,
  };
};
