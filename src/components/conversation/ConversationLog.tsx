'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { ConversationEntry, LanguageOption } from '@/types/conversation';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react';

interface Props {
  entries: ConversationEntry[];
  myLanguage: LanguageOption | null;
  retranslatingIds: Set<string>;
  blockedAudioIds?: Set<string>;
  onPlayBlockedAudio?: (id: string) => void;
}

export const ConversationLog = ({ entries, myLanguage, retranslatingIds, blockedAudioIds = new Set(), onPlayBlockedAudio }: Props): JSX.Element => {
  const streamRef = useRef<HTMLDivElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [entries]);

  const handlePlayAudio = async (entry: ConversationEntry, text: string): Promise<void> => {
    if (playingId === entry.id) {
      // Stop if already playing
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing
    window.speechSynthesis.cancel();
    setLoadingId(entry.id);

    try {
      // Determine language for TTS
      const isMine = entry.isMine ?? false;
      let langCode = 'de'; // default
      
      if (isMine) {
        // My message - use source language
        langCode = entry.sourceLanguage ?? 'de';
      } else {
        // Their message - use my current language
        langCode = myLanguage?.code ?? 'de';
      }

      // Use OpenAI TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language: langCode }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onloadeddata = () => {
        setLoadingId(null);
      };
      
      audio.onplay = () => {
        setPlayingId(entry.id);
      };
      
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingId(null);
        setLoadingId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setPlayingId(null);
      setLoadingId(null);
    }
  };

  return (
    <section style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#E5DDD5',
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)',
    }}>
      <div 
        ref={streamRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          scrollBehavior: 'smooth',
        }}
      >
        {entries.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#94a3b8', 
            padding: '60px 20px',
            fontSize: '15px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <p>Noch keine Nachrichten</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              Drücke auf den Mikrofon-Button um zu starten
            </p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const isMine = entry.isMine ?? false;
            const isRetranslating = retranslatingIds.has(entry.id);
            
            // Determine which text to show
            let displayText = '';
            if (isMine) {
              displayText = entry.originalText;
            } else if (isRetranslating) {
              displayText = 'Übersetze...';
            } else {
              if (myLanguage && entry.targetLanguage === myLanguage.code) {
                displayText = entry.translatedText;
              } else if (myLanguage && entry.sourceLanguage === myLanguage.code) {
                displayText = entry.originalText;
              } else {
                displayText = entry.translatedText || entry.originalText;
              }
            }
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: isMine ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
                style={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                  marginBottom: '4px',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {/* Audio button for other person's messages (left side) */}
                {!isMine && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      // If audio was blocked, use manual playback
                      if (blockedAudioIds.has(entry.id) && onPlayBlockedAudio) {
                        onPlayBlockedAudio(entry.id);
                      } else {
                        void handlePlayAudio(entry, displayText);
                      }
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: blockedAudioIds.has(entry.id) 
                        ? '#FF6B6B' 
                        : playingId === entry.id 
                        ? '#25D366' 
                        : '#FFFFFF',
                      color: blockedAudioIds.has(entry.id) || playingId === entry.id ? '#FFFFFF' : '#667781',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: blockedAudioIds.has(entry.id) 
                        ? '0 2px 8px rgba(255,107,107,0.4)' 
                        : '0 1px 2px rgba(0,0,0,0.1)',
                      flexShrink: 0,
                      animation: blockedAudioIds.has(entry.id) ? 'pulse 2s infinite' : 'none',
                    }}
                    title={blockedAudioIds.has(entry.id) ? '🔊 Tap to Play' : 'Play Audio'}
                  >
                    {loadingId === entry.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </motion.button>
                )}

                <div
                  style={{
                    maxWidth: '75%',
                    minWidth: '120px',
                    padding: '8px 12px',
                    borderRadius: isMine 
                      ? '12px 12px 2px 12px' 
                      : '12px 12px 12px 2px',
                    backgroundColor: isMine ? '#D1F4CC' : '#FFFFFF',
                    color: '#000',
                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                    position: 'relative',
                    border: isMine ? '1px solid #9FE697' : 'none',
                  }}
                >
                  <p style={{ 
                    fontSize: '14.5px', 
                    lineHeight: '1.4', 
                    margin: 0,
                    wordWrap: 'break-word',
                  }}>
                    {displayText}
                  </p>
                  
                  <time 
                    dateTime={new Date(entry.createdAt).toISOString()}
                    style={{
                      fontSize: '11px',
                      color: '#667781',
                      marginTop: '4px',
                      display: 'block',
                      textAlign: 'right',
                    }}
                  >
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>

                {/* Audio button for my messages (right side) */}
                {isMine && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      // If audio was blocked, use manual playback
                      if (blockedAudioIds.has(entry.id) && onPlayBlockedAudio) {
                        onPlayBlockedAudio(entry.id);
                      } else {
                        void handlePlayAudio(entry, displayText);
                      }
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: blockedAudioIds.has(entry.id) 
                        ? '#FF6B6B' 
                        : playingId === entry.id 
                        ? '#25D366' 
                        : '#FFFFFF',
                      color: blockedAudioIds.has(entry.id) || playingId === entry.id ? '#FFFFFF' : '#667781',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: blockedAudioIds.has(entry.id) 
                        ? '0 2px 8px rgba(255,107,107,0.4)' 
                        : '0 1px 2px rgba(0,0,0,0.1)',
                      flexShrink: 0,
                      animation: blockedAudioIds.has(entry.id) ? 'pulse 2s infinite' : 'none',
                    }}
                    title={blockedAudioIds.has(entry.id) ? '🔊 Tap to Play' : 'Play Audio'}
                  >
                    {loadingId === entry.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* CSS Animation for pulsing blocked audio button */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </section>
  );
};
