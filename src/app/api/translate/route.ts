import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const openai = getOpenAIClient();
  const translateModel = process.env.OPENAI_TRANSLATE_MODEL ?? 'gpt-4.1-mini';
  const rawTemperature = Number(process.env.OPENAI_TRANSLATE_TEMPERATURE ?? '0');
  const translateTemperature = Number.isNaN(rawTemperature) ? 0 : rawTemperature;

  try {
    const { text, sourceLanguage, targetLanguage } = (await request.json()) as {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
    };

    const response = await openai.chat.completions.create({
      model: translateModel,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in ${sourceLanguage} to ${targetLanguage} translation. Translate the user's message accurately and naturally. Return ONLY the translated text, no explanations.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: translateTemperature,
      max_tokens: 500,
    });

    const translatedText = response.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('Empty translation response');
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 },
    );
  }
}
