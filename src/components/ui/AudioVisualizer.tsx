'use client';

import { useEffect, useRef } from 'react';

interface Props {
  isRecording: boolean;
  stream: MediaStream | null;
}

/**
 * Modern audio visualizer with smooth wave animation
 */
export const AudioVisualizer = ({ isRecording, stream }: Props): JSX.Element | null => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();

  useEffect(() => {
    if (!isRecording || !stream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = (): void => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw modern wave bars with rounded tops
      const barCount = 40;
      const barWidth = canvas.width / barCount;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const amplitude = dataArray[dataIndex] / 255;
        const barHeight = amplitude * (canvas.height * 0.7);

        const x = i * barWidth;
        
        // Create gradient for each bar
        const barGradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        barGradient.addColorStop(0, '#3b82f6');
        barGradient.addColorStop(0.5, '#2563eb');
        barGradient.addColorStop(1, '#1d4ed8');
        
        ctx.fillStyle = barGradient;
        
        // Draw rounded rectangle
        const radius = barWidth * 0.3;
        ctx.beginPath();
        ctx.roundRect(
          x + barWidth * 0.15,
          centerY - barHeight / 2,
          barWidth * 0.7,
          barHeight,
          radius
        );
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      void audioContext.close();
    };
  }, [isRecording, stream]);

  if (!isRecording) return null;

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      style={{
        width: '100%',
        maxWidth: '400px',
        height: '80px',
        marginTop: '12px',
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      }}
    />
  );
};
