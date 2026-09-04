import React, { useEffect, useState } from 'react';
import {
  Code,
  Database,
  Download,
  FileCode,
  Play,
  RotateCw,
  Sparkles,
  Table,
  Terminal,
  Upload,
  X
} from 'lucide-react';
import { SQLiteQueryResult, ThemeId } from '../types';
import { THEMES } from '../constants/themes';
import { sqliteService } from '../services/sqliteService';

interface SqlConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeId: ThemeId;
}

const PRESET_QUERIES = [
  {
    title: 'Error Responses (4xx/5xx)',
    query: `SELECT id, method, status, host, path, duration_ms, content_type 
FROM http_logs 
WHERE status >= 400 OR status = 0 
ORDER BY timestamp DESC;`,
  },
  {
    title: 'Latency Breakdown by Method',
    query: `SELECT method, count(*) as total_requests, 
       ROUND(AVG(duration_ms), 1) as avg_latency_ms, 
       MAX(duration_ms) as max_latency_ms, 
       SUM(response_size) as total_bytes 
FROM http_logs 
GROUP BY method 
ORDER BY total_requests DESC;`,
  },
  {
    title: 'Top Traffic Bandwidth by Host',
    query: `SELECT host, count(*) as req_count, 
       ROUND(SUM(response_size) / 1024.0, 1) as response_kb, 
       ROUND(AVG(duration_ms), 1) as avg_latency_ms 
FROM http_logs 
GROUP BY host 
ORDER BY response_kb DESC;`,
  },
  {
    title: 'Slowest Endpoints (>100ms)',
    query: `SELECT id, method, status, url, duration_ms 
FROM http_logs 
WHERE duration_ms > 100 
ORDER BY duration_ms DESC 
LIMIT 25;`,
  },
  {
    title: 'Payload Inspections (JSON Only)',
    query: `SELECT id, method, status, url, request_size, response_size, substr(response_body, 1, 120) as preview 
FROM http_logs 
WHERE content_category = 'json' 
ORDER BY timestamp DESC;`,
  },
];

export const SqlConsoleModal: React.FC<SqlConsoleModalProps> = ({
  isOpen,
  onClose,
  themeId,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];

  const [query, setQuery] = useState<string>(PRESET_QUERIES[0].query);
  const [result, setResult] = useState<SQLiteQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'schema'>('console');
  const [rowCount, setRowCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      handleExecuteQuery(query);
      sqliteService.getLogCount().then(setRowCount);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteQuery = async (sqlToRun?: string) => {
    setIsExecuting(true);
    try {
      const sql = sqlToRun || query;
      const res = await sqliteService.executeRawQuery(sql);
      setResult(res);
      const total = await sqliteService.getLogCount();
      setRowCount(total);
    } catch (e: any) {
      setResult({
        columns: ['Error'],
        rows: [[e.message || String(e)]],
        executionTimeMs: 0,
        rowCount: 0,
        error: e.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadSqlite = async () => {
    const data = await sqliteService.exportDatabaseBinary();
    if (data) {
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netspy-traffic-sqlite-${Date.now()}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="modal-sqlite-console"
        className="w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
        style={{
          backgroundColor: currentTheme.bgSidebar,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textPrimary,
        }}
      >
        {/* Modal Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            backgroundColor: currentTheme.bgHeader,
            borderColor: currentTheme.borderColor,
          }}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm">SQLite Log Database & Analytics Engine</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
              {rowCount} records stored
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSqlite}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border hover:bg-neutral-800 transition-colors"
              style={{ borderColor: currentTheme.borderColor, color: currentTheme.textSecondary }}
              title="Download SQLite .sqlite Database File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .sqlite</span>
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Query Presets Toolbar */}
        <div
          className="px-4 py-2 border-b flex items-center gap-1.5 flex-wrap text-xs"
          style={{
            backgroundColor: currentTheme.bgCard,
            borderColor: currentTheme.borderColor,
          }}
        >
          <span className="text-neutral-400 font-medium mr-1">Quick Presets:</span>
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(preset.query);
                handleExecuteQuery(preset.query);
              }}
              className="px-2 py-1 rounded bg-black/30 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px]"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* SQL Editor Area */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>SQL Query Editor (table: http_logs)</span>
              </span>
              <button
                id="btn-run-sql"
                onClick={() => handleExecuteQuery()}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-1 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {isExecuting ? <RotateCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                <span>Run SQL (Ctrl+Enter)</span>
              </button>
            </div>

            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteQuery();
                }
              }}
              rows={4}
              className="w-full p-3 font-mono text-xs rounded-lg border bg-black/40 text-cyan-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              style={{ borderColor: currentTheme.borderColor }}
            />
          </div>

          {/* Query Results Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-300">Results</span>
                {result && (
                  <span className="text-neutral-400 font-mono text-[11px]">
                    ({result.rowCount} rows in {result.executionTimeMs} ms)
                  </span>
                )}
              </div>
              {result?.error && (
                <span className="text-rose-400 font-mono text-[11px]">
                  Error: {result.error}
                </span>
              )}
            </div>

            {/* Results Table */}
            <div
              className="border rounded-lg overflow-auto max-h-[300px] bg-black/40 font-mono text-xs"
              style={{ borderColor: currentTheme.borderColor }}
            >
              {result && result.columns.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead
                    className="sticky top-0 bg-neutral-900 border-b select-none font-semibold"
                    style={{ borderColor: currentTheme.borderColor }}
                  >
                    <tr>
                      {result.columns.map((col, cIdx) => (
                        <th key={cIdx} className="py-1.5 px-3 border-r last:border-r-0 border-neutral-800 text-cyan-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={result.columns.length} className="p-4 text-center text-neutral-500">
                          Query returned 0 rows.
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-neutral-800/40">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-1.5 px-3 border-r last:border-r-0 border-neutral-800 truncate max-w-xs"
                              title={String(cell)}
                            >
                              {cell === null ? (
                                <span className="text-neutral-600 italic">NULL</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  Execute a query to inspect SQLite dataset results.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
