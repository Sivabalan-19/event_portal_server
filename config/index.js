const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || '',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/Event',
  jwtSecret: process.env.JWT_SECRET || 'CR7',
};
