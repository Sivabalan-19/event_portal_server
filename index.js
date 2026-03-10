const express = require('express');
const cors = require('cors');
const app = express();
const config = require('./config');
const db = require('./config/db');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

db.connect();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(logger);

app.use('/api', routes);

app.get('/', (req, res) => res.json({ message: 'Event Portal API' }));

app.use(errorHandler);

app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));

module.exports = app;
