import WatchlistItem from '../models/WatchlistItem.js';
import { dispatchStandardError } from '../utils/responseEnvelope.js';

/**
 * Permitted status progression graph.
 * Represents allowed unidirectional and bidirectional transitions.
 */
const STATUS_TRANSITION_GRAPH = {
  'To Watch': ['Watching', 'Watched'],
  'Watching': ['Watched', 'To Watch'],
  'Watched': [] // Locked terminal state
};

/**
 * Middleware: Guards status transitions based on strict finite state machine rules.
 * Enforces rating requirement when transitioning to 'Watched'.
 */
export const enforceStatusTransitionGuard = async (req, res, next) => {
  const { id } = req.params;
  const { status: targetStatus, rating } = req.body;

  // If status is not being modified, proceed
  if (!targetStatus) {
    return next();
  }

  try {
    const existingRecord = await WatchlistItem.findById(id);
    if (!existingRecord) {
      return dispatchStandardError(res, 404, 'Watchlist entry not found.');
    }

    const currentStatus = existingRecord.status;

    // If identical status, check if trying to set rating illegally
    if (currentStatus === targetStatus) {
      if (currentStatus !== 'Watched' && rating !== undefined && rating !== null) {
        return dispatchStandardError(
          res,
          400,
          `Ratings are prohibited for entries with status "${currentStatus}".`
        );
      }
      return next();
    }

    // Terminal state lock verification
    if (currentStatus === 'Watched') {
      return dispatchStandardError(
        res,
        400,
        'State transition forbidden: Items marked as "Watched" are permanently locked and cannot change status.'
      );
    }

    // Validate graph legality
    const permittedDestinations = STATUS_TRANSITION_GRAPH[currentStatus] || [];
    if (!permittedDestinations.includes(targetStatus)) {
      return dispatchStandardError(
        res,
        400,
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Permitted destinations: ${permittedDestinations.join(', ')}.`
      );
    }

    // Rating rule: Transition to Watched requires rating (1-10)
    if (targetStatus === 'Watched') {
      const parsedRating = Number(rating);
      if (!parsedRating || Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
        return dispatchStandardError(
          res,
          400,
          'A mandatory rating between 1 and 10 is required when marking an item as "Watched".'
        );
      }
    } else if (rating !== undefined && rating !== null) {
      return dispatchStandardError(
        res,
        400,
        `Cannot assign rating when transitioning to "${targetStatus}". Ratings apply only to "Watched" items.`
      );
    }

    // Attach existing entity to req for downstream controller optimization
    req.targetEntity = existingRecord;
    next();
  } catch (lookupError) {
    return dispatchStandardError(res, 500, 'State transition validation error.', lookupError.message);
  }
};

/**
 * Middleware: Guards deletion policy.
 * Deletion rules: Block deletion of items with status "Watching" (HTTP 400).
 */
export const enforceDeletionGuard = async (req, res, next) => {
  const { id } = req.params;

  try {
    const candidateItem = await WatchlistItem.findById(id).lean();
    if (!candidateItem) {
      return dispatchStandardError(res, 404, 'Target movie entry not found for deletion.');
    }

    if (candidateItem.status === 'Watching') {
      return dispatchStandardError(
        res,
        400,
        'Active screening in progress: Movies currently in "Watching" status cannot be deleted.'
      );
    }

    req.candidateEntity = candidateItem;
    next();
  } catch (err) {
    return dispatchStandardError(res, 500, 'Deletion guard verification error.', err.message);
  }
};
