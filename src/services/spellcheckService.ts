export type SpellAnnotationType = 'misspelled' | 'casing';

export interface SpellAnnotation {
  start: number;
  end: number;
  type: SpellAnnotationType;
  suggestion: string;
}

export interface SpellcheckResult {
  annotations: SpellAnnotation[];
}

export const checkSpelling = async (
  text: string,
  language: string,
): Promise<SpellcheckResult> => {
  if (!text.trim() || language !== 'de') {
    return { annotations: [] };
  }

  const response = await fetch('/api/spellcheck', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    return { annotations: [] };
  }

  const data = (await response.json()) as SpellcheckResult;

  if (!Array.isArray(data.annotations)) {
    return { annotations: [] };
  }

  return { annotations: data.annotations };
};
