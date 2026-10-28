import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabaseConnection } from './config/dbConnection.js';
import watchlistRouter from './routes/watchlistRoutes.js';
import { dispatchStandardError } from './utils/responseEnvelope.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/watchlist', watchlistRouter);

// Root health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'CinePulse Watchlist API'
  });
});

// Fallback 404 handler for undefined API routes
app.use('*', (req, res) => {
  return dispatchStandardError(res, 404, `Endpoint "${req.originalUrl}" not found on CinePulse server.`);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Exception]:', err);
  return dispatchStandardError(
    res,
    500,
    'Internal server error encountered while processing request.',
    process.env.NODE_ENV === 'development' ? err.message : null
  );
});

// Server bootstrap sequence
const startServer = async () => {
  try {
    await initializeDatabaseConnection();

    // Auto-seed demo movies if catalog is clean for immediate exploration
    const WatchlistItem = (await import('./models/WatchlistItem.js')).default;
    const existingCount = await WatchlistItem.countDocuments();
    if (existingCount === 0) {
      console.log('[CinePulse Server] Populating initial demo catalog entries...');
      const demoMovies = [
        { title: 'Inception', genre: 'Sci-Fi', releaseYear: 2010, runtime: 148, platform: 'Netflix', priority: 5, status: 'Watched', rating: 9, watchedDate: new Date('2024-01-15') },
        { title: 'The Dark Knight', genre: 'Action', releaseYear: 2008, runtime: 152, platform: 'Prime Video', priority: 5, status: 'Watched', rating: 10, watchedDate: new Date('2024-02-10') },
        { title: 'Parasite', genre: 'Thriller', releaseYear: 2019, runtime: 132, platform: 'Hotstar', priority: 4, status: 'Watched', rating: 9, watchedDate: new Date('2024-03-05') },
        { title: 'Spirited Away', genre: 'Drama', releaseYear: 2001, runtime: 125, platform: 'Netflix', priority: 4, status: 'Watching' },
        { title: 'Dune: Part Two', genre: 'Sci-Fi', releaseYear: 2024, runtime: 166, platform: 'Theatre', priority: 5, status: 'To Watch' },
        { title: 'Whiplash', genre: 'Drama', releaseYear: 2014, runtime: 106, platform: 'Prime Video', priority: 5, status: 'To Watch' },
        { title: 'The Grand Budapest Hotel', genre: 'Comedy', releaseYear: 2014, runtime: 99, platform: 'Hotstar', priority: 3, status: 'To Watch' },
        { title: 'A Quiet Place', genre: 'Horror', releaseYear: 2018, runtime: 90, platform: 'Other', priority: 2, status: 'To Watch' }
      ];
      for (const movie of demoMovies) {
        const item = new WatchlistItem(movie);
        await item.save();
      }
      console.log('[CinePulse Server] Initial demo catalog seeded.');
    }

    app.listen(PORT, () => {
      console.log(`[CinePulse Server] Listening and operational on http://localhost:${PORT}`);
    });
  } catch (initErr) {
    console.error('[CinePulse Server] Critical startup failure:', initErr);
    process.exit(1);
  }
};

startServer();

export default app;
