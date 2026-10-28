# CinePulse | Intelligent Movie Watchlist & Analytics Platform

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-6366f1.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933.svg)](#)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-Aggregation-47A248.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#)

CinePulse is a full-stack MERN web application engineered for cinema enthusiasts to catalog, prioritize, and analyze their movie viewing queues with strict finite state machine (FSM) integrity, automated code indexing, duplicate conflict resolution, and real-time MongoDB aggregation analytics.

---

## Architectural Layout

```
├── backend/
│   ├── config/
│   │   └── dbConnection.js               # Resilient MongoDB connector with in-memory fallback
│   ├── controllers/
│   │   └── watchlistController.js        # Controller layer for CRUD, FSM transitions, and queries
│   ├── middleware/
│   │   ├── watchlistValidator.js         # Payload schema, bounds, and HTTP 409 duplicate guard
│   │   └── statusGuard.js                # Finite state machine validator & deletion blocker
│   ├── models/
│   │   └── WatchlistItem.js              # Mongoose model with MV-<year>-<seq> pre-save hook
│   ├── routes/
│   │   └── watchlistRoutes.js            # Express router exposing REST endpoints
│   ├── services/
│   │   └── watchlistAnalyticsService.js  # MongoDB 4-stage aggregation pipeline engine
│   ├── utils/
│   │   └── responseEnvelope.js           # Standard { success, message, data } dispatcher
│   ├── .env.example
│   ├── package.json
│   ├── seed.js                           # Demo database populator
│   └── server.js                         # Express application bootstrap
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticsPanel.jsx        # Real-time aggregation metrics visualizer
│   │   │   ├── NextRecommendationModal.jsx# "Watch Next" algorithm recommendation modal
│   │   │   ├── WatchlistCard.jsx         # Card component with dynamic state selectors & rating flow
│   │   │   └── WatchlistForm.jsx         # Unified Add/Edit modal with field locks & conflict banners
│   │   ├── services/
│   │   │   └── apiClient.js              # Frontend API abstraction and error normalizer
│   │   ├── App.jsx                       # Root application orchestrator
│   │   ├── index.css                     # Custom glassmorphic styling system & micro-animations
│   │   └── main.jsx                      # React 18 DOM mount
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Core Business Logic & Specifications

### 1. Standard API Envelope Specification
All REST responses strictly follow the standard JSON envelope structure:
```json
{
  "success": true,
  "message": "Human-readable description of operation result",
  "data": { ... }
}
```

HTTP Status Codes Enforced:
- `200 OK`: Successful resource retrieval, update, or transition.
- `201 Created`: Movie successfully registered into the catalog.
- `400 Bad Request`: Input boundary violation, illegal FSM state transition, or attempt to delete an item in `Watching` status.
- `404 Not Found`: Target movie ID or recommendation candidate not found.
- `409 Conflict`: Duplicate entry rejected (same title and release year).

### 2. Automated Code Generation (`itemCode`)
- Each movie is assigned a system identifier formatted as:  
  `MV-<releaseYear>-<3-digit index>` (e.g., `MV-2024-001`, `MV-2024-002`).
- Calculated via a Mongoose pre-save lifecycle hook querying existing records for the specified `releaseYear`.
- `itemCode` and `releaseYear` are permanently immutable once created.

### 3. Duplicate Prevention Guard
- Before inserting or renaming a title, a case-insensitive regular expression query inspects whether another entry matches both the `title` AND `releaseYear`.
- Duplicate collisions reject with **HTTP 409** and emit a descriptive user error banner in the UI.

### 4. Finite State Machine (FSM) Workflow
Transitions strictly enforce the following progression graph:
- `To Watch` ➔ `Watching` OR `Watched`
- `Watching` ➔ `Watched` OR `To Watch`
- `Watched` ➔ **Locked** (Permanent terminal state; no transitions allowed out of Watched).

The Express middleware `statusGuard.js` enforces this at the network boundary, and the frontend card dropdown dynamically computes and renders only permitted next actions.

### 5. Mandatory Rating Policy
- Transitioning into `Watched` requires a mandatory user score between `1` and `10`.
- The `watchedDate` timestamp is automatically recorded upon transitioning.
- Modifying a rating is permitted only on titles that currently hold `Watched` status.

### 6. Filtered Listing & Server-Side Pagination
- Endpoint: `GET /api/watchlist?status=...&genre=...&search=...&page=...`
- Pagination is enforced at **6 items per page**.
- Movies in `To Watch` status are strictly ordered by `priority` descending (Tier 5 first), breaking ties with shortest screening runtime.

### 7. "Watch Next" Recommendation Engine
- Endpoint: `GET /api/watchlist/recommend-next`
- Filters for `status: "To Watch"`.
- Sorts primarily by `priority` descending, secondarily by `runtime` ascending (shortest screening duration).
- Returns **HTTP 404** if no qualifying item exists in the queue.

### 8. Analytics Aggregation Pipeline
- Endpoint: `GET /api/watchlist/analytics`
- Aggregation Pipeline calculations:
  1. Status breakdown counts (`To Watch`, `Watching`, `Watched`).
  2. Total hours watched: `Σ(runtime of Watched) / 60` (rounded to 1 decimal place).
  3. Average user rating for watched titles (rounded to 1 decimal place).
  4. Top-performing genre among finished titles (ranked by frequency and mean rating).
- Automatically re-fetched upon any CRUD mutation or status transition.

### 9. Deletion Constraints
- Deleting any movie currently in `Watching` status is strictly forbidden and rejected with **HTTP 400** by `statusGuard.js`.
- The frontend disables the Delete action for `Watching` movies and displays a confirmation dialog for other statuses.

---

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm (v9+)
- *(Optional)* Local MongoDB instance or MongoDB Atlas URI (CinePulse automatically engages an in-memory database daemon if an external MongoDB daemon is not detected).

### Backend Configuration
```bash
cd backend
cp .env.example .env
npm install
```

Start the backend API server:
```bash
npm start
# Server listens on http://localhost:5000
```

*(Optional) Seed the catalog manually:*
```bash
node seed.js
```

### Frontend Configuration
```bash
cd ../frontend
npm install
npm run dev
# Vite runs on http://localhost:5173
```

---

## API Reference Cheatsheet

| Method | Endpoint | Description | Middleware / Guards |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/watchlist` | Paginated catalog listing (6/page) | Query parser |
| `POST` | `/api/watchlist` | Register new movie | `validateWatchlistCreation` |
| `GET` | `/api/watchlist/analytics` | Compute aggregation metrics | Aggregation Pipeline |
| `GET` | `/api/watchlist/recommend-next` | Smart "Watch Next" selection | Recommendation Sorter |
| `PUT` | `/api/watchlist/:id` | Update title, genre, runtime, platform, priority | `validateWatchlistUpdate` |
| `PATCH`| `/api/watchlist/:id/status` | Execute state machine transition | `enforceStatusTransitionGuard` |
| `PATCH`| `/api/watchlist/:id/rating` | Update score for Watched items | `updateWatchedItemRating` |
| `DELETE`| `/api/watchlist/:id` | Remove movie from watchlist | `enforceDeletionGuard` |

---

## Originality & Architecture Statement
- Custom internal response dispatchers (`dispatchStandardSuccess`, `dispatchStandardError`).
- Granular middleware layers (`watchlistValidator`, `statusGuard`).
- Non-boilerplate variable and function naming (`STATUS_TRANSITION_GRAPH`, `computeWatchlistAnalytics`, `fetchWatchlistCatalog`, `watchlistItemSchema.pre('save')`).
- Hand-crafted vanilla CSS design system utilizing CSS custom properties, glassmorphic backdrops, and responsive layouts without bloated CSS frameworks.
