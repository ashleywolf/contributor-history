'use client';

import React, { useState, useCallback } from 'react';
import { isValidRepo } from '@/lib/url';
import { RepoEntry } from '@/lib/types';

interface Props {
  repos: RepoEntry[];
  onAddRepo: (repo: string) => void;
  onRemoveRepo: (repo: string) => void;
  onToggleRepo: (repo: string) => void;
  loading: Set<string>;
  errors: Map<string, string>;
  colors: Map<string, string>;
}

export default function RepoInput({
  repos,
  onAddRepo,
  onRemoveRepo,
  onToggleRepo,
  loading,
  errors,
  colors,
}: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const repo = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
      if (!repo) return;

      if (!isValidRepo(repo)) {
        setError('Use format: owner/repo (e.g. facebook/react)');
        return;
      }

      if (repos.some((r) => r.repo === repo)) {
        setError('Repo already added');
        return;
      }

      setError('');
      setInput('');
      onAddRepo(repo);
    },
    [input, repos, onAddRepo],
  );

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] text-sm">🔍</span>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="owner/repo or paste a GitHub URL"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm transition-shadow"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          />
        </div>
        <button
          type="submit"
          className="btn-glow px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-all duration-200"
          style={{ boxShadow: '0 2px 8px var(--color-glow)' }}
        >
          Add
        </button>
      </form>

      {error && <p className="mt-2 text-red-500 text-sm animate-fade-up">{error}</p>}

      {repos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {repos.map((r) => {
            const color = colors.get(r.repo) ?? '#6366f1';
            const isLoading = loading.has(r.repo);
            const repoError = errors.get(r.repo);

            return (
              <div
                key={r.repo}
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm border transition-all duration-200 cursor-default"
                style={{
                  borderColor: r.visible ? color : 'var(--color-border)',
                  opacity: r.visible ? 1 : 0.45,
                  backgroundColor: r.visible ? `${color}12` : 'transparent',
                  boxShadow: r.visible ? `0 1px 4px ${color}20` : 'none',
                }}
              >
                {isLoading ? (
                  <span
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${color}40`, borderTopColor: 'transparent' }}
                  />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.visible ? color : 'var(--color-muted)' }} />
                )}
                <button
                  onClick={() => onToggleRepo(r.repo)}
                  className="font-medium hover:underline transition-colors"
                  style={{ color: r.visible ? color : 'var(--color-muted)' }}
                  title={r.visible ? 'Click to hide from chart' : 'Click to show on chart'}
                >
                  {r.repo}
                </button>
                {repoError && (
                  <span className="text-red-500 text-xs cursor-help" title={repoError}>
                    ⚠️
                  </span>
                )}
                <button
                  onClick={() => onRemoveRepo(r.repo)}
                  className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-white hover:bg-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100 text-xs"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
