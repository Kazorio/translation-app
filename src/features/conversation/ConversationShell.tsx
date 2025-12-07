'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, User, Share2, Check, Volume2 } from 'lucide-react';
import { useConversationController } from '@/hooks/useConversationController';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import { ConversationLog } from '@/components/conversation/ConversationLog';
import { LanguageSelector } from '@/components/conversation/LanguageSelector';
import { MessageInput } from '@/components/conversation/MessageInput';
import { AutoPlayHint } from '@/components/conversation/AutoPlayHint';

interface Props {
  roomId: string;
}

export const ConversationShell = ({ roomId }: Props): JSX.Element => {
  const {
    entries,
    errorMessage,
    myLanguage,
    userCount,
    audioEnabled,
    audioUnlocking,
    retranslatingIds,
    updateMyLanguage,
    triggerUtterance,
    sendTextMessage,
    enableAudio,
    blockedAudioIds,
    playBlockedAudio,
    isAudioUnlocked,
  } = useConversationController(roomId);

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // ALWAYS unlock audio on ANY user interaction (even if already enabled)
    await enableAudio();
  };

  const handleSubmitAudio = async (audioBlob: Blob): Promise<void> => {
    // ALWAYS unlock audio on recording (critical for PWA)
    await enableAudio();
    await triggerUtterance('self', audioBlob);
  };

  const handleSubmitText = async (text: string): Promise<void> => {
    // ALWAYS unlock audio on user interaction (critical for PWA)
    await enableAudio();
    await sendTextMessage(text);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh',
      minHeight: '-webkit-fill-available',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    }}>
      {/* Fixed Header - Compact */}
      <header style={{
        padding: '8px 12px',
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
            borderRadius: '50%',
            textDecoration: 'none',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </Link>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ 
            padding: '6px 10px',
            backgroundColor: userCount > 1 ? '#25D366' : '#EA580C',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        >
          {userCount > 1 ? <Users size={14} /> : <User size={14} />}
          {userCount}
        </motion.div>
        
        <div style={{ flex: 1, minWidth: '100px', maxWidth: '180px' }}>
          <LanguageSelector
            languages={SUPPORTED_LANGUAGES}
            selected={myLanguage}
            onChange={(lang) => {
              updateMyLanguage(lang);
              if (!audioEnabled) void enableAudio();
            }}
          />
        </div>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyLink}
          aria-label={copied ? 'Link kopiert' : 'Link teilen'}
          style={{
            padding: '8px',
            backgroundColor: copied ? '#25D366' : '#128C7E',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            width: '36px',
            height: '36px',
            transition: 'background-color 0.2s',
          }}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </motion.button>
      </header>

      {/* Scrollable Chat Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Audio Enable Banner - Show if audio not enabled OR if AudioContext not unlocked */}
        {(!audioEnabled || !isAudioUnlocked) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef3c7',
              borderBottom: '1px solid #fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>🔊</span>
              <span>{isAudioUnlocked ? 'Audio bereit' : 'Audio aktivieren'}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => void enableAudio()}
              disabled={audioUnlocking}
              style={{
                padding: '6px 14px',
                backgroundColor: audioUnlocking ? '#d97706' : '#fbbf24',
                color: '#78350f',
                border: 'none',
                borderRadius: '10px',
                cursor: audioUnlocking ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: audioUnlocking ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {audioUnlocking ? 'Aktiviere...' : 'OK'}
            </motion.button>
          </motion.div>
        )}
        
        {errorMessage && (
          <div style={{ padding: '10px 12px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '13px' }}>
            {errorMessage}
          </div>
        )}
        
        <ConversationLog 
          entries={entries} 
          myLanguage={myLanguage} 
          retranslatingIds={retranslatingIds}
          blockedAudioIds={blockedAudioIds}
          onPlayBlockedAudio={playBlockedAudio}
        />
      </div>

      {/* Auto-Play Hint - appears when audio enabled but not unlocked */}
      <AutoPlayHint isUnlocked={isAudioUnlocked} audioEnabled={audioEnabled} />

      {/* Fixed Footer with Recording Button OR Audio Enable Button */}
      <footer style={{
        padding: '10px 12px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: '#fff',
        flexShrink: 0,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.06)',
        zIndex: 20,
      }}>
        {!isAudioUnlocked ? (
          // Show big "Audio aktivieren" button until unlocked
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void enableAudio()}
            disabled={audioUnlocking}
            style={{
              width: '100%',
              padding: '20px 24px',
              backgroundColor: audioUnlocking ? '#9ca3af' : '#075E54',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 600,
              cursor: audioUnlocking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(7, 94, 84, 0.3)',
            }}
          >
            <Volume2 size={24} />
            {audioUnlocking ? 'Aktiviere Audio...' : '🔊 Audio aktivieren für automatische Übersetzung'}
          </motion.button>
        ) : (
          // Show normal message input when unlocked
          <MessageInput
            language={myLanguage}
            onSubmitAudio={handleSubmitAudio}
            onSubmitText={handleSubmitText}
          />
        )}
      </footer>
    </div>
  );
};
