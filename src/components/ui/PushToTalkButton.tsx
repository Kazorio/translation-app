'use client';

import clsx from 'clsx';
import type { JSX } from 'react';
import type { ConversationStatus } from '@/types/conversation';

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
    <button
      type="button"
      className={clsx('push-to-talk', { active: isActive })}
      onClick={onRequestCapture}
      disabled={computedDisabled}
      aria-pressed={isActive}
    >
      <span>{isBusy ? 'Verarbeite…' : isActive ? 'Aufnahme läuft' : label}</span>
    </button>
  );
};
