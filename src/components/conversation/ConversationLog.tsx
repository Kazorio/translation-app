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
}

export const ConversationLog = ({ entries, myLanguage, retranslatingIds }: Props): JSX.Element => {
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
      // Determine language for speech
      const isMine = entry.isMine ?? false;
      let speechLang = 'de-DE'; // default
      
      if (isMine) {
        // My message - use source language
        speechLang = entry.sourceLanguage === 'en' ? 'en-US' : 
                     entry.sourceLanguage === 'es' ? 'es-ES' :
                     entry.sourceLanguage === 'fr' ? 'fr-FR' :
                     entry.sourceLanguage === 'it' ? 'it-IT' : 'de-DE';
      } else {
        // Their message - use my current language
        speechLang = myLanguage?.code === 'en' ? 'en-US' : 
                     myLanguage?.code === 'es' ? 'es-ES' :
                     myLanguage?.code === 'fr' ? 'fr-FR' :
                     myLanguage?.code === 'it' ? 'it-IT' : 'de-DE';
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      utterance.rate = 0.9;
      
      utterance.onstart = () => {
        setLoadingId(null);
        setPlayingId(entry.id);
      };
      
      utterance.onend = () => {
        setPlayingId(null);
      };
      
      utterance.onerror = () => {
        setPlayingId(null);
        setLoadingId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
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
                    onClick={() => handlePlayAudio(entry, displayText)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: playingId === entry.id ? '#25D366' : '#FFFFFF',
                      color: playingId === entry.id ? '#FFFFFF' : '#667781',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
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
                    onClick={() => handlePlayAudio(entry, displayText)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: playingId === entry.id ? '#25D366' : '#FFFFFF',
                      color: playingId === entry.id ? '#FFFFFF' : '#667781',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
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
    </section>
  );
};
