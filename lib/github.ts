import { GitHubContributorStats } from './types';

const API_BASE = 'https://api.github.com';
const MAX_RETRIES = 8;
const RETRY_DELAY_MS = 3000;

function getHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github.v3+json',
  };
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
  onRetry?: (attempt: number) => void,
): Promise<GitHubContributorStats[]> {
  const url = `${API_BASE}/repos/${repo}/stats/contributors`;
  const headers = getHeaders();

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
        `Rate limited. Resets at ${resetTime}. Try again later.`,
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

/**
 * Get the real total contributor count using the /contributors endpoint.
 * Uses a HEAD-like request with per_page=1 and parses the Link header.
 */
export async function fetchTotalContributorCount(
  repo: string,
): Promise<number | null> {
  const url = `${API_BASE}/repos/${repo}/contributors?per_page=1&anon=true`;
  const headers = getHeaders();

  try {
    const response = await fetch(url, { headers });
    if (response.status !== 200) return null;

    const link = response.headers.get('link');
    if (!link) {
      // Only one page — count the array
      const data = await response.json();
      return Array.isArray(data) ? data.length : null;
    }

    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}
