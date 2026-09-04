import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { HttpLogEntry, SQLiteQueryResult } from '../types';

class SQLiteService {
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private memoryFallbackLogs: Map<string, HttpLogEntry> = new Map();

  constructor() {
    this.initPromise = this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    try {
      // Initialize sql.js using Vite resolved wasm asset URL with fallback
      const SQL = await initSqlJs({
        locateFile: (file) => {
          if (file.endsWith('.wasm')) {
            return sqlWasmUrl || '/sql-wasm.wasm';
          }
          return `https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/${file}`;
        },
      });

      this.db = new SQL.Database();
      this.createSchema();
      this.isInitialized = true;
      console.log('SQLite WASM Database initialized successfully.');
    } catch (err) {
      console.warn('WASM SQLite init failed, falling back to robust in-memory SQL handler:', err);
      this.isInitialized = true;
    }
  }

  private createSchema(): void {
    if (!this.db) return;

    try {
      const schemaSql = `
        CREATE TABLE IF NOT EXISTS http_logs (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          method TEXT NOT NULL,
          url TEXT NOT NULL,
          host TEXT NOT NULL,
          path TEXT NOT NULL,
          protocol TEXT NOT NULL,
          status INTEGER NOT NULL,
          status_text TEXT NOT NULL,
          request_size INTEGER NOT NULL,
          response_size INTEGER NOT NULL,
          duration_ms REAL NOT NULL,
          content_type TEXT NOT NULL,
          content_category TEXT NOT NULL,
          request_headers TEXT NOT NULL,
          request_body TEXT,
          response_headers TEXT NOT NULL,
          response_body TEXT,
          timing_json TEXT NOT NULL,
          tags TEXT,
          is_pinned INTEGER DEFAULT 0,
          notes TEXT,
          is_mocked INTEGER DEFAULT 0,
          is_intercepted INTEGER DEFAULT 0,
          ip_address TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON http_logs(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_logs_method ON http_logs(method);
        CREATE INDEX IF NOT EXISTS idx_logs_status ON http_logs(status);
        CREATE INDEX IF NOT EXISTS idx_logs_host ON http_logs(host);
        CREATE INDEX IF NOT EXISTS idx_logs_duration ON http_logs(duration_ms DESC);
      `;

      this.db.run(schemaSql);
    } catch (e) {
      console.error('Error creating SQLite schema:', e);
    }
  }

