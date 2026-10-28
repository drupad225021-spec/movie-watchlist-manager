import mongoose from 'mongoose';

/**
 * Custom resilient database connection orchestrator.
 * Tries the primary connection URI (e.g. MongoDB Atlas or local daemon).
 * If unreachable, safely initializes an in-memory Mongo instance for seamless dev evaluation.
 *
 * @returns {Promise<mongoose.Connection>} Established mongoose connection
 */
export const initializeDatabaseConnection = async () => {
  const primaryConnectionString = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinepulse_watchlist';
  
  mongoose.set('strictQuery', true);

  try {
    const connectionInstance = await mongoose.connect(primaryConnectionString, {
      serverSelectionTimeoutMS: 2500
    });
    console.log(`[Database] Connected successfully to host: ${connectionInstance.connection.host}`);
    return connectionInstance.connection;
  } catch (connectionError) {
    console.warn(`[Database] Primary MongoDB connection failed (${connectionError.message}). Engaging in-memory fallback server...`);
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const memoryMongoDaemon = await MongoMemoryServer.create();
      const ephemeralUri = memoryMongoDaemon.getUri();
      
      const fallbackInstance = await mongoose.connect(ephemeralUri);
      console.log(`[Database] Resilient In-Memory MongoDB connected at ${ephemeralUri}`);
      return fallbackInstance.connection;
    } catch (fallbackError) {
      console.error('[Database] Critical: Failed to establish in-memory MongoDB daemon:', fallbackError);
      throw fallbackError;
    }
  }
};
