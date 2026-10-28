import mongoose from 'mongoose';
import dns from 'dns';

// Ensure Windows local network resolvers reliably resolve Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  // Use system default if overridden
}

/**
 * Custom resilient database connection orchestrator.
 * Connects to MongoDB Atlas URI with fallback to memory server if completely offline.
 *
 * @returns {Promise<mongoose.Connection>} Established mongoose connection
 */
export const initializeDatabaseConnection = async () => {
  const primaryConnectionString = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinepulse_watchlist';
  
  mongoose.set('strictQuery', true);

  try {
    const connectionInstance = await mongoose.connect(primaryConnectionString, {
      serverSelectionTimeoutMS: 10000
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
