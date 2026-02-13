import { GitHubContributorStats } from './types';

const API_BASE = 'https://api.github.com';
const MAX_RETRIES = 8;
const RETRY_DELAY_MS = 3000;

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public repo: string,
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export async function fetchContributorStats(
  repo: string,
  token?: string,
  onRetry?: (attempt: number) => void,
): Promise<GitHubContributorStats[]> {
  const url = `${API_BASE}/repos/${repo}/stats/contributors`;
  const headers = getHeaders(token);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status === 200) {
      const data = await response.json();
      if (Array.isArray(data)) return data;
      // GitHub sometimes returns {} when stats aren't ready yet — treat like 202
      if (data && typeof data === 'object' && Object.keys(data).length === 0) {
        onRetry?.(attempt + 1);
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw new GitHubAPIError('Unexpected response format', 200, repo);
    }

    if (response.status === 202) {
      // GitHub is computing stats, retry after delay
      onRetry?.(attempt + 1);
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }

    if (response.status === 403) {
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      const resetTime = rateLimitReset
        ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()
        : 'unknown';
      throw new GitHubAPIError(
        `Rate limited. Resets at ${resetTime}. Add a GitHub token for higher limits.`,
        403,
        repo,
      );
    }

    if (response.status === 404) {
      throw new GitHubAPIError(
        `Repository "${repo}" not found. Check the name and ensure it's public.`,
        404,
        repo,
      );
    }

    throw new GitHubAPIError(
      `GitHub API error: ${response.status} ${response.statusText}`,
      response.status,
      repo,
    );
  }

  throw new GitHubAPIError(
    `GitHub is still computing stats for "${repo}". Try again in a moment.`,
    202,
    repo,
  );
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gh-contributor-history-token');
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('gh-contributor-history-token', token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('gh-contributor-history-token');
}
