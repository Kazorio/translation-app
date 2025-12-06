'use client';

import type { JSX } from 'react';
import { use } from 'react';
import { ConversationShell } from '@/features/conversation/ConversationShell';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: PageProps): JSX.Element {
  const { id } = use(params);

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ConversationShell roomId={id} />
    </main>
  );
}
