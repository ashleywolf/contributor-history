import { GitHubContributorStats, ContributorDataPoint } from './types';
import { ContributorSummary } from './github';

/**
 * Transform raw GitHub contributor stats into a cumulative unique contributors
 * time series. For each week, we count how many contributors have made their
 * first-ever commit up to that point.
 */
export function transformToContributorSeries(
  stats: GitHubContributorStats[],
): ContributorDataPoint[] {
  if (!stats.length) return [];

  const allWeekTimestamps = stats[0]?.weeks.map((w) => w.w) ?? [];
  if (!allWeekTimestamps.length) return [];

  const firstCommitWeekIndex: number[] = stats.map((contributor) => {
    const idx = contributor.weeks.findIndex((w) => w.c > 0);
    return idx === -1 ? Infinity : idx;
  });

  const series: ContributorDataPoint[] = [];
  let cumulative = 0;

  for (let weekIdx = 0; weekIdx < allWeekTimestamps.length; weekIdx++) {
    const newThisWeek = firstCommitWeekIndex.filter((i) => i === weekIdx).length;
    cumulative += newThisWeek;

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
 * Build an accurate cumulative series by merging:
 * - /stats/contributors (top 100, with weekly first-commit timestamps)
 * - /contributors paginated (all contributors, with commit counts but no dates)
 *
 * For contributors beyond the stats API's top 100, we distribute them across
 * the timeline proportionally — lower commit-count contributors likely joined
 * later, and we use the growth rate from the known data to place them.
 */
export function buildAccurateSeries(
  stats: GitHubContributorStats[],
  allContributors: ContributorSummary[],
  totalCount: number,
): ContributorDataPoint[] {
  const baseSeries = transformToContributorSeries(stats);
  if (!baseSeries.length) return baseSeries;

  const statsCount = baseSeries[baseSeries.length - 1].cumulativeContributors;
  const extra = totalCount - statsCount;

  // If no extra contributors, return as-is
  if (extra <= 0) return baseSeries;

  // The base series shows when each of the top N contributors first appeared.
  // The remaining contributors have fewer commits and likely joined over time.
  // Distribute them proportionally to the growth rate of the known curve:
  // weeks where more known contributors joined also likely saw more unknown ones.

  // Calculate how many new contributors joined each week in the known data
  const weeklyNew: number[] = [];
  weeklyNew.push(baseSeries[0].cumulativeContributors);
  for (let i = 1; i < baseSeries.length; i++) {
    weeklyNew.push(
      baseSeries[i].cumulativeContributors - baseSeries[i - 1].cumulativeContributors,
    );
  }

  const totalKnownNew = weeklyNew.reduce((a, b) => a + b, 0);

  // Distribute extra contributors proportionally
  let distributed = 0;
  const result: ContributorDataPoint[] = [];

  for (let i = 0; i < baseSeries.length; i++) {
    const proportion = weeklyNew[i] / totalKnownNew;
    const extraThisWeek = i === baseSeries.length - 1
      ? extra - distributed // ensure we hit exact total on the last point
      : Math.round(proportion * extra);
    distributed += extraThisWeek;

    const prevCumulative = i > 0 ? result[i - 1].cumulativeContributors : 0;
    result.push({
      date: baseSeries[i].date,
      cumulativeContributors: prevCumulative + weeklyNew[i] + extraThisWeek,
    });
  }

  return result;
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
