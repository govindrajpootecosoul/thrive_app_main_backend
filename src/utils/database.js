const mongoose = require('mongoose');

/**
 * Creates a MongoDB connection with optimized timeout settings
 * @param {string} uri - MongoDB connection URI
 * @param {string} databaseName - Database name for logging
 * @returns {Promise<Connection>} MongoDB connection promise
 */
const createDatabaseConnection = async (uri, databaseName = 'database') => {
  console.log(`Connecting to ${databaseName}:`, uri.replace(/:[^:]*@/, ':***@')); // Log without password

  const connection = mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Connection timeout settings
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    bufferCommands: false, // Disable mongoose buffering
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain a minimum of 5 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    // Retry connection settings
    retryWrites: true,
    retryReads: true,
  });

  // Wait for the connection to be ready
  await connection.asPromise();

  return connection;
};

module.exports = {
  createDatabaseConnection
};
