import type { JSX } from 'react';
import Link from 'next/link';

export default function Home(): JSX.Element {
  // Fixed room ID for easy access during development
  const fixedRoomId = 'demo-room-v3';

  return (
    <main className="landing-page">
      <section className="hero">
        <p className="eyebrow">Live Dolmetscher</p>
        <h1>Sprich frei - wir übersetzen in beide Richtungen.</h1>
        <p className="lede">
          Bidirektionale Push-to-Talk Übersetzung. Jede Person nutzt die App auf ihrem
          eigenen Gerät.
        </p>
      </section>

      <section className="actions">
        <Link href={`/room/${fixedRoomId}`} className="btn-primary">
          Demo-Raum beitreten
        </Link>
        <p className="hint">
          Öffne diesen Link auf einem zweiten Gerät, um die Live-Übersetzung zu testen.
        </p>
      </section>
    </main>
  );
}
