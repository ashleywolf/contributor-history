import { RepoEntry, ChartSettings } from './types';

/**
 * Parse URL hash into repo list and settings.
 * Format: #owner/repo&owner2/repo2&timeline&xkcd
 */
export function parseHash(hash: string): {
  repos: RepoEntry[];
  settings: Partial<ChartSettings>;
} {
  if (!hash || hash === '#') return { repos: [], settings: {} };

  const raw = hash.replace(/^#/, '');
  const parts = raw.split('&').filter(Boolean);

  const repos: RepoEntry[] = [];
  const settings: Partial<ChartSettings> = {};

  for (const part of parts) {
    if (part === 'timeline') {
      settings.timelineMode = true;
    } else if (part === 'xkcd') {
      settings.xkcdStyle = true;
    } else if (part.includes('/')) {
      repos.push({ repo: decodeURIComponent(part), visible: true });
    }
  }

  return { repos, settings };
}

/**
 * Encode repos and settings into a URL hash.
 */
export function buildHash(
  repos: RepoEntry[],
  settings: ChartSettings,
): string {
  const parts: string[] = repos.map((r) => encodeURIComponent(r.repo));
  if (settings.timelineMode) parts.push('timeline');
  if (settings.xkcdStyle) parts.push('xkcd');
  return parts.length ? `#${parts.join('&')}` : '';
}

/**
 * Validate a repo string (owner/repo format).
 */
export function isValidRepo(repo: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo.trim());
}
