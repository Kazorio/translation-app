'use client';

import { useState, type JSX } from 'react';
import { PushToTalkButton } from '@/components/ui/PushToTalkButton';
import { AudioVisualizer } from '@/components/ui/AudioVisualizer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type {
  ConversationStatus,
  LanguageOption,
  SpeakerRole,
} from '@/types/conversation';

interface Props {
  role: SpeakerRole;
  language: LanguageOption | null;
  status: ConversationStatus;
  isActive: boolean;
  onSubmit: (audioBlob: Blob) => Promise<void>;
}

export const SpeakerConsole = ({
  language,
  status,
  isActive,
  onSubmit,
}: Props): JSX.Element => {
  const { startRecording, stopRecording, isRecording, error, stream } =
    useAudioRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMouseDown = (): void => {
    void startRecording();
  };

  const handleMouseUp = (): void => {
    void (async () => {
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        console.warn('No audio recorded');
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(audioBlob);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleToggleRecording = (): void => {
    if (isRecording) {
      // Stop and submit
      handleMouseUp();
    } else {
      // Start recording
      handleMouseDown();
    }
  };

  return (
    <div className="speaker-console">
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '8px' }}>
          {error}
        </div>
      )}

      {stream && isRecording && (
        <div style={{ marginBottom: '16px' }}>
          <AudioVisualizer stream={stream} isRecording={isRecording} />
        </div>
      )}

      <PushToTalkButton
        label={
          !language
            ? '⚠️ Sprache wählen'
            : isSubmitting
              ? 'Verarbeite...'
              : isRecording
                ? '⏹️ Stoppen & Senden'
                : '🎤 Aufnahme starten'
        }
        onRequestCapture={handleToggleRecording}
        status={status}
        isActive={isActive || isRecording}
        disabled={isSubmitting || !language}
      />
    </div>
  );
};

