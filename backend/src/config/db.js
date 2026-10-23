const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && process.env.USE_MEMORY_DB !== 'true') {
    try {
      console.log(`[DB] Attempting connection to external MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('[DB] Successfully connected to external MongoDB');
      return mongoose.connection;
    } catch (err) {
      console.warn(`[DB] Could not connect to external MongoDB (${err.message}). Falling back to embedded MongoMemoryServer...`);
    }
  }

  // Fallback to embedded in-memory MongoDB
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const persistentDbPath = path.resolve(__dirname, '../../../.data/mongodb');
    if (process.env.NODE_ENV !== 'test') {
      fs.mkdirSync(persistentDbPath, { recursive: true });
    }
    mongodInstance = await MongoMemoryServer.create(
      process.env.NODE_ENV === 'test'
        ? {}
        : { instance: { dbPath: persistentDbPath, storageEngine: 'wiredTiger' } }
    );
    const memUri = mongodInstance.getUri();
    console.log(`[DB] Starting embedded MongoMemoryServer instance at ${memUri}`);
    await mongoose.connect(memUri);
    console.log('[DB] Successfully connected to embedded MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('[DB] Failed to initialize embedded MongoDB:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('[DB] Error during disconnection:', err);
  }
};

module.exports = { connectDB, disconnectDB };
