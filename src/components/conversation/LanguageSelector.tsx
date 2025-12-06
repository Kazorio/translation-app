'use client';

import type { JSX } from 'react';
import type { LanguageOption } from '@/types/conversation';

interface Props {
  languages: LanguageOption[];
  selected: LanguageOption | null;
  onChange: (language: LanguageOption) => void;
}

export const LanguageSelector = ({ languages, selected, onChange }: Props): JSX.Element => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
        Meine Sprache:
      </label>
      <select
        value={selected?.code || ''}
        onChange={(e) => {
          const lang = languages.find((l) => l.code === e.target.value);
          if (lang) onChange(lang);
        }}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: selected ? '1px solid #d1d5db' : '2px solid #ef4444',
          borderRadius: '8px',
          backgroundColor: selected ? 'white' : '#fef2f2',
          cursor: 'pointer',
          outline: 'none',
          color: selected ? '#111827' : '#991b1b',
        }}
      >
        <option value="" disabled>
          -- Bitte wählen --
        </option>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      {!selected && (
        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
          ⚠️ Sprache erforderlich
        </div>
      )}
    </div>
  );
};
