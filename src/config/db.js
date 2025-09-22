// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;



// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 30000, // 30 seconds timeout
//       socketTimeoutMS: 45000,          // 45 seconds socket timeout
//       maxPoolSize: 10,                 // limit concurrent connections
//     });

//     console.log('MongoDB connected successfully');

//     mongoose.connection.on('disconnected', () => {
//       console.warn('MongoDB disconnected! Trying to reconnect...');
//     });

//     mongoose.connection.on('reconnected', () => {
//       console.log('MongoDB reconnected!');
//     });

//     mongoose.connection.on('error', (err) => {
//       console.error('MongoDB connection error:', err);
//     });
//   } catch (error) {
//     console.error('MongoDB initial connection error:', error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;






const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = () => {
  const connectWithRetry = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000, // 30s server selection timeout
        socketTimeoutMS: 45000,          // 45s socket timeout
        maxPoolSize: 10,                 // limit concurrent connections
      });

      console.log('✅ MongoDB connected successfully');

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
