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

  // 2. Server-side validated Attendance Check-in API
  app.post('/api/attendance/checkin', async (req, res) => {
    try {
      const {
        personName,
        sex,
        serviceId,
        serviceNameSnapshot,
        sector,
        cell,
        village,
        phoneNumber,
        email,
        nationalId,
        attendanceDate,
        attendanceTime,
        notes,
        idempotencyKey,
        isSelfCheckIn,
        recordedBy,
        adminId,
      } = req.body;

      // Idempotency check for duplicate clicks/network resubmissions
      if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
        const cached = idempotencyCache.get(idempotencyKey)!;
        return res.status(200).json(cached.response);
      }

      // Strict server-side field validation
      if (!personName || typeof personName !== 'string' || personName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'Person name is required and must be at least 2 characters.',
          },
        });
      }

      const validSexes = ['Male', 'Female', 'MALE', 'FEMALE'];
      if (!sex || !validSexes.includes(sex)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEX',
            message: 'Sex must be either Male or Female.',
          },
        });
      }

      if (!serviceId || typeof serviceId !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE',
            message: 'A valid service ID is required.',
          },
        });
      }

      // National ID check if provided
      const cleanNid = typeof nationalId === 'string' ? nationalId.replace(/\s+/g, '').trim() : '';
      if (cleanNid && (cleanNid.length !== 16 || !/^\d+$/.test(cleanNid))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NATIONAL_ID',
            message: 'National ID must be exactly 16 numeric digits.',
          },
        });
      }

      // Server enforces production district to NYABIHU
      const recordId = (typeof req.body.id === 'string' && req.body.id.trim()) 
        ? req.body.id.trim() 
        : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();
      const serverDate = attendanceDate || nowIso.split('T')[0];
      const serverTime = attendanceTime || new Date().toTimeString().substring(0, 5);

      const recordPayload = {
        id: recordId,
        personName: personName.trim(),
        sex: (sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase()) as 'Male' | 'Female',
        serviceId: serviceId.trim(),
        serviceNameSnapshot: serviceNameSnapshot || serviceId,
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        district: 'NYABIHU',
        sector: sector ? sector.trim() : 'Mukamira',
        cell: cell ? cell.trim() : null,
        village: village ? village.trim() : null,
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        email: email ? email.trim() : null,
        nationalId: cleanNid || null,
        attendanceDate: serverDate,
        attendanceTime: serverTime,
        notes: notes ? notes.trim() : null,
        isSelfCheckIn: Boolean(isSelfCheckIn),
        adminId: adminId || 'public-kiosk',
        recordedBy: recordedBy || 'Visitor Self Check-In',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const responsePayload = {
        success: true,
        id: recordId,
        data: recordPayload,
        message: 'Attendance record validated and created for Nyabihu YEGO Center.',
      };

      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, {
          timestamp: Date.now(),
          response: responsePayload,
        });
      }

      return res.status(200).json(responsePayload);
    } catch (err: any) {
      console.error('Server error in /api/attendance/checkin:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: err?.message || 'Internal server error while processing checkin.',
        },
      });
    }
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
