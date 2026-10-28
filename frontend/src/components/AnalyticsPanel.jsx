import React from 'react';
import { Film, Eye, CheckCircle2, Clock, Star, Trophy, Sparkles } from 'lucide-react';

/**
 * AnalyticsPanel Component
 * Displays real-time aggregated metrics from the MongoDB aggregation pipeline:
 * - Status counts breakdown
 * - Total hours watched
 * - Average rating
 * - Top-performing watched genre
 */
export default function AnalyticsPanel({ analyticsData, loading, onRefresh }) {
  const {
    statusBreakdown = { 'To Watch': 0, 'Watching': 0, 'Watched': 0 },
    totalWatchedHours = 0,
    averageWatchedRating = 0,
    topWatchedGenre = 'N/A'
  } = analyticsData || {};

  const totalCatalogEntries =
    (statusBreakdown['To Watch'] || 0) +
    (statusBreakdown['Watching'] || 0) +
    (statusBreakdown['Watched'] || 0);

  const watchedPercentage = totalCatalogEntries > 0
    ? Math.round(((statusBreakdown['Watched'] || 0) / totalCatalogEntries) * 100)
    : 0;

  return (
    <section className="analytics-container" aria-label="Watchlist Intelligence Dashboard">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <Sparkles className="icon-glow" size={20} />
          <h2>Watchlist Intelligence & Aggregations</h2>
        </div>
        <span className="live-pulse-badge">
          <span className="pulse-dot"></span> Live Aggregation Pipeline
        </span>
      </div>

      <div className="analytics-grid">
        {/* Metric 1: Total Catalog Entries & Status Distribution */}
        <div className="metric-card metric-status-breakdown">
          <div className="metric-top">
            <span className="metric-label">Queue Breakdown</span>
            <Film size={18} className="metric-icon accent-blue" />
          </div>
          <div className="status-bars-container">
            <div className="status-pill-row">
              <div className="status-pill status-pill-towatch">
                <span className="pill-dot towatch-dot"></span>
                <span className="pill-name">To Watch</span>
                <span className="pill-count">{statusBreakdown['To Watch']}</span>
              </div>
              <div className="status-pill status-pill-watching">
                <span className="pill-dot watching-dot"></span>
                <span className="pill-name">Watching</span>
                <span className="pill-count">{statusBreakdown['Watching']}</span>
              </div>
              <div className="status-pill status-pill-watched">
                <span className="pill-dot watched-dot"></span>
                <span className="pill-name">Watched</span>
                <span className="pill-count">{statusBreakdown['Watched']}</span>
              </div>
            </div>

            <div className="progress-track" title={`${watchedPercentage}% Completed`}>
              <div
                className="progress-fill"
                style={{ width: `${watchedPercentage}%` }}
              ></div>
            </div>
            <div className="progress-footer-label">
              <span>Completion Rate</span>
              <span>{watchedPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Watched Screening Hours */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Screen Time Consumed</span>
            <Clock size={18} className="metric-icon accent-amber" />
          </div>
          <div className="metric-value-row">
            <span className="metric-primary-value">{totalWatchedHours}</span>
            <span className="metric-unit">hours</span>
          </div>
          <p className="metric-subtext">Sum of runtimes for all finished titles</p>
        </div>

        {/* Metric 3: Average Rating of Watched Titles */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Average Score</span>
            <Star size={18} className="metric-icon accent-gold" />
          </div>
          <div className="metric-value-row">
            <span className="metric-primary-value">
              {averageWatchedRating > 0 ? averageWatchedRating.toFixed(1) : '—'}
            </span>
            <span className="metric-unit">/ 10</span>
          </div>
          <div className="star-visual-meter">
            {[1, 2, 3, 4, 5].map((starIndex) => {
              const active = starIndex <= Math.round(averageWatchedRating / 2);
              return (
                <Star
                  key={starIndex}
                  size={14}
                  className={active ? 'star-filled' : 'star-empty'}
                />
              );
            })}
          </div>
        </div>

        {/* Metric 4: Top Performing Watched Genre */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Dominant Genre</span>
            <Trophy size={18} className="metric-icon accent-emerald" />
          </div>
          <div className="metric-value-row">
            <span className="metric-primary-value genre-highlight">
              {topWatchedGenre}
            </span>
          </div>
          <p className="metric-subtext">Highest frequency & rating index among completed movies</p>
        </div>
      </div>
    </section>
  );
}
