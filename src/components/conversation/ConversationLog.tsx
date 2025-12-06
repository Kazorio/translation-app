import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import type { ConversationEntry, LanguageOption } from '@/types/conversation';

interface Props {
  entries: ConversationEntry[];
  myLanguage: LanguageOption | null;
  retranslatingIds: Set<string>;
}

export const ConversationLog = ({ entries, myLanguage, retranslatingIds }: Props): JSX.Element => {
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new entries arrive (since newest is on top)
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = 0;
    }
  }, [entries]);

  // Reverse entries so newest appears first (at top)
  const reversedEntries = [...entries].reverse();

  return (
    <section style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div 
        ref={streamRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {entries.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>
            Noch keine Beiträge. Drücke auf "Aufnahme starten" um zu beginnen.
          </p>
        )}
        {reversedEntries.map((entry) => {
          // Different colors for each speaker
          const isMine = entry.isMine ?? false;
          const bgColor = isMine ? '#dbeafe' : '#fce7f3'; // Blue for me, Pink for partner
          const borderColor = isMine ? '#93c5fd' : '#f9a8d4';
          const textColor = isMine ? '#1e40af' : '#be185d';
          
          // Determine which text to show
          let displayText = '';
          const isRetranslating = retranslatingIds.has(entry.id);
          
          if (isMine) {
            // My message: show original (what I spoke)
            displayText = entry.originalText;
          } else if (isRetranslating) {
            // Currently re-translating
            displayText = 'Übersetze...';
          } else {
            // Their message: need to show in MY language
            // Check if translation matches my language
            if (myLanguage && entry.targetLanguage === myLanguage.code) {
              // Translation is in my language, perfect!
              displayText = entry.translatedText;
            } else if (myLanguage && entry.sourceLanguage === myLanguage.code) {
              // Original is in my language
              displayText = entry.originalText;
            } else {
              // This should now be rare - the hook should auto-retranslate
              displayText = entry.translatedText || entry.originalText;
            }
          }
          
          return (
            <article 
              key={entry.id} 
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
              }}
            >
              <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '12px',
                fontSize: '14px',
                color: textColor,
              }}>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{isMine ? '👤' : '👥'}</span>
                  {isMine ? 'Ich' : 'Person'}
                </span>
                <time dateTime={new Date(entry.createdAt).toISOString()}>
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </header>
              <p style={{ fontSize: '16px', lineHeight: '1.5', color: '#111827' }}>
                {displayText}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
