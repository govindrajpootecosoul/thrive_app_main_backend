const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = () => {
  const connectWithRetry = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 0,     // No timeout for server selection
        socketTimeoutMS: 0,              // No timeout for socket operations
        maxPoolSize: 20,                 // Increased connection pool
        minPoolSize: 5,
        maxIdleTimeMS: 300000,           // 5 minutes idle timeout
        // Removed invalid bufferMaxEntries option
      });

      console.log('✅ MongoDB connected successfully - No timeout limits');

    } catch (err) {
      console.error('❌ MongoDB connection failed. Retrying in 5 seconds...', err);
      setTimeout(connectWithRetry, 5000); // retry after 5s
    }
  };

  connectWithRetry();

  // Event listeners for robust handling
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected! Trying to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected!');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
};

module.exports = connectDB;
