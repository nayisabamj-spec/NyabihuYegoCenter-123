import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // In-memory idempotency cache for deduplication on slow/reconnecting networks (5 min TTL)
  const idempotencyCache = new Map<string, { timestamp: number; response: any }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of idempotencyCache.entries()) {
      if (now - val.timestamp > 5 * 60 * 1000) {
        idempotencyCache.delete(key);
      }
    }
  }, 60 * 1000);

  // 1. Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NYABIHU YEGO CENTER Platform',
      district: 'NYABIHU',
      timestamp: new Date().toISOString(),
      activeCenter: 'NYABIHU YEGO CENTER',
    });
  });

  // 2. Server diagnostics endpoint
  app.get('/api/diagnostics', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NYABIHU YEGO CENTER Platform',
      targetFirebaseProject: 'nyabihu-yego-center',
      timestamp: new Date().toISOString(),
    });
  });

  // 3. User Approval / Status API Endpoint
  app.post('/api/admin/users/status', (req, res) => {
    const { userId, status, assignedRole, assignedDistrictId } = req.body;
    if (!userId || !status) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'userId and status are required.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${userId} updated to status: ${status}`,
      updated: {
        userId,
        status,
        role: assignedRole || 'admin',
        districtId: assignedDistrictId || 'nyabihu',
        updatedAt: new Date().toISOString(),
      },
    });
  });

  // 4. Server-Side Audit Log Endpoint
  app.post('/api/admin/audit', (req, res) => {
    const { action, entityType, entityId, details, performedBy } = req.body;
    const logId = `log-srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    return res.status(200).json({
      success: true,
      logId,
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Mount Vite middleware for dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NYABIHU YEGO Center unified server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
