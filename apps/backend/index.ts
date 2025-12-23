import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import routes from './src/routes';

// Import the worker to start it
import './src/queues/analysis-queue';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use('*', logger());

// Welcome route
app.get('/', (c) => c.json({
  message: 'DAC-HR AI Analysis API',
  version: '1.0.0',
  endpoints: {
    health: '/api/health',
    ai: '/api/ai/*',
  },
}));

// Mount API routes
app.route('/api', routes);

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: err.message || 'Internal server error',
  }, 500);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = parseInt(process.env.PORT || '3001');

console.log(`
🚀 DAC-HR AI Analysis Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server: http://localhost:${port}
  Health: http://localhost:${port}/api/health
  AI API:  http://localhost:${port}/api/ai/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

export default {
  port,
  fetch: app.fetch,
};
