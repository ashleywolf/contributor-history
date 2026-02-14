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
      if (data && typeof data === 'object' && Object.keys(data).length === 0) {
        onRetry?.(attempt + 1);
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw new GitHubAPIError('Unexpected response format', 200, repo);
    }

    if (response.status === 202) {
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

/** Minimal contributor info from the paginated /contributors endpoint. */
export interface ContributorSummary {
  login: string;
  contributions: number;
}

/**
 * Fetch ALL contributors via the paginated /contributors endpoint.
 * Returns them sorted by contributions descending (GitHub's default).
 * Much more accurate than /stats/contributors which caps at 100.
 */
export async function fetchAllContributors(
  repo: string,
): Promise<ContributorSummary[]> {
  const headers = getHeaders();
  const all: ContributorSummary[] = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/repos/${repo}/contributors?per_page=100&anon=true&page=${page}`;
    const response = await fetch(url, { headers });

    if (response.status === 403) {
      // Rate limited — return what we have so far
      break;
    }
    if (response.status !== 200) break;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    all.push(...data.map((c: any) => ({ login: c.login, contributions: c.contributions })));
    page++;

    // Safety cap to avoid burning all rate limit
    if (page > 50) break;
  }

  return all;
}
