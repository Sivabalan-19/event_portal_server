const express = require('express');
const cors = require('cors');
const app = express();
const config = require('./config');
const db = require('./config/db');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const clientUrlEnv = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = clientUrlEnv
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowAll = clientUrlEnv.trim() === '*' || allowedOrigins.includes('*');

const commonCorsSettings = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const isOriginAllowed = (origin) => {
  if (!origin) return true; // server-to-server, curl, same-origin
  if (allowedOrigins.includes(origin)) return true;
  // Support simple wildcard patterns like: https://*.vercel.app
  for (const pattern of allowedOrigins) {
    if (!pattern.includes('*')) continue;
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`);
    if (regex.test(origin)) return true;
  }
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  ...commonCorsSettings,
};

const reflectCorsOptions = {
  origin: true, // reflect request origin
  ...commonCorsSettings,
};

db.connect();

if (isAllowAll) {
  app.use(cors(reflectCorsOptions));
  app.options('*', cors(reflectCorsOptions));
} else {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
}
app.use(express.json());
app.use(logger);

app.use('/api', routes);

app.get('/', (req, res) => res.json({ message: 'Event Portal API' }));

app.use(errorHandler);

app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));

module.exports = app;
