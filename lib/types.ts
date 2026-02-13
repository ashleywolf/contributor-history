// GitHub API types for /repos/{owner}/{repo}/stats/contributors
export interface GitHubWeek {
  w: number; // Unix timestamp (start of week)
  a: number; // additions
  d: number; // deletions
  c: number; // commits
}

export interface GitHubContributorStats {
  author: {
    login: string;
    id: number;
    avatar_url: string;
  };
  total: number;
  weeks: GitHubWeek[];
}

// Transformed data types
export interface ContributorDataPoint {
  date: Date;
  cumulativeContributors: number;
}

export interface RepoContributorSeries {
  repo: string; // "owner/repo"
  data: ContributorDataPoint[];
  totalContributors: number;
  color: string;
  visible: boolean;
}

export interface RepoEntry {
  repo: string;
  visible: boolean;
}

export interface ChartSettings {
  timelineMode: boolean; // align to Day 0
  xkcdStyle: boolean;
}
