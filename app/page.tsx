'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ContributorChart from '@/components/ContributorChart';
import RepoInput from '@/components/RepoInput';
import Toolbar from '@/components/Toolbar';
import EmbedSnippet from '@/components/EmbedSnippet';
import { fetchContributorStats, fetchTotalContributorCount } from '@/lib/github';
import { transformToContributorSeries } from '@/lib/transform';
import { parseHash, buildHash } from '@/lib/url';
import { getColor } from '@/lib/colors';
import { RepoEntry, RepoContributorSeries, ChartSettings } from '@/lib/types';
import html2canvas from 'html2canvas';

type Theme = 'light' | 'dark' | 'system';

export default function Home() {
  const [repos, setRepos] = useState<RepoEntry[]>([]);
  const [series, setSeries] = useState<RepoContributorSeries[]>([]);
  const [settings, setSettings] = useState<ChartSettings>({ timelineMode: false, xkcdStyle: false });
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [theme, setTheme] = useState<Theme>('system');
  const [initialized, setInitialized] = useState(false);
  const colorMap = useRef(new Map<string, string>());

  // Assign stable colors to repos
  const getRepoColor = useCallback((repo: string) => {
    if (!colorMap.current.has(repo)) {
      colorMap.current.set(repo, getColor(colorMap.current.size));
    }
    return colorMap.current.get(repo)!;
  }, []);

  // Fetch data for a single repo
  const fetchRepo = useCallback(
    async (repo: string) => {
      setLoading((prev) => new Set(prev).add(repo));
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(repo);
        return next;
      });

      try {
        const stats = await fetchContributorStats(repo);
        const data = transformToContributorSeries(stats);
        const color = getRepoColor(repo);

        // Get real total from /contributors endpoint (stats API caps at 100)
        const realTotal = await fetchTotalContributorCount(repo);

        setSeries((prev) => {
          const filtered = prev.filter((s) => s.repo !== repo);
          return [
            ...filtered,
            { repo, data, totalContributors: realTotal ?? stats.length, color, visible: true },
          ].sort((a, b) => a.repo.localeCompare(b.repo));
        });
      } catch (err: any) {
        setErrors((prev) => new Map(prev).set(repo, err.message));
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(repo);
          return next;
        });
      }
    },
    [getRepoColor],
  );

  // Initialize from URL hash
  useEffect(() => {
    const { repos: hashRepos, settings: hashSettings } = parseHash(window.location.hash);
    if (hashRepos.length) {
      setRepos(hashRepos);
      hashRepos.forEach((r) => fetchRepo(r.repo));
    }
    if (hashSettings.timelineMode) setSettings((s) => ({ ...s, timelineMode: true }));
    if (hashSettings.xkcdStyle) setSettings((s) => ({ ...s, xkcdStyle: true }));
    setInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL hash when repos or settings change
  useEffect(() => {
    if (!initialized) return;
    const hash = buildHash(repos, settings);
    window.history.replaceState(null, '', hash || window.location.pathname);
  }, [repos, settings, initialized]);

  // Handle hashchange (back/forward)
  useEffect(() => {
    const handleHash = () => {
      const { repos: hashRepos, settings: hashSettings } = parseHash(window.location.hash);
      setRepos(hashRepos);
      setSettings({
        timelineMode: hashSettings.timelineMode ?? false,
        xkcdStyle: hashSettings.xkcdStyle ?? false,
      });
      // Fetch any repos we don't have data for
      hashRepos.forEach((r) => {
        if (!series.some((s) => s.repo === r.repo)) {
          fetchRepo(r.repo);
        }
      });
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [series, fetchRepo]);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme !== 'system') root.classList.add(theme);
  }, [theme]);

  const handleAddRepo = useCallback(
    (repo: string) => {
      const color = getRepoColor(repo);
      setRepos((prev) => [...prev, { repo, visible: true }]);
      fetchRepo(repo);
    },
    [fetchRepo, getRepoColor],
  );

  const handleRemoveRepo = useCallback((repo: string) => {
    setRepos((prev) => prev.filter((r) => r.repo !== repo));
    setSeries((prev) => prev.filter((s) => s.repo !== repo));
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(repo);
      return next;
    });
  }, []);

  const handleToggleRepo = useCallback((repo: string) => {
    setRepos((prev) => prev.map((r) => (r.repo === repo ? { ...r, visible: !r.visible } : r)));
    setSeries((prev) => prev.map((s) => (s.repo === repo ? { ...s, visible: !s.visible } : s)));
  }, []);

  const handleDownload = useCallback(async () => {
    const el = document.getElementById('chart-container');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `contributor-history-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // fallback: alert
      alert('Download failed. Try right-clicking the chart instead.');
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  }, []);

  const colorsMap = new Map(repos.map((r) => [r.repo, getRepoColor(r.repo)]));

  const hasData = series.some((s) => s.data.length > 0);

  return (
    <main className="flex flex-col items-center px-4 py-10 md:py-20 gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)] border-opacity-20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
          Open Source
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--color-text)] to-[var(--color-muted)] bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
          Contributor History
        </h1>
        <p className="text-[var(--color-muted)] text-base md:text-lg max-w-lg mx-auto leading-relaxed">
          The missing GitHub contributor growth chart.
          Compare how fast open source projects attract contributors.
        </p>
      </div>

      {/* Repo input */}
      <RepoInput
        repos={repos}
        onAddRepo={handleAddRepo}
        onRemoveRepo={handleRemoveRepo}
        onToggleRepo={handleToggleRepo}
        loading={loading}
        errors={errors}
        colors={colorsMap}
      />

      {/* Toolbar */}
      {repos.length > 0 && (
        <Toolbar
          settings={settings}
          onToggleTimeline={() => setSettings((s) => ({ ...s, timelineMode: !s.timelineMode }))}
          onToggleXkcd={() => setSettings((s) => ({ ...s, xkcdStyle: !s.xkcdStyle }))}
          onDownload={handleDownload}
          onToggleTheme={handleToggleTheme}
          theme={theme}
          hasChart={hasData}
        />
      )}

      {/* Chart */}
      {hasData && <ContributorChart series={series} settings={settings} />}

      {/* Empty state */}
      {!hasData && repos.length === 0 && (
        <div className="text-center text-[var(--color-muted)] mt-4 space-y-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative inline-block">
            <div className="text-7xl" style={{ filter: 'drop-shadow(0 4px 12px var(--color-glow))' }}>📈</div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-[var(--color-text)]">See how projects grow their contributor base</p>
            <p className="text-sm">Add a repo above, or try one of these:</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['kubernetes/kubernetes', 'facebook/react', 'microsoft/vscode', 'vercel/next.js'].map((r) => (
              <button
                key={r}
                onClick={() => handleAddRepo(r)}
                className="btn-glow px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all duration-200"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading.size > 0 && !hasData && (
        <div className="flex flex-col items-center gap-3 text-[var(--color-muted)] animate-fade-up">
          <div className="relative">
            <span className="block w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
          <span className="text-sm">Fetching contributor data…</span>
          <span className="text-xs text-[var(--color-muted)]">GitHub may take a moment to compute stats for new repos</span>
        </div>
      )}

      {/* Embed snippet */}
      {hasData && <EmbedSnippet series={series} repos={repos} settings={settings} />}

      {/* Legend */}
      {hasData && (
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm animate-fade-up">
          {series
            .filter((s) => s.visible)
            .map((s) => (
              <div key={s.repo} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                <span className="text-[var(--color-muted)]">
                  {s.repo.split('/')[1]}:{' '}
                  <strong className="text-[var(--color-text)] font-semibold">{s.totalContributors.toLocaleString()}</strong>{' '}
                  contributors
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-muted)] space-y-1.5 w-full max-w-lg">
        <p>
          Data from{' '}
          <a href="https://docs.github.com/en/rest/metrics/statistics" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)] transition-colors">
            GitHub REST API
          </a>
          {' · '}Contributor counts are approximate
        </p>
        <p>
          Inspired by{' '}
          <a href="https://star-history.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)] transition-colors">
            star-history.com
          </a>
          {' · '}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)] transition-colors">
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
