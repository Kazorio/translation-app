'use client';

import { useState, useRef, type JSX, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import { AudioVisualizer } from '@/components/ui/AudioVisualizer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type { LanguageOption } from '@/types/conversation';

interface Props {
  language: LanguageOption | null;
  onSubmitAudio: (audioBlob: Blob) => Promise<void>;
  onSubmitText: (text: string) => Promise<void>;
}

export const MessageInput = ({
  language,
  onSubmitAudio,
  onSubmitText,
}: Props): JSX.Element => {
  const { startRecording, stopRecording, isRecording, error, stream } =
    useAudioRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendText = async (): Promise<void> => {
    if (!textMessage.trim() || !language) return;

    setIsSubmitting(true);
    try {
      await onSubmitText(textMessage.trim());
      setTextMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendText();
    }
  };

  const handleTextChange = (value: string): void => {
    setTextMessage(value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleToggleRecording = (): void => {
    if (isRecording) {
      // Stop and submit
      void (async () => {
        const audioBlob = await stopRecording();

        if (!audioBlob) {
          console.warn('No audio recorded');
          return;
        }

        setIsSubmitting(true);
        try {
          await onSubmitAudio(audioBlob);
        } finally {
          setIsSubmitting(false);
        }
      })();
    } else {
      // Start recording
      void startRecording();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {error && (
        <div style={{ 
          color: '#ef4444', 
          marginBottom: '8px',
          fontSize: '13px',
          padding: '8px 12px',
          backgroundColor: '#fee2e2',
          borderRadius: '8px',
        }}>
          {error}
        </div>
      )}

      {stream && isRecording && (
        <div style={{ marginBottom: '12px' }}>
          <AudioVisualizer stream={stream} isRecording={isRecording} />
        </div>
      )}

      {/* Input Container */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        width: '100%',
      }}>
        {/* Text Input */}
        <div style={{
          flex: 1,
          backgroundColor: '#F0F2F5',
          borderRadius: '24px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          minHeight: '44px',
        }}>
          <textarea
            ref={textareaRef}
            value={textMessage}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!language ? 'Wähle zuerst eine Sprache...' : 'Nachricht schreiben...'}
            disabled={!language || isSubmitting || isRecording}
            rows={1}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '15px',
              lineHeight: '1.4',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />
        </div>

        {/* Action Buttons */}
        {textMessage.trim() ? (
          // Send Text Button
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => void handleSendText()}
            disabled={isSubmitting || !language}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isSubmitting || !language ? '#9ca3af' : '#25D366',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting || !language ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
            }}
          >
            <Send size={20} />
          </motion.button>
        ) : (
          // Voice Recording Button
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleRecording}
            disabled={isSubmitting || !language}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 
                !language ? '#9ca3af' :
                isRecording ? '#ef4444' : 
                '#075E54',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting || !language ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: isRecording 
                ? '0 2px 12px rgba(239, 68, 68, 0.5)' 
                : '0 2px 8px rgba(7, 94, 84, 0.3)',
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            <Mic size={20} />
          </motion.button>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};
