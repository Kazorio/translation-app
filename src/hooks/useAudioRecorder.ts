'use client';

import { useState, useCallback, useRef } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
  stream: MediaStream | null;
}

interface AudioRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  error: string | null;
  stream: MediaStream | null;
}

/**
 * Convert raw PCM audio samples to WAV format
 * WAV is universally supported by all audio processing tools including Whisper
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string): void => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + samples.length * 2, true); // ChunkSize
  writeString(8, 'WAVE'); // Format
  writeString(12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data'); // Subchunk2ID
  view.setUint32(40, samples.length * 2, true); // Subchunk2Size

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Hook for recording audio from the user's microphone.
 * Uses Web Audio API to capture raw PCM data and encode as WAV.
 * WAV format is guaranteed to be compatible with Whisper API.
 */
export const useAudioRecorder = (): AudioRecorderControls => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    error: null,
    stream: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create AudioContext for raw audio processing
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode to capture raw PCM data
      // Buffer size of 4096 is a good balance between latency and efficiency
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      recordedChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the data to avoid reference issues
        recordedChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('WAV recording started:', {
        sampleRate: audioContext.sampleRate,
        bufferSize: 4096,
      });

      setState({
        isRecording: true,
        audioBlob: null,
        error: null,
        stream,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Mikrofonzugriff fehlgeschlagen';
      setState({
        isRecording: false,
        audioBlob: null,
        error: message,
        stream: null,
      });
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const audioContext = audioContextRef.current;
    const processor = processorRef.current;
    const stream = streamRef.current;

    if (!audioContext || !processor || !stream) {
      return null;
    }

    // Disconnect audio nodes
    processor.disconnect();
    audioContext.close();

    // Stop microphone stream
    stream.getTracks().forEach((track) => track.stop());

    // Merge all recorded chunks into single Float32Array
    const totalLength = recordedChunksRef.current.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    );
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of recordedChunksRef.current) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode as WAV
    const wavBlob = encodeWAV(mergedSamples, audioContext.sampleRate);

    const durationSeconds = mergedSamples.length / audioContext.sampleRate;

    console.log('WAV recording stopped:', {
      chunks: recordedChunksRef.current.length,
      samples: mergedSamples.length,
      duration: durationSeconds,
      size: wavBlob.size,
    });

    // Check minimum duration (0.5 seconds) to avoid Whisper hallucinations
    if (durationSeconds < 0.5) {
      console.warn('Recording too short:', durationSeconds, 'seconds');
      
      // Stop microphone stream
      stream.getTracks().forEach((track) => track.stop());
      
      setState({
        isRecording: false,
        audioBlob: null,
        error: 'Aufnahme zu kurz. Bitte mindestens 0,5 Sekunden sprechen.',
        stream: null,
      });

      // Clean up refs
      audioContextRef.current = null;
      processorRef.current = null;
      streamRef.current = null;
      recordedChunksRef.current = [];

      return null;
    }

    setState({
      isRecording: false,
      audioBlob: wavBlob,
      error: null,
      stream: null,
    });

    // Clean up refs
    audioContextRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    recordedChunksRef.current = [];

    return wavBlob;
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording: state.isRecording,
    error: state.error,
    stream: state.stream,
  };
};
