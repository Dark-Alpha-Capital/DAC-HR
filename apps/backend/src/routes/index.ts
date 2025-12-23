import { Hono } from 'hono';
import aiRoutes from './ai';

const routes = new Hono();

// Mount AI routes
routes.route('/ai', aiRoutes);

// Health check
routes.get('/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

export default routes;
