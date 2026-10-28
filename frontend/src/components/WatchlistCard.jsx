import React, { useState } from 'react';
import {
  Clock,
  Tv,
  Calendar,
  Lock,
  Star,
  Trash2,
  Edit3,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight
} from 'lucide-react';

/**
 * Permitted status transitions map corresponding to backend FSM rules
 */
const PERMITTED_NEXT_TRANSITIONS = {
  'To Watch': ['Watching', 'Watched'],
  'Watching': ['Watched', 'To Watch'],
  'Watched': [] // Locked terminal state
};

export default function WatchlistCard({
  movie,
  onInitiateEdit,
  onRequestDelete,
  onTransitionStatus,
  onUpdateRating
}) {
  const [selectedNextStatus, setSelectedNextStatus] = useState('');
  const [ratingTransitionModalOpen, setRatingTransitionModalOpen] = useState(false);
  const [targetStatusToConfirm, setTargetStatusToConfirm] = useState(null);
  const [newRatingScore, setNewRatingScore] = useState(8);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [ratingEditScore, setRatingEditScore] = useState(movie.rating || 7);

  const allowedNextStatuses = PERMITTED_NEXT_TRANSITIONS[movie.status] || [];
  const isTerminalWatched = movie.status === 'Watched';
  const isActivelyWatching = movie.status === 'Watching';

  // Handle transition dropdown selection
  const handleStatusSelectChange = (e) => {
    const nextStatus = e.target.value;
    if (!nextStatus) return;

    if (nextStatus === 'Watched') {
      // Require rating before transitioning
      setTargetStatusToConfirm('Watched');
      setRatingTransitionModalOpen(true);
    } else {
      onTransitionStatus(movie._id, nextStatus);
    }
    setSelectedNextStatus('');
  };

  const confirmWatchedTransition = () => {
    onTransitionStatus(movie._id, 'Watched', newRatingScore);
    setRatingTransitionModalOpen(false);
  };

  const submitRatingRevision = (e) => {
    e.preventDefault();
    onUpdateRating(movie._id, ratingEditScore);
    setIsEditingRating(false);
  };

  // Format watched date if present
  const formattedWatchedDate = movie.watchedDate
    ? new Date(movie.watchedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <article className={`watchlist-card status-${movie.status.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Top Bar: ItemCode & Status Indicator */}
      <div className="card-top-bar">
        <span className="item-code-badge" title="Automated System Code">
          {movie.itemCode}
        </span>

        <div className="status-indicator-badge">
          {movie.status === 'Watched' && <CheckCircle2 size={13} className="text-emerald" />}
          {movie.status === 'Watching' && <PlayCircle size={13} className="text-amber" />}
          {movie.status === 'To Watch' && <Clock size={13} className="text-cyan" />}
          <span>{movie.status}</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="card-content">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>

        <div className="movie-meta-chips">
          <span className="meta-chip chip-genre">{movie.genre}</span>
          <span className="meta-chip chip-year">{movie.releaseYear}</span>
          <span className="meta-chip chip-runtime">
            <Clock size={12} /> {movie.runtime}m
          </span>
          <span className="meta-chip chip-platform">
            <Tv size={12} /> {movie.platform}
          </span>
        </div>

        {/* Priority Tier Visualizer */}
        <div className="priority-meter-row">
          <span className="priority-label">
            <Flame size={13} className="flame-icon" /> Priority:
          </span>
          <div className="priority-dots" title={`Priority ${movie.priority} of 5`}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <span
                key={lvl}
                className={`priority-dot ${lvl <= movie.priority ? 'active' : ''}`}
              />
            ))}
          </div>
          <span className="priority-num">Tier {movie.priority}</span>
        </div>

        {/* Watched State Info / Rating Display */}
        {isTerminalWatched && (
          <div className="watched-summary-block">
            <div className="rating-row">
              <span className="score-label">Rating:</span>
              <div className="rating-badge">
                <Star size={14} className="star-icon-gold" />
                <strong>{movie.rating ? `${movie.rating}/10` : 'Not Rated'}</strong>
              </div>
              <button
                type="button"
                className="btn-link-rating"
                onClick={() => setIsEditingRating(!isEditingRating)}
                title="Modify rating"
              >
                {isEditingRating ? 'Cancel' : 'Change'}
              </button>
            </div>

            {isEditingRating && (
              <form onSubmit={submitRatingRevision} className="inline-rating-form">
                <label htmlFor={`rate-${movie._id}`}>Score (1-10):</label>
                <input
                  id={`rate-${movie._id}`}
                  type="number"
                  min="1"
                  max="10"
                  value={ratingEditScore}
                  onChange={(e) => setRatingEditScore(Number(e.target.value))}
                  required
                />
                <button type="submit" className="btn-small-save">Save</button>
              </form>
            )}

            {formattedWatchedDate && (
              <div className="watched-date-text">
                <Calendar size={12} /> Completed: {formattedWatchedDate}
              </div>
            )}
          </div>
        )}
      </div>

      {/* State Machine Transition Selector */}
      <div className="state-machine-section">
        {isTerminalWatched ? (
          <div className="locked-state-indicator" title="Permanent terminal state">
            <Lock size={13} />
            <span>State Locked (Archived)</span>
          </div>
        ) : (
          <div className="transition-control">
            <label htmlFor={`transition-${movie._id}`} className="transition-label">
              Next Action:
            </label>
            <div className="select-wrapper">
              <select
                id={`transition-${movie._id}`}
                className="status-transition-select"
                value={selectedNextStatus}
                onChange={handleStatusSelectChange}
              >
                <option value="">Move to...</option>
                {allowedNextStatuses.map((nextSt) => (
                  <option key={nextSt} value={nextSt}>
                    ➔ {nextSt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <footer className="card-actions-footer">
        <button
          type="button"
          className="card-action-btn edit-btn"
          onClick={() => onInitiateEdit(movie)}
          title="Edit movie properties"
        >
          <Edit3 size={15} /> Edit
        </button>

        <button
          type="button"
          className={`card-action-btn delete-btn ${isActivelyWatching ? 'btn-disabled' : ''}`}
          onClick={() => onRequestDelete(movie)}
          disabled={isActivelyWatching}
          title={
            isActivelyWatching
              ? 'Active screening: "Watching" items cannot be deleted'
              : 'Remove from watchlist'
          }
        >
          <Trash2 size={15} /> Delete
        </button>
      </footer>

      {/* Transition to Watched Mandatory Rating Dialog */}
      {ratingTransitionModalOpen && (
        <div className="mini-modal-overlay">
          <div className="mini-modal-card">
            <h4>Mandatory Rating for Watched Title</h4>
            <p className="mini-modal-desc">
              Rate <strong>{movie.title}</strong> before marking it as complete.
            </p>
            <div className="score-picker-group">
              <label htmlFor={`score-${movie._id}`}>Your Rating (1 to 10):</label>
              <div className="slider-score-row">
                <input
                  id={`score-${movie._id}`}
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={newRatingScore}
                  onChange={(e) => setNewRatingScore(Number(e.target.value))}
                />
                <span className="numeric-badge">{newRatingScore}/10</span>
              </div>
            </div>
            <div className="mini-modal-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRatingTransitionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmWatchedTransition}
              >
                Mark as Watched
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
