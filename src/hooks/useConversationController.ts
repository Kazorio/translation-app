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
import { renderVoiceFeedback } from '@/services/voiceService';
import {
  subscribeToRoom,
  insertConversationEntry,
  fetchRoomHistory,
} from '@/services/realtimeService';

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

  // Keep audioEnabledRef in sync with audioEnabled state
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      const history = await fetchRoomHistory(roomId);
      setEntries(history);
      entriesRef.current = history; // Keep ref in sync
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
        const isMine = myEntriesRef.current.has(entry.id);
        
        console.log('[useConversationController] Entry status:', {
          exists,
          isNewEntry,
          isMine,
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
        
        // Play TTS only for NEW messages from others AND if audio is enabled
        if (isNewEntry && !processedTtsIdsRef.current.has(entry.id) && myLanguage && !isMine && audioEnabledRef.current) {
          processedTtsIdsRef.current.add(entry.id);
          console.log('[useConversationController] Playing TTS for entry:', entry.id);
          console.log('[useConversationController] Entry targetLanguage:', entry.targetLanguage, 'myLanguage:', myLanguage.code);
          
          // Check if the translation is in MY language
          if (entry.targetLanguage === myLanguage.code) {
            // Perfect! Translation is already in my language
            console.log('[useConversationController] Translation matches my language, playing TTS');
            void renderVoiceFeedback(entry.translatedText, myLanguage);
          } else if (entry.sourceLanguage === myLanguage.code) {
            // The original text is in my language, play that instead
            console.log('[useConversationController] Original text is in my language, playing that');
            void renderVoiceFeedback(entry.originalText, myLanguage);
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
              
              void renderVoiceFeedback(result.translatedText, myLanguage);
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
        setUserCount(count);
      }
    );

    return () => {
      void channel.unsubscribe();
    };
  }, [roomId, myLanguage]);

  const updateMyLanguage = useCallback((language: LanguageOption) => {
    setMyLanguage(language);
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
    console.log('[useConversationController] Starting audio unlock...');
    
    try {
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance('Audio aktiviert');
        utterance.lang = myLanguage?.locale || 'de-DE';
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 1;
        
        utterance.onend = () => {
          console.log('[useConversationController] Audio unlocked successfully');
          setAudioEnabled(true);
          setAudioUnlocking(false);
        };
        
        utterance.onerror = (error) => {
          console.error('[useConversationController] Audio unlock error:', error);
          setAudioEnabled(true);
          setAudioUnlocking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('[useConversationController] Browser does not support TTS');
        setAudioEnabled(true);
        setAudioUnlocking(false);
      }
    } catch (error) {
      console.error('[useConversationController] Audio unlock failed:', error);
      setAudioEnabled(true);
      setAudioUnlocking(false);
    }
  }, [myLanguage]);

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
  };
};
