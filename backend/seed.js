import dotenv from 'dotenv';
import { initializeDatabaseConnection } from './config/dbConnection.js';
import WatchlistItem from './models/WatchlistItem.js';

dotenv.config();

const sampleMovies = [
  {
    title: 'Inception',
    genre: 'Sci-Fi',
    releaseYear: 2010,
    runtime: 148,
    platform: 'Netflix',
    priority: 5,
    status: 'Watched',
    rating: 9,
    watchedDate: new Date('2024-01-15')
  },
  {
    title: 'The Dark Knight',
    genre: 'Action',
    releaseYear: 2008,
    runtime: 152,
    platform: 'Prime Video',
    priority: 5,
    status: 'Watched',
    rating: 10,
    watchedDate: new Date('2024-02-10')
  },
  {
    title: 'Parasite',
    genre: 'Thriller',
    releaseYear: 2019,
    runtime: 132,
    platform: 'Hotstar',
    priority: 4,
    status: 'Watched',
    rating: 9,
    watchedDate: new Date('2024-03-05')
  },
  {
    title: 'Spirited Away',
    genre: 'Drama',
    releaseYear: 2001,
    runtime: 125,
    platform: 'Netflix',
    priority: 4,
    status: 'Watching'
  },
  {
    title: 'Dune: Part Two',
    genre: 'Sci-Fi',
    releaseYear: 2024,
    runtime: 166,
    platform: 'Theatre',
    priority: 5,
    status: 'To Watch'
  },
  {
    title: 'Whiplash',
    genre: 'Drama',
    releaseYear: 2014,
    runtime: 106,
    platform: 'Prime Video',
    priority: 5,
    status: 'To Watch'
  },
  {
    title: 'The Grand Budapest Hotel',
    genre: 'Comedy',
    releaseYear: 2014,
    runtime: 99,
    platform: 'Hotstar',
    priority: 3,
    status: 'To Watch'
  },
  {
    title: 'A Quiet Place',
    genre: 'Horror',
    releaseYear: 2018,
    runtime: 90,
    platform: 'Other',
    priority: 2,
    status: 'To Watch'
  }
];

const executeDatabaseSeed = async () => {
  try {
    await initializeDatabaseConnection();
    console.log('[Seed Engine] Clearing existing records for pristine demo state...');
    await WatchlistItem.deleteMany({});

    console.log('[Seed Engine] Seeding sample cinephile records...');
    for (const movieData of sampleMovies) {
      const itemInstance = new WatchlistItem(movieData);
      await itemInstance.save();
      console.log(`[Seed Engine] Registered "${itemInstance.title}" with itemCode: ${itemInstance.itemCode}`);
    }

    console.log('[Seed Engine] Watchlist seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Engine] Failed to seed database:', err);
    process.exit(1);
  }
};

executeDatabaseSeed();
