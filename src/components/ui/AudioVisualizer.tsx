'use client';

import { useEffect, useRef } from 'react';

interface Props {
  isRecording: boolean;
  stream: MediaStream | null;
}

/**
 * Visualizes audio input as animated waveform bars.
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

    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = (): void => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        ctx.fillStyle = `rgb(66, 133, 244)`;
        ctx.fillRect(
          x,
          canvas.height - barHeight,
          barWidth,
          barHeight,
        );

        x += barWidth + 1;
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
      width={300}
      height={60}
      style={{
        width: '100%',
        height: '60px',
        marginTop: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
      }}
    />
  );
};
