'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, User, Share2, Check } from 'lucide-react';
import { useConversationController } from '@/hooks/useConversationController';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import { ConversationLog } from '@/components/conversation/ConversationLog';
import { LanguageSelector } from '@/components/conversation/LanguageSelector';
import { SpeakerConsole } from '@/components/conversation/SpeakerConsole';
import { StatusIndicator } from '@/components/conversation/StatusIndicator';

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
    audioEnabled,
    audioUnlocking,
    retranslatingIds,
    updateMyLanguage,
    triggerUtterance,
    enableAudio,
  } = useConversationController(roomId);

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Also enable audio on first interaction
    if (!audioEnabled) {
      await enableAudio();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    }}>
      {/* Fixed Header */}
      <header style={{
        padding: '8px 12px',
        borderBottom: 'none',
        backgroundColor: '#075E54',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10,
      }}>
        <Link 
          href="/"
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '50%',
            textDecoration: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
        >
          <ArrowLeft size={24} />
        </Link>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ 
            padding: '6px 10px',
            backgroundColor: userCount > 1 ? '#25D366' : '#EA580C',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        >
          {userCount > 1 ? <Users size={14} /> : <User size={14} />}
          {userCount}
        </motion.div>
        
        <div style={{ flex: 1, minWidth: '120px', maxWidth: '200px' }}>
          <LanguageSelector
            languages={SUPPORTED_LANGUAGES}
            selected={myLanguage}
            onChange={(lang) => {
              updateMyLanguage(lang);
              if (!audioEnabled) void enableAudio();
            }}
          />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyLink}
          style={{
            padding: '8px',
            backgroundColor: copied ? '#25D366' : '#128C7E',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.2s',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            width: '36px',
            height: '36px',
          }}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </motion.button>
        </motion.button>
      </header>

      {/* Scrollable Chat Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StatusIndicator status={status} />
        
        {/* Audio Enable Banner */}
        {!audioEnabled && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
      {/* Scrollable Chat Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              backgroundColor: '#fef3c7',
              borderBottom: '1px solid #fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '14px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔊</span>
              <span>Audio aktivieren für Wiedergabe</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => void enableAudio()}
              disabled={audioUnlocking}
              style={{
                padding: '8px 16px',
                backgroundColor: audioUnlocking ? '#d97706' : '#fbbf24',
                color: '#78350f',
                border: 'none',
                borderRadius: '10px',
                cursor: audioUnlocking ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: audioUnlocking ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {audioUnlocking ? 'Aktiviere...' : 'Aktivieren'}
            </motion.button>
          </motion.div>
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
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: '#fff',
        flexShrink: 0,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.06)',
        zIndex: 10,
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
