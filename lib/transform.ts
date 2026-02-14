import { GitHubContributorStats, ContributorDataPoint } from './types';

/**
 * Transform raw GitHub contributor stats into a cumulative unique contributors
 * time series. For each week, we count how many contributors have made their
 * first-ever commit up to that point.
 */
export function transformToContributorSeries(
  stats: GitHubContributorStats[],
): ContributorDataPoint[] {
  if (!stats.length) return [];

  // Find the first week with any commit across all contributors
  const allWeekTimestamps = stats[0]?.weeks.map((w) => w.w) ?? [];
  if (!allWeekTimestamps.length) return [];

  // For each contributor, find the index of their first non-zero commit week
  const firstCommitWeekIndex: number[] = stats.map((contributor) => {
    const idx = contributor.weeks.findIndex((w) => w.c > 0);
    return idx === -1 ? Infinity : idx;
  });

  // Build cumulative series
  const series: ContributorDataPoint[] = [];
  let cumulative = 0;

  for (let weekIdx = 0; weekIdx < allWeekTimestamps.length; weekIdx++) {
    // Count new contributors this week
    const newThisWeek = firstCommitWeekIndex.filter((i) => i === weekIdx).length;
    cumulative += newThisWeek;

    // Only add points where we have at least 1 contributor
    if (cumulative > 0) {
      series.push({
        date: new Date(allWeekTimestamps[weekIdx] * 1000),
        cumulativeContributors: cumulative,
      });
    }
  }

  return series;
}

/**
 * Scale a cumulative series so that the final value matches the real total.
 * The stats API caps at ~100 contributors, but we know the real count from
 * the /contributors endpoint. Scaling preserves the growth curve shape.
 */
export function scaleSeriesToTotal(
  data: ContributorDataPoint[],
  realTotal: number,
): ContributorDataPoint[] {
  if (!data.length || realTotal <= 0) return data;
  const apiTotal = data[data.length - 1].cumulativeContributors;
  if (apiTotal <= 0 || apiTotal >= realTotal) return data;
  const scale = realTotal / apiTotal;
  return data.map((d) => ({
    date: d.date,
    cumulativeContributors: Math.round(d.cumulativeContributors * scale),
  }));
}

/**
 * Normalize a series to start at Day 0 for timeline comparison mode.
 */
export function normalizeToDay0(
  data: ContributorDataPoint[],
): ContributorDataPoint[] {
  if (!data.length) return [];
  const startTime = data[0].date.getTime();
  return data.map((d) => ({
    date: new Date(d.date.getTime() - startTime),
    cumulativeContributors: d.cumulativeContributors,
  }));
}

/**
 * Format a day offset (ms from epoch 0) into a readable duration label.
 */
export function formatDayOffset(date: Date): string {
  const days = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  if (days < 365) return `Day ${days}`;
  const years = (days / 365).toFixed(1);
  return `Year ${years}`;
}
