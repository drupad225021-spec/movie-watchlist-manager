import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Plus,
  Sparkles,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Info
} from 'lucide-react';
import { watchlistApiService, WatchlistApiError } from './services/apiClient.js';
import WatchlistCard from './components/WatchlistCard.jsx';
import AnalyticsPanel from './components/AnalyticsPanel.jsx';
import WatchlistForm from './components/WatchlistForm.jsx';
import NextRecommendationModal from './components/NextRecommendationModal.jsx';

const GENRE_LIST = [
  'All',
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller'
];

const STATUS_TABS = ['All', 'To Watch', 'Watching', 'Watched'];

export default function App() {
  // Catalog State
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Modals & Interactivity
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formServerError, setFormServerError] = useState(null);

  // Next Recommendation Modal
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recMovie, setRecMovie] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  // Delete Confirmation Modal
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Toast Notification System
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Fetch Analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      const data = await watchlistApiService.getAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  // Fetch Catalog
  const loadCatalog = useCallback(async () => {
    try {
      setIsLoadingCatalog(true);
      const result = await watchlistApiService.getCatalog({
        status: activeStatusTab,
        genre: selectedGenre,
        search: searchQuery,
        page: currentPage
      });
      setItems(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load watchlist items', 'error');
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [activeStatusTab, selectedGenre, searchQuery, currentPage]);

  // Initial Load
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Reset page when filters change
  const handleStatusFilterChange = (status) => {
    setActiveStatusTab(status);
    setCurrentPage(1);
  };

  const handleGenreFilterChange = (genre) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Form Submissions
  const handleOpenAddModal = () => {
    setEditingMovie(null);
    setFormServerError(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (movie) => {
    setEditingMovie(movie);
    setFormServerError(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    try {
      setIsSubmittingForm(true);
      setFormServerError(null);

      if (editingMovie) {
        await watchlistApiService.updateItem(editingMovie._id, payload);
        showToast(`Updated "${payload.title}" successfully.`);
      } else {
        await watchlistApiService.createItem(payload);
        showToast(`Added "${payload.title}" to watchlist.`);
      }

      setFormModalOpen(false);
      loadCatalog();
      loadAnalytics();
    } catch (err) {
      setFormServerError(err.message);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Status Transition
  const handleTransitionStatus = async (movieId, targetStatus, rating = null) => {
    try {
      await watchlistApiService.transitionStatus(movieId, targetStatus, rating);
      showToast(`Status updated to "${targetStatus}".`);
      loadCatalog();
      loadAnalytics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Rating Update
  const handleUpdateRating = async (movieId, score) => {
    try {
      await watchlistApiService.updateRating(movieId, score);
      showToast(`Rating updated to ${score}/10.`);
      loadCatalog();
      loadAnalytics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Action
  const handleInitiateDelete = (movie) => {
    if (movie.status === 'Watching') {
      showToast('Movies in "Watching" status cannot be deleted.', 'error');
      return;
    }
    setDeleteCandidate(movie);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await watchlistApiService.deleteItem(deleteCandidate._id);
      showToast(`Removed "${deleteCandidate.title}" from watchlist.`);
      setDeleteCandidate(null);
      loadCatalog();
      loadAnalytics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Smart Recommendation "Watch Next"
  const handleOpenRecommendationModal = async () => {
    setRecModalOpen(true);
    setRecLoading(true);
    setRecError(null);
    setRecMovie(null);

    try {
      const recommendation = await watchlistApiService.getRecommendation();
      setRecMovie(recommendation);
    } catch (err) {
      setRecError(err.message || 'No recommendation available at this time.');
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div className="cinepulse-app-root">
      {/* Toast Notification Container */}
      {toastNotification && (
        <div className={`toast-banner toast-${toastNotification.type}`} role="alert">
          {toastNotification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastNotification.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo-disc">
            <Film className="brand-icon" size={24} />
          </div>
          <div className="brand-text">
            <span className="brand-title">CinePulse</span>
            <span className="brand-subtitle">Watchlist Intelligence</span>
          </div>
        </div>

        <div className="navbar-action-buttons">
          <button
            type="button"
            className="btn-nav-recommend"
            onClick={handleOpenRecommendationModal}
            title="Smart Watch Next Recommendation"
          >
            <Sparkles size={16} />
            <span>Watch Next</span>
          </button>

          <button
            type="button"
            className="btn-nav-add"
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            <span>Add Movie</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content-layout">
        {/* Real-Time Aggregation Analytics Panel */}
        <AnalyticsPanel
          analyticsData={analyticsData}
          loading={isLoadingAnalytics}
          onRefresh={loadAnalytics}
        />

        {/* Filter and Search Control Bar */}
        <section className="catalog-control-bar" aria-label="Catalog Filters">
          {/* Status Tabs */}
          <div className="status-tabs-container">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`status-tab-btn ${activeStatusTab === tab ? 'active-tab' : ''}`}
                onClick={() => handleStatusFilterChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Genre Controls */}
          <div className="search-filter-subgroup">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search movies by title..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>

            <div className="genre-dropdown-wrapper">
              <Filter size={15} className="filter-icon" />
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreFilterChange(e.target.value)}
                className="genre-select"
                aria-label="Filter by genre"
              >
                {GENRE_LIST.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre === 'All' ? 'All Genres' : genre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Catalog Section */}
        <section className="catalog-display-section" aria-label="Movie Catalog">
          <div className="catalog-results-header">
            <span className="catalog-count-label">
              Showing <strong>{items.length}</strong> of <strong>{totalCount}</strong> entries
            </span>
            {activeStatusTab === 'To Watch' && (
              <span className="sort-hint-tag">
                <Sparkles size={12} /> Sorted by Priority Tier (High ➔ Low)
              </span>
            )}
          </div>

          {isLoadingCatalog ? (
            <div className="catalog-loading-state">
              <div className="spinner"></div>
              <p>Fetching movies from CinePulse catalog...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-catalog-state">
              <Film size={48} className="empty-catalog-icon" />
              <h3>No Movies Match Your Current Criteria</h3>
              <p>Try clearing your search term, changing filters, or add a new movie to start.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenAddModal}
              >
                <Plus size={16} /> Add First Movie
              </button>
            </div>
          ) : (
            <div className="watchlist-grid">
              {items.map((movie) => (
                <WatchlistCard
                  key={movie._id}
                  movie={movie}
                  onInitiateEdit={handleOpenEditModal}
                  onRequestDelete={handleInitiateDelete}
                  onTransitionStatus={handleTransitionStatus}
                  onUpdateRating={handleUpdateRating}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Catalog Pagination">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="page-indicator">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </main>

      {/* Add / Edit Form Modal */}
      <WatchlistForm
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialMovieData={editingMovie}
        isSubmitting={isSubmittingForm}
        serverErrorMessage={formServerError}
      />

      {/* Watch Next Recommendation Modal */}
      <NextRecommendationModal
        isOpen={recModalOpen}
        onClose={() => setRecModalOpen(false)}
        movie={recMovie}
        loading={recLoading}
        error={recError}
        onStartWatching={(id) => handleTransitionStatus(id, 'Watching')}
      />

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="modal-backdrop">
          <div className="modal-window delete-dialog-card">
            <div className="delete-dialog-header">
              <Trash2 className="text-red" size={24} />
              <h3>Confirm Deletion</h3>
            </div>
            <p className="delete-dialog-body">
              Are you sure you want to remove <strong>"{deleteCandidate.title}"</strong> ({deleteCandidate.itemCode})
              from your watchlist? This action cannot be reversed.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleConfirmDelete}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
