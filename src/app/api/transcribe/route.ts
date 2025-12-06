import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Received audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Send WAV file directly to Whisper
    // WAV is universally supported and doesn't need conversion
    // Use prompt to reduce hallucinations (especially for short utterances)
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      prompt: 'This is a short spoken message in a conversation. It may contain numbers, greetings, or brief statements.',
      temperature: 0, // Lower temperature = less creative/hallucination
    });

    console.log('Transcription successful:', response.text);

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Whisper API error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 },
    );
  }
}
