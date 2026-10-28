import WatchlistItem, { ALLOWED_GENRES, ALLOWED_PLATFORMS } from '../models/WatchlistItem.js';
import { dispatchStandardError } from '../utils/responseEnvelope.js';

const currentYearBound = new Date().getFullYear();

/**
 * Validates payload parameters when adding a new watchlist item.
 * Enforces field boundaries, duplicate prevention (HTTP 409), and rating constraints.
 */
export const validateWatchlistCreation = async (req, res, next) => {
  const { title, genre, releaseYear, runtime, platform, priority, status, rating } = req.body;

  // Title validation
  if (!title || typeof title !== 'string' || !title.trim()) {
    return dispatchStandardError(res, 400, 'A valid movie title is required.');
  }

  // Genre validation
  if (!genre || !ALLOWED_GENRES.includes(genre)) {
    return dispatchStandardError(
      res,
      400,
      `Invalid genre specified. Permitted genres: ${ALLOWED_GENRES.join(', ')}.`
    );
  }

  // Release year validation: 1950 to current year
  const parsedYear = Number(releaseYear);
  if (!parsedYear || Number.isNaN(parsedYear) || parsedYear < 1950 || parsedYear > currentYearBound) {
    return dispatchStandardError(
      res,
      400,
      `Release year must be a valid number between 1950 and ${currentYearBound}.`
    );
  }

  // Runtime validation: 30 to 300 minutes
  const parsedRuntime = Number(runtime);
  if (!parsedRuntime || Number.isNaN(parsedRuntime) || parsedRuntime < 30 || parsedRuntime > 300) {
    return dispatchStandardError(
      res,
      400,
      'Runtime duration must be between 30 and 300 minutes.'
    );
  }

  // Platform validation
  if (!platform || !ALLOWED_PLATFORMS.includes(platform)) {
    return dispatchStandardError(
      res,
      400,
      `Platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}.`
    );
  }

  // Priority validation: 1 to 5
  const parsedPriority = Number(priority);
  if (!parsedPriority || Number.isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
    return dispatchStandardError(res, 400, 'Priority must be an integer between 1 (lowest) and 5 (highest).');
  }

  // Rating rules on creation
  if (status === 'Watched') {
    const parsedRating = Number(rating);
    if (!parsedRating || Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
      return dispatchStandardError(
        res,
        400,
        'A mandatory rating between 1 and 10 must be provided when adding an item directly as "Watched".'
      );
    }
  } else if (rating !== undefined && rating !== null && rating !== '') {
    return dispatchStandardError(
      res,
      400,
      'Ratings are reserved exclusively for items marked as "Watched".'
    );
  }

  // Strip client-supplied itemCode to strictly preserve auto-generation integrity
  if (req.body.itemCode) {
    delete req.body.itemCode;
  }

  // Duplicate check: case-insensitive title AND releaseYear
  try {
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingConflict = await WatchlistItem.findOne({
      title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') },
      releaseYear: parsedYear
    }).lean();

    if (existingConflict) {
      return dispatchStandardError(
        res,
        409,
        `A movie titled "${title.trim()}" in release year ${parsedYear} already exists in your watchlist.`
      );
    }
  } catch (conflictQueryError) {
    return dispatchStandardError(res, 500, 'Failed to verify unique movie listing.', conflictQueryError.message);
  }

  next();
};

/**
 * Validates update operations on an existing watchlist item.
 * Locks `itemCode` and `releaseYear`, and verifies duplicate conflicts if title changes.
 */
export const validateWatchlistUpdate = async (req, res, next) => {
  const { id } = req.params;
  const updatePayload = req.body;

  // Disallow alteration of itemCode
  if ('itemCode' in updatePayload) {
    return dispatchStandardError(res, 400, 'Item code is immutable and auto-generated.');
  }

  // Disallow alteration of releaseYear
  if ('releaseYear' in updatePayload) {
    return dispatchStandardError(res, 400, 'Release year is locked to preserve catalog integrity and cannot be modified.');
  }

  // If title is updated
  if ('title' in updatePayload) {
    if (typeof updatePayload.title !== 'string' || !updatePayload.title.trim()) {
      return dispatchStandardError(res, 400, 'Title cannot be empty.');
    }
  }

  // If genre is updated
  if ('genre' in updatePayload && !ALLOWED_GENRES.includes(updatePayload.genre)) {
    return dispatchStandardError(res, 400, `Genre must be one of: ${ALLOWED_GENRES.join(', ')}.`);
  }

  // If runtime is updated
  if ('runtime' in updatePayload) {
    const parsedRuntime = Number(updatePayload.runtime);
    if (!parsedRuntime || Number.isNaN(parsedRuntime) || parsedRuntime < 30 || parsedRuntime > 300) {
      return dispatchStandardError(res, 400, 'Runtime duration must be between 30 and 300 minutes.');
    }
  }

  // If platform is updated
  if ('platform' in updatePayload && !ALLOWED_PLATFORMS.includes(updatePayload.platform)) {
    return dispatchStandardError(res, 400, `Platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}.`);
  }

  // If priority is updated
  if ('priority' in updatePayload) {
    const parsedPriority = Number(updatePayload.priority);
    if (!parsedPriority || Number.isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
      return dispatchStandardError(res, 400, 'Priority must be an integer between 1 and 5.');
    }
  }

  // Check duplicate if title is modified
  if (updatePayload.title) {
    try {
      const existingDocument = await WatchlistItem.findById(id).lean();
      if (!existingDocument) {
        return dispatchStandardError(res, 404, 'Target movie entry not found.');
      }

      const escapedTitle = updatePayload.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const conflictMatch = await WatchlistItem.findOne({
        _id: { $ne: id },
        title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') },
        releaseYear: existingDocument.releaseYear
      }).lean();

      if (conflictMatch) {
        return dispatchStandardError(
          res,
          409,
          `A movie titled "${updatePayload.title.trim()}" in release year ${existingDocument.releaseYear} already exists in your watchlist.`
        );
      }
    } catch (err) {
      return dispatchStandardError(res, 500, 'Duplicate check failed during update validation.', err.message);
    }
  }

  next();
};