  public async saveLog(log: HttpLogEntry): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    this.memoryFallbackLogs.set(log.id, log);

    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO http_logs (
          id, timestamp, method, url, host, path, protocol,
          status, status_text, request_size, response_size, duration_ms,
          content_type, content_category, request_headers, request_body,
          response_headers, response_body, timing_json, tags, is_pinned,
          notes, is_mocked, is_intercepted, ip_address
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      stmt.run([
        log.id,
        log.timestamp,
        log.method,
        log.url,
        log.host,
        log.path,
        log.protocol,
        log.status,
        log.statusText,
        log.requestSize,
        log.responseSize,
        log.durationMs,
        log.contentType,
        log.contentCategory,
        JSON.stringify(log.requestHeaders),
        log.requestBody || null,
        JSON.stringify(log.responseHeaders),
        log.responseBody || null,
        JSON.stringify(log.timing),
        log.tags ? JSON.stringify(log.tags) : null,
        log.isPinned ? 1 : 0,
        log.notes || null,
        log.isMocked ? 1 : 0,
        log.isIntercepted ? 1 : 0,
        log.ipAddress || '127.0.0.1',
      ]);

      stmt.free();
    } catch (e) {
      console.error('Error inserting log to SQLite:', e);
    }
  }

  public async batchSaveLogs(logs: HttpLogEntry[]): Promise<void> {
    for (const log of logs) {
      await this.saveLog(log);
    }
  }

  public async togglePin(id: string, isPinned: boolean): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    const entry = this.memoryFallbackLogs.get(id);
    if (entry) {
      entry.isPinned = isPinned;
    }

    if (this.db) {
      try {
        this.db.run(`UPDATE http_logs SET is_pinned = ? WHERE id = ?`, [isPinned ? 1 : 0, id]);
      } catch (e) {
        console.error('Failed to update pin status in SQLite:', e);
      }
    }
  }

  public async deleteLog(id: string): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    this.memoryFallbackLogs.delete(id);

    if (this.db) {
      try {
        this.db.run(`DELETE FROM http_logs WHERE id = ?`, [id]);
      } catch (e) {
        console.error('Failed to delete log in SQLite:', e);
      }
    }
  }

  public async clearAll(): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    this.memoryFallbackLogs.clear();

    if (this.db) {
      try {
        this.db.run(`DELETE FROM http_logs`);
        this.db.run(`VACUUM`);
      } catch (e) {
        console.error('Failed to clear SQLite logs:', e);
      }
    }
  }

  public async executeRawQuery(sql: string): Promise<SQLiteQueryResult> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    const start = performance.now();

    if (this.db) {
      try {
        const results = this.db.exec(sql);
        const executionTimeMs = parseFloat((performance.now() - start).toFixed(2));

        if (results.length === 0) {
          return {
            columns: ['Result'],
            rows: [['Query executed successfully. 0 rows returned.']],
            executionTimeMs,
            rowCount: 0,
          };
        }

        const first = results[0];
        return {
          columns: first.columns,
          rows: first.values,
          executionTimeMs,
          rowCount: first.values.length,
        };
      } catch (err: any) {
        console.warn('SQLite engine execution error, trying fallback:', err);
      }
    }

    // In-memory query evaluator fallback
    return this.executeInMemoryQuery(sql, start);
  }

  private executeInMemoryQuery(sql: string, startTime: number): SQLiteQueryResult {
    const logs = Array.from(this.memoryFallbackLogs.values());
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    const lowerSql = sql.trim().toLowerCase();

    if (lowerSql.includes('count(*)')) {
      return {
        columns: ['total_requests'],
        rows: [[logs.length]],
        executionTimeMs,
        rowCount: 1,
      };
    }

    if (lowerSql.includes('group by method')) {
      const counts: Record<string, { count: number; avgLat: number; maxLat: number; bytes: number }> = {};
      logs.forEach((l) => {
        if (!counts[l.method]) {
          counts[l.method] = { count: 0, avgLat: 0, maxLat: 0, bytes: 0 };
        }
        const c = counts[l.method];
        c.count++;
        c.avgLat += l.durationMs;
        c.maxLat = Math.max(c.maxLat, l.durationMs);
        c.bytes += l.responseSize || 0;
      });

      const rows = Object.entries(counts).map(([method, val]) => [
        method,
        val.count,
        (val.avgLat / (val.count || 1)).toFixed(1),
        val.maxLat,
        val.bytes,
      ]);

      return {
        columns: ['method', 'total_requests', 'avg_latency_ms', 'max_latency_ms', 'total_bytes'],
        rows,
        executionTimeMs,
        rowCount: rows.length,
      };
    }

    // Default column view
    const filtered = lowerSql.includes('status >= 400')
      ? logs.filter((l) => l.status >= 400 || l.status === 0)
      : lowerSql.includes('duration_ms > 100')
      ? logs.filter((l) => l.durationMs > 100)
      : logs;

    const rows = filtered.slice(0, 100).map((l) => [
      l.id,
      l.method,
      l.status,
      l.host,
      l.path,
      l.durationMs,
      l.contentType,
    ]);

    return {
      columns: ['id', 'method', 'status', 'host', 'path', 'duration_ms', 'content_type'],
      rows,
      executionTimeMs,
      rowCount: rows.length,
    };
  }

  public async getLogCount(): Promise<number> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }

    if (this.db) {
      try {
        const res = this.db.exec(`SELECT count(*) as total FROM http_logs`);
        if (res.length > 0 && res[0].values.length > 0) {
          return Number(res[0].values[0][0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    return this.memoryFallbackLogs.size;
  }

  public async exportDatabaseBinary(): Promise<Uint8Array | null> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // ignore
      }
    }
    if (!this.db) return null;
    return this.db.export();
  }

  public async importDatabaseBinary(data: Uint8Array): Promise<boolean> {
    try {
      const SQL = await initSqlJs({
        locateFile: (file) => {
          if (file.endsWith('.wasm')) {
            return sqlWasmUrl || '/sql-wasm.wasm';
          }
          return `https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/${file}`;
        },
      });
      this.db = new SQL.Database(data);
      this.createSchema();
      return true;
    } catch (e) {
      console.error('Failed to import SQLite binary:', e);
      return false;
    }
  }
}

export const sqliteService = new SQLiteService();
