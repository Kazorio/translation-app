'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
  isUnlocked: boolean;
  audioEnabled: boolean;
}

export const AutoPlayHint = ({ isUnlocked, audioEnabled }: Props) => {
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const wasDismissed = localStorage.getItem('autoplay-hint-dismissed') === 'true';
    setDismissed(wasDismissed);

    // Show hint after 3 seconds if not unlocked and not dismissed
    const timer = setTimeout(() => {
      if (!isUnlocked && audioEnabled && !wasDismissed) {
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isUnlocked, audioEnabled]);

  // Hide when unlocked
  useEffect(() => {
    if (isUnlocked) {
      setShow(false);
    }
  }, [isUnlocked]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('autoplay-hint-dismissed', 'true');
  };

  if (dismissed || !audioEnabled) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            maxWidth: '90%',
            width: '360px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              color: 'white',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={14} />
            </button>

            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Volume2 size={20} />
            </div>

            <div style={{ flex: 1, paddingRight: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                Auto-Play aktivieren
              </div>
              <div style={{ fontSize: '12px', opacity: 0.95 }}>
                Tippe einmal auf den Aufnahme-Button, damit neue Nachrichten automatisch vorgelesen werden
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
