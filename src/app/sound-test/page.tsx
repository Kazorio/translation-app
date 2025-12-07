'use client';

import { useState } from 'react';

export default function SoundTestPage() {
  const [status, setStatus] = useState('Nicht initialisiert');
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // HTML5 Audio Elements
  let testAudio: HTMLAudioElement | null = null;
  let sendAudio: HTMLAudioElement | null = null;
  let receiveAudio: HTMLAudioElement | null = null;

  const createBeepDataUrl = (frequency: number, duration: number): string => {
    const sampleRate = 8000;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  };

  const initializeAudio = () => {
    try {
      testAudio = new Audio(createBeepDataUrl(800, 0.2));
      sendAudio = new Audio(createBeepDataUrl(1000, 0.1));
      receiveAudio = new Audio(createBeepDataUrl(600, 0.15));
      
      testAudio.load();
      sendAudio.load();
      receiveAudio.load();
      
      setAudioInitialized(true);
      setStatus('✅ Audio initialisiert (HTML5)');
      
      // Play test sound immediately
      testAudio.currentTime = 0;
      testAudio.play()
        .then(() => setStatus('✅ Test-Sound abgespielt!'))
        .catch((error) => setStatus(`❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`));
      
    } catch (error) {
      setStatus(`❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const playTest = () => {
    if (!testAudio) return;
    testAudio.currentTime = 0;
    testAudio.play()
      .then(() => setStatus('🔊 Test-Sound gespielt'))
      .catch((error) => setStatus(`❌ ${error instanceof Error ? error.message : 'Unbekannt'}`));
  };

  const playSend = () => {
    if (!sendAudio) return;
    sendAudio.currentTime = 0;
    sendAudio.play()
      .then(() => setStatus('📤 Send-Sound gespielt'))
      .catch((error) => setStatus(`❌ ${error instanceof Error ? error.message : 'Unbekannt'}`));
  };

  const playReceive = () => {
    if (!receiveAudio) return;
    receiveAudio.currentTime = 0;
    receiveAudio.play()
      .then(() => setStatus('📥 Receive-Sound gespielt'))
      .catch((error) => setStatus(`❌ ${error instanceof Error ? error.message : 'Unbekannt'}`));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#075E54' }}>
          🔊 Sound Test
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
          Teste Notification Sounds auf Mobile
        </p>

        <div style={{
          padding: '15px',
          backgroundColor: '#E5DDD5',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          Status: {status}
        </div>

        {!audioInitialized ? (
          <button
            onClick={initializeAudio}
            style={{
              width: '100%',
              padding: '18px',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '15px',
            }}
          >
            🎵 Audio aktivieren & Test-Sound
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={playTest}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#075E54',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              🔔 Test-Sound (800Hz)
            </button>
            
            <button
              onClick={playSend}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#34B7F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              📤 Send-Sound (1000Hz)
            </button>
            
            <button
              onClick={playReceive}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              📥 Receive-Sound (600Hz)
            </button>
          </div>
        )}

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#FFF9C4',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.6',
        }}>
          <strong>💡 Hinweise:</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px', margin: 0 }}>
            <li>Zuerst auf "Audio aktivieren" klicken</li>
            <li>Lautstärke am Gerät hochdrehen</li>
            <li>Nicht im Stumm-Modus testen</li>
            <li>Auf iOS: Klingelton-Modus aktivieren</li>
          </ul>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '10px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
        }}>
          User-Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
        </div>
      </div>
    </div>
  );
}
