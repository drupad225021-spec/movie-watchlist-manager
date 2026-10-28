import { Router } from 'express';
import {
  createWatchlistItem,
  fetchWatchlistCatalog,
  getRecommendedNextWatch,
  updateWatchlistDetails,
  transitionWatchlistStatus,
  updateWatchedItemRating,
  deleteWatchlistItem,
  fetchWatchlistAnalytics
} from '../controllers/watchlistController.js';
import {
  validateWatchlistCreation,
  validateWatchlistUpdate
} from '../middleware/watchlistValidator.js';
import {
  enforceStatusTransitionGuard,
  enforceDeletionGuard
} from '../middleware/statusGuard.js';

const watchlistRouter = Router();

// Specialized aggregations and recommendation endpoints
watchlistRouter.get('/analytics', fetchWatchlistAnalytics);
watchlistRouter.get('/recommend-next', getRecommendedNextWatch);

// Base collection operations
watchlistRouter.route('/')
  .get(fetchWatchlistCatalog)
  .post(validateWatchlistCreation, createWatchlistItem);

// Specific document operations
watchlistRouter.route('/:id')
  .put(validateWatchlistUpdate, updateWatchlistDetails)
  .delete(enforceDeletionGuard, deleteWatchlistItem);

// Granular status and rating workflow mutations
watchlistRouter.patch('/:id/status', enforceStatusTransitionGuard, transitionWatchlistStatus);
watchlistRouter.patch('/:id/rating', updateWatchedItemRating);

export default watchlistRouter;
