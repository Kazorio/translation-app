'use client';

import type { JSX } from 'react';
import type { ConversationStatus } from '@/types/conversation';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  label: string;
  onRequestCapture: () => void;
  status: ConversationStatus;
  isActive: boolean;
  disabled?: boolean;
}

export const PushToTalkButton = ({
  label,
  onRequestCapture,
  status,
  isActive,
  disabled,
}: Props): JSX.Element => {
  const isBusy = status === 'processing';
  const computedDisabled = isBusy ? true : Boolean(disabled);
  
  return (
    <motion.button
      type="button"
      whileTap={{ scale: computedDisabled ? 1 : 0.95 }}
      onClick={onRequestCapture}
      disabled={computedDisabled}
      aria-pressed={isActive}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: '24px',
        border: 'none',
        backgroundColor: isActive ? '#DC2626' : '#25D366',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 600,
        cursor: computedDisabled ? 'not-allowed' : 'pointer',
        opacity: computedDisabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: isActive 
          ? '0 2px 8px rgba(220, 38, 38, 0.3)' 
          : '0 2px 8px rgba(37, 211, 102, 0.3)',
        transition: 'all 0.2s ease',
      }}
    >
      {isBusy ? (
        <>
          <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verarbeite...</span>
        </>
      ) : isActive ? (
        <>
          <Square size={24} fill="currentColor" />
          <span>Aufnahme stoppen</span>
        </>
      ) : (
        <>
          <Mic size={24} />
          <span>{label}</span>
        </>
      )}
    </motion.button>
  );
};
