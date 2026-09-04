import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  MoreVertical,
  Pin,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';
import { HttpLogEntry, HttpMethod, ThemeId } from '../types';
import { THEMES } from '../constants/themes';
import { ExportService } from '../services/exportService';

interface TrafficTableProps {
  logs: HttpLogEntry[];
  selectedLogId: string | null;
  onSelectLog: (log: HttpLogEntry) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDeleteLog: (id: string) => void;
  onReplayLog: (log: HttpLogEntry) => void;
  themeId: ThemeId;
  autoScroll: boolean;
  compact: boolean;
}

export const TrafficTable: React.FC<TrafficTableProps> = ({
  logs,
  selectedLogId,
  onSelectLog,
  onTogglePin,
  onDeleteLog,
  onReplayLog,
  themeId,
  autoScroll,
  compact,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom if enabled and new logs arrive
  useEffect(() => {
    if (autoScroll && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedLogId || logs.length === 0) return;
      const currentIndex = logs.findIndex((l) => l.id === selectedLogId);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(logs.length - 1, currentIndex + 1);
        onSelectLog(logs[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        onSelectLog(logs[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLogId, logs, onSelectLog]);

  const getMethodBadgeClass = (method: HttpMethod) => {
    switch (method) {
      case 'GET':
        return currentTheme.badgeGet;
      case 'POST':
        return currentTheme.badgePost;
      case 'PUT':
        return currentTheme.badgePut;
      case 'DELETE':
        return currentTheme.badgeDelete;
      case 'PATCH':
        return currentTheme.badgePatch;
      default:
        return currentTheme.badgeOptions;
    }
  };

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) return currentTheme.status2xx;
    if (status >= 300 && status < 400) return currentTheme.status3xx;
    if (status >= 400 && status < 500) return currentTheme.status4xx;
    if (status >= 500) return currentTheme.status5xx;
    return currentTheme.statusError;
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    return (
      d.toTimeString().split(' ')[0] +
      '.' +
      d.getMilliseconds().toString().padStart(3, '0')
    );
  };

  // Find max latency for visual relative waterfall bar
  const maxDuration = Math.max(200, ...logs.map((l) => l.durationMs));

  return (
    <div
      ref={tableContainerRef}
      id="traffic-table-container"
      className="flex-1 overflow-auto focus:outline-none transition-colors"
      style={{ backgroundColor: currentTheme.bgMain }}
      tabIndex={0}
    >
      {logs.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
            <Zap className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-base font-semibold" style={{ color: currentTheme.textPrimary }}>
            Waiting for HTTP Traffic...
          </h3>
          <p className="text-xs max-w-sm mt-1 mb-4" style={{ color: currentTheme.textSecondary }}>
            Configure your client application or browser to route requests through proxy port or click below to simulate live microservice traffic.
          </p>
        </div>
      ) : (
        <table className="w-full text-left border-collapse font-mono text-[11px]">
          <thead
            className="sticky top-0 z-10 border-b select-none font-sans font-semibold text-[11px]"
            style={{
              backgroundColor: currentTheme.bgSidebar,
              borderColor: currentTheme.borderColor,
              color: currentTheme.textSecondary,
            }}
          >
            <tr>
              <th className="py-1.5 px-2 w-8 text-center">#</th>
              <th className="py-1.5 px-2 w-16 text-center">Method</th>
              <th className="py-1.5 px-2 w-20 text-center">Status</th>
              <th className="py-1.5 px-2 w-48">Host</th>
              <th className="py-1.5 px-2 min-w-[200px]">Path & Query</th>
              <th className="py-1.5 px-2 w-24">Type</th>
              <th className="py-1.5 px-2 w-20 text-right">Size</th>
              <th className="py-1.5 px-2 w-32">Latency</th>
              <th className="py-1.5 px-2 w-24 text-right">Time</th>
              <th className="py-1.5 px-2 w-16 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: currentTheme.borderColor }}>
            {logs.map((log, index) => {
              const isSelected = log.id === selectedLogId;
              const waterfallPercent = Math.min(100, Math.max(8, (log.durationMs / maxDuration) * 100));

              return (
                <tr
                  key={log.id}
                  id={`traffic-row-${log.id}`}
                  onClick={() => onSelectLog(log)}
                  className={`group cursor-pointer transition-colors border-b border-[#21262D] ${
                    isSelected
                      ? 'bg-blue-900/20 text-white font-medium border-l-2 border-l-blue-500'
                      : 'hover:bg-[#161B22] text-gray-300'
                  }`}
                >
                  {/* Pin toggle */}
                  <td className="py-1.5 px-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(log.id, !log.isPinned);
                      }}
                      className="text-gray-500 hover:text-orange-400 p-0.5"
                      title={log.isPinned ? 'Unpin' : 'Pin request'}
                    >
                      <Pin
                        className={`w-3 h-3 ${
                          log.isPinned ? 'text-orange-400 fill-orange-400' : 'opacity-30 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Method */}
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getMethodBadgeClass(
                        log.method
                      )}`}
                    >
                      {log.method}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(
                        log.status
                      )}`}
                    >
                      {log.status === 0 ? 'ERR' : log.status}
                    </span>
                  </td>

                  {/* Host */}
                  <td className="py-1.5 px-2 truncate max-w-[180px]" title={log.host}>
                    <span className="opacity-80 text-gray-400">{log.host}</span>
                  </td>

                  {/* Path */}
                  <td className="py-1.5 px-2 truncate max-w-[340px]" title={log.url}>
                    <span className="font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">
                      {log.path}
                    </span>
                  </td>

                  {/* Content Type */}
                  <td className="py-1.5 px-2 truncate max-w-[100px] text-gray-400">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#0D1117] border border-[#2D333B] rounded">
                      {log.contentCategory.toUpperCase()}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="py-1.5 px-2 text-right text-[10px] text-gray-400">
                    {formatSize(log.responseSize || log.requestSize)}
                  </td>

                  {/* Latency Waterfall */}
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-[#21262D] rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all ${
                            log.status >= 400
                              ? 'bg-red-400'
                              : log.durationMs > 250
                              ? 'bg-orange-400'
                              : 'bg-green-400'
                          }`}
                          style={{ width: `${waterfallPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono shrink-0 opacity-90 text-gray-300">
                        {log.durationMs}ms
                      </span>
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="py-1.5 px-2 text-right text-[10px] text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplayLog(log);
                        }}
                        className="p-1 rounded hover:bg-blue-600/20 text-gray-400 hover:text-blue-300 transition-colors"
                        title="Replay this HTTP Request"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(ExportService.generateCurl(log));
                        }}
                        className="p-1 rounded hover:bg-[#30363D] text-gray-400 hover:text-white transition-colors"
                        title="Copy as cURL"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLog(log.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
