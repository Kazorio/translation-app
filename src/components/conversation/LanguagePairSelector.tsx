'use client';

import type { ChangeEvent, JSX } from 'react';
import type { LanguageOption, LanguagePair } from '@/types/conversation';
import { isLanguageOption } from '@/lib/validation/languages';

interface Props {
  languages: LanguageOption[];
  pair: LanguagePair;
  onChange: (pair: LanguagePair) => void;
}

export const LanguagePairSelector = ({
  languages,
  pair,
  onChange,
}: Props): JSX.Element => {
  const handleChange =
    (role: 'self' | 'partner') => (event: ChangeEvent<HTMLSelectElement>) => {
      const option = languages.find((language) => language.code === event.target.value);
      if (!isLanguageOption(option)) return;
      onChange({ ...pair, [role]: option });
    };

  return (
    <section className="language-pair-selector">
      <header>
        <p className="eyebrow">Sprachen</p>
        <h2>Wer spricht welche Sprache?</h2>
      </header>
      <div className="language-row">
        <label>
          <span>Ich spreche</span>
          <select value={pair.self.code} onChange={handleChange('self')}>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Mein Gegenüber</span>
          <select value={pair.partner.code} onChange={handleChange('partner')}>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
};
