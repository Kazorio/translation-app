'use client';

import type { JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isUnlocking: boolean;
  onEnable: () => Promise<void>;
}

export const AudioPermissionModal = ({ isOpen, isUnlocking, onEnable }: Props): JSX.Element => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 9998,
              backdropFilter: 'blur(4px)',
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px 24px',
              maxWidth: '400px',
              width: 'calc(100% - 32px)',
              zIndex: 9999,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 24px',
                  backgroundColor: '#075E54',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Volume2 size={40} color="white" />
              </motion.div>
              
              {/* Title */}
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '12px',
              }}>
                Audio aktivieren
              </h2>
              
              {/* Description */}
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                lineHeight: '1.6',
                marginBottom: '28px',
              }}>
                Um eingehende Nachrichten automatisch vorzulesen, benötigen wir deine Erlaubnis für Audio-Wiedergabe.
              </p>
              
              {/* Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => void onEnable()}
                disabled={isUnlocking}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: isUnlocking ? '#9ca3af' : '#075E54',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isUnlocking ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {isUnlocking ? 'Aktiviere...' : 'Audio aktivieren'}
              </motion.button>
              
              {/* Hint */}
              <p style={{
                fontSize: '13px',
                color: '#9ca3af',
                marginTop: '16px',
                lineHeight: '1.5',
              }}>
                💡 Du kannst die Einstellung später in deinem Browser ändern.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
