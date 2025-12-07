'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, AlertCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    const debug: string[] = [];
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      debug.push('✅ App already installed');
      setDebugInfo(debug);
      return;
    }
    debug.push('ℹ️ App not installed yet');

    // Check protocol
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      debug.push('❌ Not HTTPS - PWA requires HTTPS!');
    } else {
      debug.push('✅ Protocol OK');
    }

    // Check user agent
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    if (isIOS || isSafari) {
      debug.push('ℹ️ iOS/Safari - use "Add to Home Screen" manually');
      setShowManualInstructions(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('🎉 beforeinstallprompt event fired!');
      debug.push('✅ Install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDebugInfo(debug);
      
      // Show prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSince = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      debug.push(`ℹ️ Last dismissed: ${daysSince.toFixed(1)} days ago`);
      
      // Don't show again for 7 days
      if (daysSince < 7) {
        setShowPrompt(false);
      }
    }

    // If no prompt after 5 seconds, show manual instructions
    setTimeout(() => {
      if (!deferredPrompt) {
        debug.push('❌ No install prompt - show manual instructions');
        setShowManualInstructions(true);
      }
      setDebugInfo(debug);
      console.log('PWA Debug:', debug);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleShowManual = () => {
    setShowManualInstructions(true);
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // Manual instructions for iOS/Safari or when prompt not available
  if (showManualInstructions && !showPrompt) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            maxWidth: '90%',
            width: '400px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              color: 'white',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowManualInstructions(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={32} color="#075E54" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  App installieren
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                  Manuelle Installation
                </p>
              </div>
            </div>

            {debugInfo.length > 0 && (
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                padding: '12px',
                marginBottom: '12px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {debugInfo.map((info, i) => (
                  <div key={i}>{info}</div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>So installierst du die App:</p>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Tippe auf das <strong>Teilen-Symbol</strong> (Safari) oder <strong>⋮ Menü</strong> (Chrome)</li>
                <li>Wähle <strong>&quot;Zum Home-Bildschirm&quot;</strong></li>
                <li>Bestätige mit <strong>&quot;Hinzufügen&quot;</strong></li>
              </ol>
              <p style={{ margin: '12px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
                💡 Die App erscheint dann als Icon auf deinem Home Screen
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            maxWidth: '90%',
            width: '400px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              color: 'white',
              position: 'relative',
            }}
          >
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  flexShrink: 0,
                }}
              >
                🌐
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Als App installieren
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                  Für besseres Audio & schnelleren Zugriff
                </p>
              </div>
            </div>

            <ul style={{ margin: '0 0 16px 0', padding: '0 0 0 20px', fontSize: '13px', opacity: 0.95 }}>
              <li>📱 Icon auf dem Home Screen</li>
              <li>🔊 Bessere Audio-Wiedergabe</li>
              <li>⚡ Schnellerer Start</li>
              <li>📶 Offline-Unterstützung</li>
            </ul>

            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstall}
                style={{
                  flex: 1,
                  background: 'white',
                  color: '#075E54',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Download size={20} />
                Installieren
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShowManual}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Manuell
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
