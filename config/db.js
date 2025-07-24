const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB'.green);
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose connection error: ${err}`.red);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB'.yellow);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed through app termination'.yellow);
  process.exit(0);
});

module.exports = connectDB;