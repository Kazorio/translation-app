'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useConversationController } from '@/hooks/useConversationController';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import { ConversationLog } from '@/components/conversation/ConversationLog';
import { LanguageSelector } from '@/components/conversation/LanguageSelector';
import { SpeakerConsole } from '@/components/conversation/SpeakerConsole';
import { StatusIndicator } from '@/components/conversation/StatusIndicator';
import { unlockAudio } from '@/lib/audio/voice';

interface Props {
  roomId: string;
}

export const ConversationShell = ({ roomId }: Props): JSX.Element => {
  const {
    entries,
    status,
    activeSpeaker,
    errorMessage,
    myLanguage,
    userCount,
    retranslatingIds,
    updateMyLanguage,
    triggerUtterance,
  } = useConversationController(roomId);

  const [copied, setCopied] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioUnlocking, setAudioUnlocking] = useState(false);

  const handleEnableAudio = async (): Promise<void> => {
    setAudioUnlocking(true);
    console.log('[ConversationShell] Starting audio unlock...');
    
    try {
      // Use the unlockAudio function from voice.ts
      await unlockAudio();
      setAudioEnabled(true);
      console.log('[ConversationShell] Audio enabled successfully');
    } catch (error) {
      console.error('[ConversationShell] Audio unlock failed:', error);
      // Still set as enabled so banner disappears
      setAudioEnabled(true);
    } finally {
      setAudioUnlocking(false);
    }
  };

  const handleCopyLink = async (): Promise<void> => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Also enable audio on first interaction
    if (!audioEnabled) {
      await handleEnableAudio();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Fixed Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <Link 
          href="/"
          style={{
            padding: '8px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
          }}
        >
          ← Zurück
        </Link>
        <div style={{ 
          padding: '8px 16px',
          backgroundColor: userCount > 1 ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${userCount > 1 ? '#6ee7b7' : '#fca5a5'}`,
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: userCount > 1 ? '#065f46' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '16px' }}>{userCount > 1 ? '👥' : '👤'}</span>
          {userCount} {userCount === 1 ? 'Person' : 'Personen'}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <LanguageSelector
            languages={SUPPORTED_LANGUAGES}
            selected={myLanguage}
            onChange={(lang) => {
              updateMyLanguage(lang);
              if (!audioEnabled) void handleEnableAudio();
            }}
          />
        </div>
        <button
          onClick={handleCopyLink}
          style={{
            padding: '10px 20px',
            backgroundColor: copied ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Kopiert' : '🔗 Teilen'}
        </button>
      </header>

      {/* Scrollable Chat Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StatusIndicator status={status} />
        
        {/* Audio Enable Banner */}
        {!audioEnabled && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ fontSize: '14px', color: '#92400e' }}>
              🔊 Klicke hier um Audio-Wiedergabe zu aktivieren
            </div>
            <button
              onClick={() => void handleEnableAudio()}
              disabled={audioUnlocking}
              style={{
                padding: '8px 16px',
                backgroundColor: audioUnlocking ? '#d97706' : '#fbbf24',
                color: '#78350f',
                border: 'none',
                borderRadius: '6px',
                cursor: audioUnlocking ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                opacity: audioUnlocking ? 0.7 : 1,
              }}
            >
              {audioUnlocking ? 'Aktiviere...' : 'Aktivieren'}
            </button>
          </div>
        )}
        
        {errorMessage && (
          <div style={{ padding: '12px 20px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '14px' }}>
            {errorMessage}
          </div>
        )}
        <ConversationLog entries={entries} myLanguage={myLanguage} retranslatingIds={retranslatingIds} />
      </div>

      {/* Fixed Footer with Recording Button */}
      <footer style={{
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        flexShrink: 0,
      }}>
        <SpeakerConsole
          role="self"
          language={myLanguage}
          status={status}
          isActive={activeSpeaker === 'self'}
          onSubmit={(audioBlob) => triggerUtterance('self', audioBlob)}
        />
      </footer>
    </div>
  );
};
