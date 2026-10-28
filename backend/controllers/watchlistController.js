import WatchlistItem from '../models/WatchlistItem.js';
import { computeWatchlistAnalytics } from '../services/watchlistAnalyticsService.js';
import { dispatchStandardSuccess, dispatchStandardError } from '../utils/responseEnvelope.js';

const PAGE_SIZE_LIMIT = 6;

/**
 * Controller: Handles movie creation in the watchlist catalog.
 * Responds with HTTP 201 on success.
 */
export const createWatchlistItem = async (req, res) => {
  try {
    const {
      title,
      genre,
      releaseYear,
      runtime,
      platform,
      priority,
      status,
      rating
    } = req.body;

    const newCatalogEntry = new WatchlistItem({
      title: title.trim(),
      genre,
      releaseYear: Number(releaseYear),
      runtime: Number(runtime),
      platform,
      priority: Number(priority),
      status: status || 'To Watch',
      rating: status === 'Watched' ? Number(rating) : null,
      watchedDate: status === 'Watched' ? new Date() : null
    });

    const savedRecord = await newCatalogEntry.save();

    return dispatchStandardSuccess(
      res,
      201,
      `"${savedRecord.title}" successfully indexed into watchlist with identifier ${savedRecord.itemCode}.`,
      savedRecord
    );
  } catch (error) {
    return dispatchStandardError(res, 500, 'Failed to create movie watchlist entry.', error.message);
  }
};

/**
 * Controller: Retrieves filtered, searched, and paginated watchlist entries.
 * Enforces 6 items per page and prioritizes 'To Watch' priority ranking.
 */
export const fetchWatchlistCatalog = async (req, res) => {
  try {
    const { status, genre, search, page } = req.query;

    const queryFilter = {};

    // Filter by status if specified
    if (status && status !== 'All') {
      queryFilter.status = status;
    }

    // Filter by genre if specified
    if (genre && genre !== 'All') {
      queryFilter.genre = genre;
    }

    // Filter by title search (case-insensitive substring)
    if (search && typeof search === 'string' && search.trim()) {
      const sanitizedTerm = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queryFilter.title = { $regex: new RegExp(sanitizedTerm, 'i') };
    }

    const requestedPage = Math.max(1, parseInt(page, 10) || 1);

    // Sorting rule: Items in 'To Watch' status must be sorted by priority descending
    let sortCriteria = {};
    if (status === 'To Watch') {
      sortCriteria = { priority: -1, runtime: 1, createdAt: -1 };
    } else if (status === 'Watched') {
      sortCriteria = { watchedDate: -1, createdAt: -1 };
    } else {
      sortCriteria = { priority: -1, createdAt: -1 };
    }

    const totalCount = await WatchlistItem.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalCount / PAGE_SIZE_LIMIT) || 1;
    const skipOffset = (requestedPage - 1) * PAGE_SIZE_LIMIT;

    const items = await WatchlistItem.find(queryFilter)
      .sort(sortCriteria)
      .skip(skipOffset)
      .limit(PAGE_SIZE_LIMIT)
      .lean();

    return dispatchStandardSuccess(res, 200, 'Watchlist catalog retrieved successfully.', {
      totalPages,
      currentPage: requestedPage,
      totalCount,
      items
    });
  } catch (err) {
    return dispatchStandardError(res, 500, 'Failed to retrieve watchlist entries.', err.message);
  }
};

/**
 * Controller: Intelligent Recommendation Algorithm ("Watch Next").
 * Finds the highest priority 'To Watch' movie, resolving ties with shortest runtime.
 * Returns HTTP 404 if no item satisfies criteria.
 */
export const getRecommendedNextWatch = async (req, res) => {
  try {
    const recommendedMovie = await WatchlistItem.findOne({ status: 'To Watch' })
      .sort({ priority: -1, runtime: 1, createdAt: 1 })
      .lean();

    if (!recommendedMovie) {
      return dispatchStandardError(
        res,
        404,
        'No eligible movie found in your "To Watch" queue for next screening recommendation.',
        null
      );
    }

    return dispatchStandardSuccess(
      res,
      200,
      `Next screening recommendation: "${recommendedMovie.title}" (Priority ${recommendedMovie.priority}, ${recommendedMovie.runtime} mins).`,
      recommendedMovie
    );
  } catch (error) {
    return dispatchStandardError(res, 500, 'Failed to compute next recommendation.', error.message);
  }
};

