import React from 'react';
import { Sparkles, Clock, Tv, Flame, Play, X, Compass, CheckCircle } from 'lucide-react';

/**
 * NextRecommendationModal Component
 * Visual presentation of the smart "Watch Next" algorithm recommendation:
 * Prioritizes highest priority tier, breaking ties with shortest screening runtime.
 */
export default function NextRecommendationModal({
  isOpen,
  onClose,
  movie,
  loading,
  error,
  onStartWatching
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-window recommendation-modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Sparkles className="modal-icon text-amber" size={22} />
            <h2>Algorithm Pick: What to Watch Next</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="recommendation-content">
          {loading && (
            <div className="recommendation-state-box">
              <Compass className="animate-spin text-amber" size={36} />
              <p>Analyzing watchlist queue priorities and runtimes...</p>
            </div>
          )}

          {!loading && error && (
            <div className="recommendation-empty-box">
              <div className="empty-icon-circle">
                <Sparkles size={28} className="text-muted" />
              </div>
              <h3>No Recommended Title Available</h3>
              <p>{error}</p>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Return to Watchlist
              </button>
            </div>
          )}

          {!loading && !error && movie && (
            <div className="recommendation-card">
              <div className="rec-card-hero">
                <span className="rec-badge">
                  <Sparkles size={13} /> Optimal Pick
                </span>
                <span className="rec-code">{movie.itemCode}</span>
              </div>

              <h1 className="rec-title">{movie.title}</h1>

              <div className="rec-chips-row">
                <span className="meta-chip chip-genre">{movie.genre}</span>
                <span className="meta-chip chip-year">{movie.releaseYear}</span>
                <span className="meta-chip chip-runtime">
                  <Clock size={13} /> {movie.runtime} minutes
                </span>
                <span className="meta-chip chip-platform">
                  <Tv size={13} /> {movie.platform}
                </span>
              </div>

              <div className="rec-rationale-box">
                <h4>Recommendation Rationale</h4>
                <p>
                  Ranked at <strong>Priority Tier {movie.priority}</strong> with the most efficient runtime
                  (<strong>{movie.runtime} mins</strong>) among your unwatched catalog.
                </p>
              </div>

              <div className="rec-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={onClose}
                >
                  Maybe Later
                </button>
                <button
                  type="button"
                  className="btn-start-watching"
                  onClick={() => {
                    onStartWatching(movie._id);
                    onClose();
                  }}
                >
                  <Play size={16} /> Start Watching Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
