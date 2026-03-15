import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type AnnotationType = 'misspelled' | 'casing';

interface SpellAnnotation {
  start: number;
  end: number;
  type: AnnotationType;
  suggestion: string;
}

interface WordToken {
  text: string;
  start: number;
  end: number;
}

interface AlignmentPair {
  original: WordToken | null;
  corrected: WordToken | null;
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function normalizeWord(word: string): string {
  return word.toLocaleLowerCase('de');
}

function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[\p{L}\p{M}][\p{L}\p{M}\p{Pd}'’]*/gu;

  for (const match of text.matchAll(regex)) {
    const token = match[0];
    const start = match.index ?? -1;
    if (start < 0) {
      continue;
    }

    tokens.push({
      text: token,
      start,
      end: start + token.length,
    });
  }

  return tokens;
}

function substitutionCost(original: string, corrected: string): number {
  return normalizeWord(original) === normalizeWord(corrected) ? 0 : 1;
}

function alignTokens(originalTokens: WordToken[], correctedTokens: WordToken[]): AlignmentPair[] {
  const m = originalTokens.length;
  const n = correctedTokens.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    dp[i][0] = i;
  }

  for (let j = 1; j <= n; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const deleteCost = dp[i - 1][j] + 1;
      const insertCost = dp[i][j - 1] + 1;
      const replaceCost =
        dp[i - 1][j - 1] + substitutionCost(originalTokens[i - 1].text, correctedTokens[j - 1].text);

      dp[i][j] = Math.min(deleteCost, insertCost, replaceCost);
    }
  }

  const aligned: AlignmentPair[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      dp[i][j] ===
        dp[i - 1][j - 1] + substitutionCost(originalTokens[i - 1].text, correctedTokens[j - 1].text)
    ) {
      aligned.push({
        original: originalTokens[i - 1],
        corrected: correctedTokens[j - 1],
      });
      i -= 1;
      j -= 1;
      continue;
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      aligned.push({
        original: originalTokens[i - 1],
        corrected: null,
      });
      i -= 1;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      aligned.push({
        original: null,
        corrected: correctedTokens[j - 1],
      });
      j -= 1;
      continue;
    }

    break;
  }

  return aligned.reverse();
}

function buildAnnotations(originalText: string, correctedText: string): SpellAnnotation[] {
  const originalTokens = tokenizeWords(originalText);
  const correctedTokens = tokenizeWords(correctedText);
  const aligned = alignTokens(originalTokens, correctedTokens);

  const annotations: SpellAnnotation[] = [];

  aligned.forEach((pair) => {
    const original = pair.original;
    const corrected = pair.corrected;

    if (!original || !corrected) {
      return;
    }

    if (original.text === corrected.text) {
      return;
    }

    const type: AnnotationType =
      normalizeWord(original.text) === normalizeWord(corrected.text) ? 'casing' : 'misspelled';

    annotations.push({
      start: original.start,
      end: original.end,
      type,
      suggestion: corrected.text,
    });
  });

  return annotations;
}

function sanitizeCorrectedText(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const cleaned = value
    .trim()
    .replace(/^```(?:text|txt)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  return cleaned || fallback;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const openai = getOpenAIClient();
  const spellcheckModel =
    process.env.OPENAI_SPELLCHECK_MODEL ?? process.env.OPENAI_TRANSLATE_MODEL ?? 'gpt-4.1-mini';

  try {
    const { text, language } = (await request.json()) as {
      text: string;
      language?: string;
    };

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ annotations: [] });
    }

    if ((language ?? 'de') !== 'de') {
      return NextResponse.json({ annotations: [] });
    }

    const response = await openai.chat.completions.create({
      model: spellcheckModel,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein deutscher Rechtschreibkorrektor. Korrigiere NUR Rechtschreibung und Groß/Kleinschreibung im Satz. Verändere Bedeutung, Stil, Grammatik und Wortwahl nicht unnötig. Antworte ausschließlich mit dem vollständig korrigierten Satz, ohne Erklärungen, ohne Anführungszeichen, ohne Markdown.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 500,
    });

    const correctedText = sanitizeCorrectedText(response.choices[0]?.message?.content, text);
    const annotations = buildAnnotations(text, correctedText);

    return NextResponse.json({ annotations, correctedText });
  } catch (error) {
    console.error('Spellcheck API error:', error);
    return NextResponse.json({ annotations: [] }, { status: 200 });
  }
}
