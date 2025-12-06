'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import Link from 'next/link';

export default function Home(): JSX.Element {
  // Fixed room ID for easy access during development
  const fixedRoomId = 'demo-room-v3';
  const [testResult, setTestResult] = useState<string>('');

  const testAudio = async (): Promise<void> => {
    setTestResult('Teste Audio...');
    
    try {
      // Test Browser TTS
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance('Hallo! Audio Test erfolgreich!');
        utterance.lang = 'de-DE';
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 1;
        
        utterance.onend = () => {
          setTestResult('✅ Audio funktioniert!');
        };
        
        utterance.onerror = (error) => {
          setTestResult(`❌ Fehler: ${error.error}`);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        setTestResult('❌ Browser unterstützt kein TTS');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Fehler: ${errorMessage}`);
    }
  };

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
        <button
          onClick={testAudio}
          style={{
            padding: '16px 32px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '16px',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          🔊 Audio Test (klick mich!)
        </button>
        
        {testResult && (
          <p style={{
            padding: '12px',
            backgroundColor: testResult.includes('✅') ? '#d1fae5' : '#fee2e2',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: '500',
          }}>
            {testResult}
          </p>
        )}
        
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
