'use client';

import React, { useState } from 'react';
import { RepoContributorSeries } from '@/lib/types';
import { buildHash } from '@/lib/url';
import { ChartSettings, RepoEntry } from '@/lib/types';

interface Props {
  series: RepoContributorSeries[];
  repos: RepoEntry[];
  settings: ChartSettings;
}

export default function EmbedSnippet({ series, repos, settings }: Props) {
  const [copied, setCopied] = useState(false);

  if (!series.length) return null;

  const hash = buildHash(repos, settings);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://contributor-history.dev/';
  const chartUrl = `${baseUrl}${hash}`;

  const markdownSnippet = `[![Contributor History](${chartUrl})](${chartUrl})`;
  const htmlSnippet = `<a href="${chartUrl}"><img src="${chartUrl}" alt="Contributor History" /></a>`;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <details className="group">
        <summary className="cursor-pointer text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
          🔗 Share & Embed
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-[var(--color-muted)] mb-1">Shareable link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={chartUrl}
                className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] font-mono"
              />
              <button
                onClick={() => handleCopy(chartUrl)}
                className="px-3 py-1.5 rounded-md text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-muted)] mb-1">Markdown (for README)</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] overflow-x-auto whitespace-nowrap block">
                {markdownSnippet}
              </code>
              <button
                onClick={() => handleCopy(markdownSnippet)}
                className="px-3 py-1.5 rounded-md text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-muted)] mb-1">HTML</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] overflow-x-auto whitespace-nowrap block">
                {htmlSnippet}
              </code>
              <button
                onClick={() => handleCopy(htmlSnippet)}
                className="px-3 py-1.5 rounded-md text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
