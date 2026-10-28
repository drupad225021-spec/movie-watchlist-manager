import WatchlistItem from '../models/WatchlistItem.js';

/**
 * Aggregation Service for CinePulse Watchlist Analytics
 * Computes status distributions, total watched screening hours,
 * average user ratings, and top-performing genres.
 */

/**
 * Computes comprehensive aggregate metrics for the watchlist.
 * @returns {Promise<{
 *   statusBreakdown: { 'To Watch': number, 'Watching': number, 'Watched': number },
 *   totalWatchedHours: number,
 *   averageWatchedRating: number,
 *   topWatchedGenre: string
 * }>}
 */
export const computeWatchlistAnalytics = async () => {
  // Aggregate status breakdown
  const statusCountsRaw = await WatchlistItem.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusBreakdown = {
    'To Watch': 0,
    'Watching': 0,
    'Watched': 0
  };

  statusCountsRaw.forEach((entry) => {
    if (entry._id && entry._id in statusBreakdown) {
      statusBreakdown[entry._id] = entry.count;
    }
  });

  // Aggregate metrics for 'Watched' entries: total runtime, average rating
  const watchedMetricsPipeline = await WatchlistItem.aggregate([
    {
      $match: { status: 'Watched' }
    },
    {
      $group: {
        _id: null,
        totalRuntimeMinutes: { $sum: '$runtime' },
        avgRating: { $avg: '$rating' },
        totalWatchedCount: { $sum: 1 }
      }
    }
  ]);

  let totalWatchedHours = 0;
  let averageWatchedRating = 0;

  if (watchedMetricsPipeline.length > 0) {
    const rawMinutes = watchedMetricsPipeline[0].totalRuntimeMinutes || 0;
    // Round hours to 1 decimal place
    totalWatchedHours = Math.round((rawMinutes / 60) * 10) / 10;

    const rawAvgRating = watchedMetricsPipeline[0].avgRating || 0;
    // Round rating to 1 decimal place
    averageWatchedRating = Math.round(rawAvgRating * 10) / 10;
  }

  // Aggregate top-performing genre among 'Watched' items
  // Evaluated primarily by count of watched titles, secondarily by highest average rating
  const genreRankingPipeline = await WatchlistItem.aggregate([
    {
      $match: { status: 'Watched' }
    },
    {
      $group: {
        _id: '$genre',
        watchedCount: { $sum: 1 },
        meanRating: { $avg: '$rating' }
      }
    },
    {
      $sort: {
        watchedCount: -1,
        meanRating: -1
      }
    },
    {
      $limit: 1
    }
  ]);

  const topWatchedGenre =
    genreRankingPipeline.length > 0 && genreRankingPipeline[0]._id
      ? genreRankingPipeline[0]._id
      : 'N/A';

  return {
    statusBreakdown,
    totalWatchedHours,
    averageWatchedRating,
    topWatchedGenre
  };
};
