'use client';

import React from 'react';

interface Props {
  token: string;
  onTokenChange: (token: string) => void;
  onSave: () => void;
  onClear: () => void;
  hasStored: boolean;
}

export default function TokenInput({ token, onTokenChange, onSave, onClear, hasStored }: Props) {
  return (
    <details className="w-full max-w-2xl mx-auto mt-2">
      <summary className="cursor-pointer text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
        🔑 GitHub Token (optional — increases rate limit from 60 to 5,000 req/hr)
      </summary>
      <div className="mt-2 flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="ghp_..."
          className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] font-mono"
        />
        <button
          onClick={onSave}
          className="px-3 py-1.5 rounded-md text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Save
        </button>
        {hasStored && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-md text-xs border border-[var(--color-border)] text-[var(--color-muted)] hover:text-red-500 hover:border-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Token is stored in localStorage only. Create one at{' '}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-primary)]"
        >
          github.com/settings/tokens
        </a>{' '}
        — no scopes needed for public repos.
      </p>
    </details>
  );
}