/**
 * Controller: Modifies editable fields of a movie item.
 * Permitted: title, genre, runtime, platform, priority.
 * releaseYear and itemCode are locked.
 */
export const updateWatchlistDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, genre, runtime, platform, priority } = req.body;

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (genre !== undefined) updatePayload.genre = genre;
    if (runtime !== undefined) updatePayload.runtime = Number(runtime);
    if (platform !== undefined) updatePayload.platform = platform;
    if (priority !== undefined) updatePayload.priority = Number(priority);

    const updatedDocument = await WatchlistItem.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedDocument) {
      return dispatchStandardError(res, 404, 'Watchlist entry not found.');
    }

    return dispatchStandardSuccess(
      res,
      200,
      `Movie details for "${updatedDocument.title}" successfully updated.`,
      updatedDocument
    );
  } catch (err) {
    return dispatchStandardError(res, 500, 'Failed to update movie details.', err.message);
  }
};

/**
 * Controller: State transition handler.
 * Transitions status according to FSM rules validated by statusGuard.
 */
export const transitionWatchlistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: targetStatus, rating } = req.body;

    const existingEntity = req.targetEntity || (await WatchlistItem.findById(id));
    if (!existingEntity) {
      return dispatchStandardError(res, 404, 'Watchlist record not found.');
    }

    existingEntity.status = targetStatus;

    if (targetStatus === 'Watched') {
      existingEntity.rating = Number(rating);
      existingEntity.watchedDate = new Date();
    }

    await existingEntity.save();

    return dispatchStandardSuccess(
      res,
      200,
      `Status successfully changed to "${targetStatus}" for "${existingEntity.title}".`,
      existingEntity
    );
  } catch (statusErr) {
    return dispatchStandardError(res, 500, 'Failed to transition movie status.', statusErr.message);
  }
};

/**
 * Controller: Modifies user rating for items that are already marked 'Watched'.
 * Rejects with HTTP 400 if item is not in 'Watched' status.
 */
export const updateWatchedItemRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    const parsedRating = Number(rating);
    if (!parsedRating || Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
      return dispatchStandardError(res, 400, 'Rating must be a numeric score between 1 and 10.');
    }

    const targetItem = await WatchlistItem.findById(id);
    if (!targetItem) {
      return dispatchStandardError(res, 404, 'Watchlist record not found.');
    }

    if (targetItem.status !== 'Watched') {
      return dispatchStandardError(
        res,
        400,
        `Ratings can only be updated for movies in "Watched" status. Current status is "${targetItem.status}".`
      );
    }

    targetItem.rating = parsedRating;
    await targetItem.save();

    return dispatchStandardSuccess(
      res,
      200,
      `Rating for "${targetItem.title}" updated to ${parsedRating}/10.`,
      targetItem
    );
  } catch (ratingErr) {
    return dispatchStandardError(res, 500, 'Failed to update rating.', ratingErr.message);
  }
};

/**
 * Controller: Deletes a movie entry.
 * Enforces status check: Deletion of 'Watching' items is blocked by middleware.
 */
export const deleteWatchlistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const removedEntry = await WatchlistItem.findByIdAndDelete(id);

    if (!removedEntry) {
      return dispatchStandardError(res, 404, 'Watchlist record not found.');
    }

    return dispatchStandardSuccess(
      res,
      200,
      `"${removedEntry.title}" has been successfully removed from your watchlist.`,
      { id: removedEntry._id, itemCode: removedEntry.itemCode }
    );
  } catch (deleteErr) {
    return dispatchStandardError(res, 500, 'Failed to delete watchlist record.', deleteErr.message);
  }
};

/**
 * Controller: Dispatches computed watchlist analytics.
 */
export const fetchWatchlistAnalytics = async (req, res) => {
  try {
    const aggregatedMetrics = await computeWatchlistAnalytics();
    return dispatchStandardSuccess(
      res,
      200,
      'Watchlist analytics computed successfully.',
      aggregatedMetrics
    );
  } catch (metricsErr) {
    return dispatchStandardError(res, 500, 'Failed to compute watchlist analytics.', metricsErr.message);
  }
};
