require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || '',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'CR7',
};

module.exports = config;