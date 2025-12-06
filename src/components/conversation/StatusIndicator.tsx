import type { JSX } from 'react';
import type { ConversationStatus } from '@/types/conversation';

const statusCopy: Record<ConversationStatus, string> = {
  idle: 'Bereit für die nächste Aufnahme',
  recording: 'Aufnahme aktiv - halte das Gerät nah am Sprecher',
  processing: 'Übersetzung läuft…',
  error: 'Ein Fehler ist aufgetreten',
};

export const StatusIndicator = ({
  status,
}: {
  status: ConversationStatus;
}): JSX.Element => (
  <div className={`status-indicator status-${status}`}>
    <span>{statusCopy[status]}</span>
  </div>
);
