import mongoose from 'mongoose';

const ALLOWED_GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller'
];

const ALLOWED_PLATFORMS = [
  'Netflix',
  'Prime Video',
  'Hotstar',
  'Theatre',
  'Other'
];

const ALLOWED_STATUSES = [
  'To Watch',
  'Watching',
  'Watched'
];

const currentYearBound = new Date().getFullYear();

/**
 * WatchlistItem Mongoose Schema
 * Represents an entry in the personalized cinematic queue with automated code generation.
 */
const watchlistItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required.'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters.']
    },
    genre: {
      type: String,
      required: [true, 'Genre is mandatory.'],
      enum: {
        values: ALLOWED_GENRES,
        message: '{VALUE} is not a supported cinematic genre.'
      }
    },
    releaseYear: {
      type: Number,
      required: [true, 'Release year is mandatory.'],
      min: [1950, 'Release year cannot precede 1950.'],
      max: [currentYearBound, `Release year cannot surpass the current calendar year (${currentYearBound}).`]
    },
    runtime: {
      type: Number,
      required: [true, 'Runtime duration is required.'],
      min: [30, 'Runtime must be at least 30 minutes.'],
      max: [300, 'Runtime cannot exceed 300 minutes.']
    },
    platform: {
      type: String,
      required: [true, 'Viewing platform is mandatory.'],
      enum: {
        values: ALLOWED_PLATFORMS,
        message: '{VALUE} is not a recognized platform category.'
      }
    },
    priority: {
      type: Number,
      required: [true, 'Priority tier (1 to 5) is required.'],
      min: [1, 'Minimum priority is 1 (lowest).'],
      max: [5, 'Maximum priority is 5 (highest).'],
      default: 3
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ALLOWED_STATUSES,
        message: '{VALUE} is not an accepted status.'
      },
      default: 'To Watch'
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1.'],
      max: [10, 'Rating cannot exceed 10.'],
      default: null
    },
    watchedDate: {
      type: Date,
      default: null
    },
    itemCode: {
      type: String,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for fast duplicate checks on title and releaseYear
watchlistItemSchema.index({ title: 1, releaseYear: 1 });

/**
 * Pre-save lifecycle hook:
 * Enforces automatic code sequencing in format: MV-<releaseYear>-<3-digit-index>
 * E.g., MV-2024-001, MV-2024-002
 */
watchlistItemSchema.pre('save', async function (next) {
  if (this.isNew || !this.itemCode) {
    try {
      // Find highest assigned sequence for the target release year
      const prefixPattern = new RegExp(`^MV-${this.releaseYear}-(\\d{3})$`);
      const existingEntries = await this.constructor
        .find({ releaseYear: this.releaseYear, itemCode: { $regex: prefixPattern } }, { itemCode: 1 })
        .lean();

      let highestSequence = 0;
      for (const entry of existingEntries) {
        if (entry.itemCode) {
          const match = entry.itemCode.match(prefixPattern);
          if (match && match[1]) {
            const numericPart = parseInt(match[1], 10);
            if (numericPart > highestSequence) {
              highestSequence = numericPart;
            }
          }
        }
      }

      // If no regex match was found but docs exist, fall back to count + 1
      if (highestSequence === 0 && existingEntries.length === 0) {
        const fallbackCount = await this.constructor.countDocuments({ releaseYear: this.releaseYear });
        highestSequence = fallbackCount;
      }

      const assignedSequence = String(highestSequence + 1).padStart(3, '0');
      this.itemCode = `MV-${this.releaseYear}-${assignedSequence}`;
    } catch (sequenceErr) {
      return next(sequenceErr);
    }
  }

  // Auto-record watchedDate when transition to 'Watched' occurs without a set date
  if (this.status === 'Watched' && !this.watchedDate) {
    this.watchedDate = new Date();
  }

  next();
});

const WatchlistItem = mongoose.model('WatchlistItem', watchlistItemSchema);

export default WatchlistItem;
export { ALLOWED_GENRES, ALLOWED_PLATFORMS, ALLOWED_STATUSES };
