const app = require('./app');
const connectDB = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3010;

// Connect to MongoDB
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
