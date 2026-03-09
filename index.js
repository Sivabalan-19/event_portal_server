const express = require('express');
const app = express();
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const port = config.port;

app.use(express.json());
app.use(logger);

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'Event Portal API' });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
