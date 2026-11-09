import type { Express } from 'express';

interface SchemaStatus {
  status: string;
  schemaVersion?: number;
  error?: string;
}
interface HealthDependencies {
  isProduction: () => boolean;
  getDbPool: () => Promise<any>;
  getDbStatus: () => { connected: boolean };
  verifySchema: (pool: any) => Promise<SchemaStatus>;
}

/** Liveness never claims persistence readiness. Both readiness URLs share one handler. */
export function registerHealthRoutes(app: Express, deps: HealthDependencies): void {
  app.get('/api/health/live', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get(['/api/health', '/api/health/ready'], async (_req, res) => {
    let schema: SchemaStatus | null = null;
    try {
      const pool = await deps.getDbPool();
      if (pool) schema = await deps.verifySchema(pool);
    } catch {
      // Avoid returning database errors that may contain connection metadata.
      schema = { status: 'UNAVAILABLE' };
    }
    const connected = deps.getDbStatus().connected;
    const ready = connected && schema?.status === 'READY';
    const unhealthy = deps.isProduction() && !ready;
    res.status(unhealthy ? 503 : 200).json({
      status: unhealthy ? 'error' : 'ok',
      database: connected ? 'connected' : (deps.isProduction() ? 'unavailable' : 'in-memory-development'),
      migrations: schema?.status === 'READY' ? 'current' : (schema?.status || (deps.isProduction() ? 'unknown' : 'development-mode')),
      schemaVersion: schema?.schemaVersion ?? 0,
      version: '1.29.0',
      timestamp: new Date().toISOString(),
      ...(unhealthy ? { error: 'Database unavailable or schema not ready in production' } : {}),
    });
  });
}
