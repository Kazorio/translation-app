import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const openai = getOpenAIClient();
  try {
    const { text, language } = (await request.json()) as { text: string; language?: string };

    // Map language codes to appropriate voices
    // OpenAI TTS supports all languages with their multilingual voices
    const voiceMap: Record<string, string> = {
      'fa': 'onyx',    // Persian - deeper voice works well
      'ar': 'onyx',    // Arabic
      'zh': 'nova',    // Chinese
      'ja': 'shimmer', // Japanese
      'ko': 'shimmer', // Korean
      'es': 'alloy',   // Spanish
      'fr': 'alloy',   // French
      'de': 'alloy',   // German
      'it': 'alloy',   // Italian
      'pt': 'nova',    // Portuguese
      'ru': 'onyx',    // Russian
      'en': 'alloy',   // English
    };

    const voice = (language && voiceMap[language]) || 'alloy';

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: 1.0,
    });

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
