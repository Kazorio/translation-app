'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import type { ConversationEntry, LanguageOption } from '@/types/conversation';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react';
import {
  checkSpelling,
  type SpellAnnotation,
} from '@/services/spellcheckService';

interface Props {
  entries: ConversationEntry[];
  myLanguage: LanguageOption | null;
  retranslatingIds: Set<string>;
  blockedAudioIds?: Set<string>;
  onPlayBlockedAudio?: (id: string) => void;
}

const renderFormattedText = (text: string): ReactNode => {
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const elements: ReactNode[] = [];
    let key = 0;

    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lineIndex}-${key++}`}>
            {line.substring(lastIndex, match.index)}
          </span>,
        );
      }

      const matchedText = match[0];
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        elements.push(
          <strong key={`bold-${lineIndex}-${key++}`}>
            {matchedText.slice(2, -2)}
          </strong>,
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        elements.push(
          <em key={`italic-${lineIndex}-${key++}`}>
            {matchedText.slice(1, -1)}
          </em>,
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(
        <span key={`text-${lineIndex}-${key++}`}>
          {line.substring(lastIndex)}
        </span>,
      );
    }

    return (
      <span key={`line-${lineIndex}`}>
        {elements.length > 0 ? elements : line}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

export const ConversationLog = ({
  entries,
  myLanguage,
  retranslatingIds,
  blockedAudioIds = new Set(),
  onPlayBlockedAudio,
}: Props): JSX.Element => {
  const streamRef = useRef<HTMLDivElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [spellcheckByEntryId, setSpellcheckByEntryId] = useState<Record<string, SpellAnnotation[]>>({});
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const spellcheckPendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    setActiveTooltipKey(null);
  }, [entries.length]);


  useEffect(() => {
    if (!activeTooltipKey) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      const target = event.target;

      if (!(target instanceof Element)) {
        setActiveTooltipKey(null);
        return;
      }

      if (target.closest('[data-spell-tooltip-interactive="true"]')) {
        return;
      }

      setActiveTooltipKey(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [activeTooltipKey]);

  useEffect(() => {
    if (myLanguage?.code !== 'de') {
      return;
    }

    entries.forEach((entry) => {
      const isMine = entry.isMine ?? false;
      if (!isMine) {
        return;
      }

      if (spellcheckByEntryId[entry.id] || spellcheckPendingRef.current.has(entry.id)) {
        return;
      }

      if (!entry.originalText.trim()) {
        setSpellcheckByEntryId((prev) => ({ ...prev, [entry.id]: [] }));
        return;
      }

      spellcheckPendingRef.current.add(entry.id);

      void checkSpelling(entry.originalText, 'de')
        .then((result) => {
          setSpellcheckByEntryId((prev) => ({
            ...prev,
            [entry.id]: result.annotations,
          }));
        })
        .catch(() => {
          setSpellcheckByEntryId((prev) => ({
            ...prev,
            [entry.id]: [],
          }));
        })
        .finally(() => {
          spellcheckPendingRef.current.delete(entry.id);
        });
    });
  }, [entries, myLanguage?.code, spellcheckByEntryId]);

  const handlePlayAudio = async (entry: ConversationEntry, text: string): Promise<void> => {
    if (playingId === entry.id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setLoadingId(entry.id);

    try {
      const isMine = entry.isMine ?? false;
      let langCode = 'de';

      if (isMine) {
        langCode = entry.sourceLanguage ?? 'de';
      } else {
        langCode = myLanguage?.code ?? 'de';
      }

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

  const renderSpellcheckedText = (
    entryId: string,
    text: string,
    annotations: SpellAnnotation[],
  ): ReactNode => {
    if (!annotations.length) {
      return renderFormattedText(text);
    }

    const validAnnotations = annotations
      .filter(
        (annotation) =>
          annotation.start >= 0 &&
          annotation.end > annotation.start &&
          annotation.end <= text.length,
      )
      .sort((a, b) => a.start - b.start);

    if (!validAnnotations.length) {
      return renderFormattedText(text);
    }

    const nodes: ReactNode[] = [];
    let cursor = 0;

    validAnnotations.forEach((annotation, index) => {
      if (annotation.start < cursor) {
        return;
      }

      if (annotation.start > cursor) {
        nodes.push(
          <span key={`${entryId}-plain-${cursor}`}>
            {text.slice(cursor, annotation.start)}
          </span>,
        );
      }

      const word = text.slice(annotation.start, annotation.end);
      const tooltipKey = `${entryId}-${annotation.start}-${annotation.end}`;

      if (annotation.type === 'casing' && word.length > 0) {
        nodes.push(
          <span key={`${entryId}-case-${annotation.start}-${index}`}>
            <span
              style={{
                backgroundColor: 'rgba(250, 204, 21, 0.62)',
                borderRadius: '3px',
                padding: '0 2px',
                boxShadow: 'inset 0 -1px 0 rgba(161, 98, 7, 0.35)',
              }}
            >
              {word.charAt(0)}
            </span>
            {word.slice(1)}
          </span>,
        );
      } else {
        const isTooltipOpen = activeTooltipKey === tooltipKey;

        nodes.push(
          <span
            key={`${entryId}-miss-${annotation.start}-${index}`}
            style={{ position: 'relative', display: 'inline-block' }}
          >
            <span
              data-spell-tooltip-interactive="true"
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveTooltipKey((prev) => (prev === tooltipKey ? null : tooltipKey));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveTooltipKey((prev) => (prev === tooltipKey ? null : tooltipKey));
                }
              }}
              style={{
                backgroundColor: 'rgba(244, 114, 182, 0.34)',
                borderRadius: '3px',
                padding: '0 2px',
                cursor: 'pointer',
                boxShadow: 'inset 0 -1px 0 rgba(190, 24, 93, 0.35)',
              }}
              title="Klicken für Korrektur"
            >
              {word}
            </span>

            {isTooltipOpen && (
              <span
                data-spell-tooltip-interactive="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 4px)',
                  backgroundColor: '#111827',
                  color: '#fff',
                  fontSize: '12px',
                  lineHeight: 1.2,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                  boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                }}
              >
                {annotation.suggestion}
              </span>
            )}
          </span>,
        );
      }

      cursor = annotation.end;
    });

    if (cursor < text.length) {
      nodes.push(
        <span key={`${entryId}-tail-${cursor}`}>
          {text.slice(cursor)}
        </span>,
      );
    }

    return nodes;
  };

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#E5DDD5',
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)',
      }}
    >
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
          <div
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              padding: '60px 20px',
              fontSize: '15px',
            }}
          >
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

            let displayText = '';
            if (isMine) {
              displayText = entry.originalText;
            } else if (isRetranslating) {
              displayText = 'Übersetze...';
            } else if (myLanguage && entry.targetLanguage === myLanguage.code) {
              displayText = entry.translatedText;
            } else if (myLanguage && entry.sourceLanguage === myLanguage.code) {
              displayText = entry.originalText;
            } else {
              displayText = entry.translatedText || entry.originalText;
            }

            const canShowSpellcheck =
              isMine &&
              myLanguage?.code === 'de' &&
              Array.isArray(spellcheckByEntryId[entry.id]) &&
              spellcheckByEntryId[entry.id].length > 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: isMine ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: 'spring',
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
                {!isMine && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
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
                      color:
                        blockedAudioIds.has(entry.id) || playingId === entry.id
                          ? '#FFFFFF'
                          : '#667781',
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
                    borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: isMine ? '#D1F4CC' : '#FFFFFF',
                    color: '#000',
                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                    position: 'relative',
                    border: isMine ? '1px solid #9FE697' : 'none',
                  }}
                >
                  <p
                    style={{
                      fontSize: '16px',
                      lineHeight: '1.5',
                      margin: 0,
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {canShowSpellcheck
                      ? renderSpellcheckedText(entry.id, displayText, spellcheckByEntryId[entry.id])
                      : renderFormattedText(displayText)}
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

                {isMine && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
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
                      color:
                        blockedAudioIds.has(entry.id) || playingId === entry.id
                          ? '#FFFFFF'
                          : '#667781',
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

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
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
