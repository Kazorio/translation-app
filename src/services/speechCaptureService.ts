import type { LanguageOption, SpeakerRole } from '@/types/conversation';

export interface SpeechCaptureRequest {
  speaker: SpeakerRole;
  language: LanguageOption;
  audioBlob?: Blob;
}

export interface SpeechCaptureResult {
  transcript: string;
  durationMs: number;
}

/**
 * Transcribes audio using OpenAI Whisper API via Next.js API route.
 */
export const captureUtterance = async (
  request: SpeechCaptureRequest,
): Promise<SpeechCaptureResult> => {
  const startTime = Date.now();

  if (!request.audioBlob) {
    throw new Error(
      'Keine Audiodaten vorhanden. Bitte halte den Mikrofon-Button gedrückt.',
    );
  }

  try {
    // Determine file extension from blob type
    const mimeType = request.audioBlob.type;
    let extension = 'webm';
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    else if (mimeType.includes('ogg')) extension = 'ogg';

    const formData = new FormData();
    formData.append('audio', request.audioBlob, `recording.${extension}`);
    formData.append('language', request.language.code);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription request failed');
    }

    const data = (await response.json()) as { text: string };
    const durationMs = Date.now() - startTime;

    return {
      transcript: data.text,
      durationMs,
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw new Error(
      'Spracherkennung fehlgeschlagen. Bitte versuche es erneut.',
    );
  }
};

