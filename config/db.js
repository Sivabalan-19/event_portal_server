const mongoose = require('mongoose');
const config = require('./index');

async function connect() {
  const uri = config.mongoUri;
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

module.exports = { connect, mongoose };
