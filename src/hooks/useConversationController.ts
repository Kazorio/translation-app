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
import { fetchVoiceAudio } from '@/services/voiceService';
import {
  subscribeToRoom,
  insertConversationEntry,
  fetchRoomHistory,
} from '@/services/realtimeService';
import { useAudioQueue } from '@/hooks/useAudioQueue';

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
  clearTranscript: () => void;
  retranslatingIds: Set<string>; // Track entries being retranslated
  enableAudio: () => Promise<void>;
  blockedAudioIds: Set<string>; // IDs of messages with blocked audio
  playBlockedAudio: (id: string) => void; // Manually play blocked audio
  isAudioUnlocked: boolean; // Whether audio context is unlocked for auto-play
}

export const useConversationController = (roomId: string): ConversationController => {
  const [myLanguage, setMyLanguage] = useState<LanguageOption | null>(null);
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
  
  // Audio queue for managing playback on mobile
  const audioQueue = useAudioQueue();

  // Load language and speaker ID from localStorage on mount (client-side only, after hydration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('myLanguage');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMyLanguage(parsed);
          console.log('[useConversationController] Loaded language from localStorage:', parsed);
        } catch (e) {
          console.warn('[useConversationController] Failed to parse saved language:', e);
        }
      }
      
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
        
        // DEBUG: Log auto-play decision
        console.log('[useConversationController] Auto-play check:', {
          isNewEntry,
          alreadyProcessed: processedTtsIdsRef.current.has(entry.id),
          hasLanguage: !!myLanguage,
          isMine,
          audioEnabled: audioEnabledRef.current,
          shouldPlay: isNewEntry && !processedTtsIdsRef.current.has(entry.id) && myLanguage && !isMine && audioEnabledRef.current
        });
        
        // Play TTS only for NEW messages from others AND if audio is enabled
        if (isNewEntry && !processedTtsIdsRef.current.has(entry.id) && myLanguage && !isMine && audioEnabledRef.current) {
          processedTtsIdsRef.current.add(entry.id);
          console.log('[useConversationController] Playing TTS for entry:', entry.id);
          console.log('[useConversationController] Entry targetLanguage:', entry.targetLanguage, 'myLanguage:', myLanguage.code);
          
          // TEST: Play notification sound first (to test auto-play with pre-existing file)
          console.log('[useConversationController] 🔔 Playing test notification sound...');
          fetch('/notification.mp3')
            .then((res) => res.blob())
            .then((blob) => {
              audioQueue.enqueue({
                id: `notification-${entry.id}`,
                audioBlob: blob,
                onStart: () => console.log('[TEST] 🔔 Notification sound started'),
                onEnd: () => console.log('[TEST] 🔔 Notification sound finished'),
                onError: (error) => console.error('[TEST] 🔔 Notification sound error:', error),
              });
            })
            .catch((error) => console.error('[TEST] Failed to load notification sound:', error));
          
          // Check if the translation is in MY language
          if (entry.targetLanguage === myLanguage.code) {
            // Perfect! Translation is already in my language
            console.log('[useConversationController] Translation matches my language, enqueueing TTS');
            void fetchVoiceAudio(entry.translatedText, myLanguage).then((audioBlob) => {
              audioQueue.enqueue({
                id: entry.id,
                audioBlob,
                onStart: () => console.log('[TTS] Playing:', entry.id),
                onEnd: () => console.log('[TTS] Finished:', entry.id),
                onError: (error) => console.error('[TTS] Error:', entry.id, error),
              });
            }).catch((error) => {
              console.error('[useConversationController] Failed to fetch TTS audio:', error);
            });
          } else if (entry.sourceLanguage === myLanguage.code) {
            // The original text is in my language, play that instead
            console.log('[useConversationController] Original text is in my language, enqueueing that');
            void fetchVoiceAudio(entry.originalText, myLanguage).then((audioBlob) => {
              audioQueue.enqueue({
                id: entry.id,
                audioBlob,
                onStart: () => console.log('[TTS] Playing:', entry.id),
                onEnd: () => console.log('[TTS] Finished:', entry.id),
                onError: (error) => console.error('[TTS] Error:', entry.id, error),
              });
            }).catch((error) => {
              console.error('[useConversationController] Failed to fetch TTS audio:', error);
            });
          } else {
            // Need to translate to my language on-the-fly and UPDATE the entry
            console.log('[useConversationController] Translation mismatch, re-translating to my language');
            const sourceText = entry.originalText;
            const sourceCode = entry.sourceLanguage || 'en';
            
            setRetranslatingIds((prev) => new Set(prev).add(entry.id));
            
            void translateText({
              text: sourceText,
              sourceLanguage: { code: sourceCode, label: sourceCode, locale: sourceCode },
              targetLanguage: myLanguage,
            }).then((result) => {
              // Update the entry with the new translation
              setEntries((prev) => {
                const updated = prev.map((e) => 
                  e.id === entry.id 
                    ? { ...e, translatedText: result.translatedText, targetLanguage: myLanguage.code }
                    : e
                );
                entriesRef.current = updated;
                return updated;
              });
              
              setRetranslatingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(entry.id);
                return newSet;
              });
              
              // Enqueue TTS for retranslated text
              void fetchVoiceAudio(result.translatedText, myLanguage).then((audioBlob) => {
                audioQueue.enqueue({
                  id: entry.id,
                  audioBlob,
                  onStart: () => console.log('[TTS] Playing retranslated:', entry.id),
                  onEnd: () => console.log('[TTS] Finished retranslated:', entry.id),
                  onError: (error) => console.error('[TTS] Error retranslated:', entry.id, error),
                });
              }).catch((error) => {
                console.error('[useConversationController] Failed to fetch TTS audio for retranslation:', error);
              });
            }).catch((error) => {
              console.warn('[useConversationController] Re-translation failed:', error);
              setRetranslatingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(entry.id);
                return newSet;
              });
            });
          }
        } else {
          console.log('[useConversationController] Skipping TTS - already processed or duplicate');
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
    setMyLanguage(language);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('myLanguage', JSON.stringify(language));
    }
  }, []);

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
      
      // Try to detect target language from recent entries
      let targetLanguage: LanguageOption = myLanguage; // fallback
      const recentEntries = entriesRef.current.slice(-5);
      for (const entry of recentEntries) {
        if (entry.sourceLanguage && entry.sourceLanguage !== myLanguage.code) {
          // Found a message from partner in different language
          targetLanguage = {
            code: entry.sourceLanguage,
            label: entry.sourceLanguage,
            locale: entry.sourceLanguage,
          };
          break;
        }
      }

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
    [myLanguage, roomId],
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
    clearTranscript,
    enableAudio,
    blockedAudioIds: audioQueue.blockedAudioIds,
    playBlockedAudio: audioQueue.playBlockedAudio,
    isAudioUnlocked: audioQueue.isUnlocked,
  };
};
