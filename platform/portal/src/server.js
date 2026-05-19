const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const pino = require('pino');

const schemasRouter = require('./routes/schemas');
const topicsRouter = require('./routes/topics');
const catalogRouter = require('./routes/catalog');
const accessRouter = require('./routes/access');
const healthRouter = require('./routes/health');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use('/health', healthRouter);
app.use('/api/v1/schemas', schemasRouter);
app.use('/api/v1/topics', topicsRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/access', accessRouter);

app.use((err, req, res, _next) => {
  req.log.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error', code: err.code });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info({ port: PORT }, 'Portal API listening'));

module.exports = app;
