import React, { useState, useEffect } from 'react';
import { X, Film, AlertTriangle, Lock, Check } from 'lucide-react';

const GENRE_OPTIONS = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller'
];

const PLATFORM_OPTIONS = [
  'Netflix',
  'Prime Video',
  'Hotstar',
  'Theatre',
  'Other'
];

const currentYearBound = new Date().getFullYear();

/**
 * WatchlistForm Component
 * Handles unified movie creation and updating.
 * Enforces field locks (releaseYear & itemCode on edit), client validations,
 * and displays server-side duplicate conflicts (HTTP 409).
 */
export default function WatchlistForm({
  isOpen,
  onClose,
  onSubmit,
  initialMovieData = null,
  isSubmitting = false,
  serverErrorMessage = null
}) {
  const isEditMode = Boolean(initialMovieData && initialMovieData._id);

  const [formData, setFormData] = useState({
    title: '',
    genre: 'Action',
    releaseYear: currentYearBound,
    runtime: 120,
    platform: 'Netflix',
    priority: 3,
    status: 'To Watch',
    rating: 8
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialMovieData) {
      setFormData({
        title: initialMovieData.title || '',
        genre: initialMovieData.genre || 'Action',
        releaseYear: initialMovieData.releaseYear || currentYearBound,
        runtime: initialMovieData.runtime || 120,
        platform: initialMovieData.platform || 'Netflix',
        priority: initialMovieData.priority || 3,
        status: initialMovieData.status || 'To Watch',
        rating: initialMovieData.rating || 8
      });
    } else {
      setFormData({
        title: '',
        genre: 'Action',
        releaseYear: currentYearBound,
        runtime: 120,
        platform: 'Netflix',
        priority: 3,
        status: 'To Watch',
        rating: 8
      });
    }
    setClientErrors({});
  }, [initialMovieData, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Movie title is required.';
    }

    const yearNum = Number(formData.releaseYear);
    if (!yearNum || yearNum < 1950 || yearNum > currentYearBound) {
      errors.releaseYear = `Release year must be between 1950 and ${currentYearBound}.`;
    }

    const runtimeNum = Number(formData.runtime);
    if (!runtimeNum || runtimeNum < 30 || runtimeNum > 300) {
      errors.runtime = 'Runtime must be between 30 and 300 minutes.';
    }

    if (!isEditMode && formData.status === 'Watched') {
      const ratingNum = Number(formData.rating);
      if (!ratingNum || ratingNum < 1 || ratingNum > 10) {
        errors.rating = 'A score between 1 and 10 is mandatory for Watched movies.';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      genre: formData.genre,
      runtime: Number(formData.runtime),
      platform: formData.platform,
      priority: Number(formData.priority)
    };

    if (!isEditMode) {
      payload.releaseYear = Number(formData.releaseYear);
      payload.status = formData.status;
      if (formData.status === 'Watched') {
        payload.rating = Number(formData.rating);
      }
    }

    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Film className="modal-icon" size={22} />
            <h2>{isEditMode ? 'Edit Movie Details' : 'Index New Movie'}</h2>
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

        {serverErrorMessage && (
          <div className="form-error-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{serverErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Row 1: Title */}
          <div className="form-field-group">
            <label htmlFor="title">Movie Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Interstellar"
              value={formData.title}
              onChange={handleInputChange}
              className={clientErrors.title ? 'input-error' : ''}
              autoFocus
            />
            {clientErrors.title && (
              <span className="field-error-text">{clientErrors.title}</span>
            )}
          </div>

          {/* Row 2: Genre & Platform */}
          <div className="form-grid-2col">
            <div className="form-field-group">
              <label htmlFor="genre">Genre *</label>
              <select
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="platform">Streaming Platform *</label>
              <select
                id="platform"
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Release Year & Runtime */}
          <div className="form-grid-2col">
            <div className="form-field-group">
              <label htmlFor="releaseYear">
                Release Year (1950 - {currentYearBound}) *
                {isEditMode && <span className="locked-pill"><Lock size={10} /> Locked</span>}
              </label>
              <input
                id="releaseYear"
                name="releaseYear"
                type="number"
                min="1950"
                max={currentYearBound}
                value={formData.releaseYear}
                onChange={handleInputChange}
                disabled={isEditMode}
                className={isEditMode ? 'input-locked' : clientErrors.releaseYear ? 'input-error' : ''}
              />
              {clientErrors.releaseYear && (
                <span className="field-error-text">{clientErrors.releaseYear}</span>
              )}
            </div>

            <div className="form-field-group">
              <label htmlFor="runtime">Runtime (30 - 300 mins) *</label>
              <input
                id="runtime"
                name="runtime"
                type="number"
                min="30"
                max="300"
                value={formData.runtime}
                onChange={handleInputChange}
                className={clientErrors.runtime ? 'input-error' : ''}
              />
              {clientErrors.runtime && (
                <span className="field-error-text">{clientErrors.runtime}</span>
              )}
            </div>
          </div>

          {/* Row 4: Priority Slider */}
          <div className="form-field-group">
            <div className="priority-label-row">
              <label htmlFor="priority">Queue Priority Tier: <strong>Level {formData.priority}</strong></label>
              <span className="priority-sublabel">(1: Low, 5: Must-Watch)</span>
            </div>
            <input
              id="priority"
              name="priority"
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.priority}
              onChange={handleInputChange}
              className="priority-range-input"
            />
          </div>

          {/* Creation-Only Status & Rating */}
          {!isEditMode && (
            <div className="creation-status-box">
              <div className="form-field-group">
                <label htmlFor="status">Initial Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="To Watch">To Watch</option>
                  <option value="Watching">Watching</option>
                  <option value="Watched">Watched</option>
                </select>
              </div>

              {formData.status === 'Watched' && (
                <div className="form-field-group rating-mandatory-input">
                  <label htmlFor="rating">Rating (1 to 10) *</label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className={clientErrors.rating ? 'input-error' : ''}
                  />
                  {clientErrors.rating && (
                    <span className="field-error-text">{clientErrors.rating}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : isEditMode ? 'Update Movie' : 'Add to Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
