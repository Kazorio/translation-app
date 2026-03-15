import type { JSX } from 'react';
import { ConversationShell } from '@/features/conversation/ConversationShell';

const GERMAN_LANGUAGE = {
  code: 'de',
  label: 'Deutsch',
  locale: 'de-DE',
};

export default function GermanChatPage(): JSX.Element {
  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ConversationShell
        roomId="de-chat-room"
        fixedLanguage={GERMAN_LANGUAGE}
        hideLanguageSelector
        backHref="/de-chat"
      />
    </main>
  );
}
