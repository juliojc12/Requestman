import React from 'react';
import {
  Activity,
  ArrowDownCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Filter,
  Layers,
  Pause,
  Pin,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Zap
} from 'lucide-react';
import { AppSettings, HttpLogEntry } from '../types';
import { THEMES } from '../constants/themes';

interface ToolbarProps {
  settings: AppSettings;
  logs: HttpLogEntry[];
  filteredCount: number;
  onUpdateSettings: (updater: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
  onClearLogs: () => void;
  onInjectSampleTraffic: () => void;
  onOpenExportModal: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  logs,
  filteredCount,
  onUpdateSettings,
  onClearLogs,
  onInjectSampleTraffic,
  onOpenExportModal,
}) => {
  const currentTheme = THEMES[settings.theme] || THEMES['cyber-dark'];

  // Calculate live statistics
  const totalSize = logs.reduce((acc, curr) => acc + curr.requestSize + curr.responseSize, 0);
  const totalSizeFormatted =
    totalSize > 1048576
      ? `${(totalSize / 1048576).toFixed(2)} MB`
      : `${(totalSize / 1024).toFixed(1)} KB`;

  const avgLatency =
    logs.length > 0
      ? (logs.reduce((acc, curr) => acc + curr.durationMs, 0) / logs.length).toFixed(1)
      : '0.0';

  const errorCount = logs.filter((l) => l.status >= 400 || l.status === 0).length;

  return (
    <div
      id="app-traffic-toolbar"
      className="flex items-center justify-between px-3 py-1.5 border-b text-xs select-none transition-colors"
      style={{
        backgroundColor: currentTheme.bgSidebar,
        borderColor: currentTheme.borderColor,
      }}
    >
      {/* Left: Interception Actions */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Record */}
        <button
          id="btn-toolbar-record"
          onClick={() => onUpdateSettings((p) => ({ ...p, isRecording: !p.isRecording }))}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-xs transition-all ${
            settings.isRecording
              ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
          }`}
          title={settings.isRecording ? 'Pause HTTP traffic capture' : 'Resume HTTP traffic capture'}
        >
          {settings.isRecording ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Capture</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Capture</span>
            </>
          )}
        </button>

        {/* Clear Logs */}
        <button
          id="btn-toolbar-clear"
          onClick={onClearLogs}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-300 transition-colors"
          title="Clear all captured HTTP traffic and SQLite records"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
          <span>Clear Logs</span>
        </button>

        {/* Populate Samples */}
        <button
          id="btn-toolbar-sample"
          onClick={onInjectSampleTraffic}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-300 transition-colors"
          title="Inject realistic API traffic scenario batches"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>Inject Samples</span>
        </button>

        {/* Auto Scroll Toggle */}
        <button
          id="btn-toolbar-autoscroll"
          onClick={() => onUpdateSettings((p) => ({ ...p, autoScroll: !p.autoScroll }))}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors ${
            settings.autoScroll
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40'
              : 'bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-400'
          }`}
          title="Auto scroll to latest incoming HTTP requests"
        >
          <ArrowDownCircle className="w-3.5 h-3.5" />
          <span>Auto-Scroll</span>
        </button>
      </div>

      {/* Right: Live Traffic Statistics Bar */}
      <div className="flex items-center gap-3 font-mono text-[11px]">
        {/* Shown vs Total count */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {filteredCount === logs.length ? (
              <span className="font-semibold text-gray-200">{logs.length} Requests</span>
            ) : (
              <span>
                <strong className="text-blue-400 font-semibold">{filteredCount}</strong> / {logs.length} Reqs
              </span>
            )}
          </span>
        </div>

        {/* Data Volume */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Activity className="w-3.5 h-3.5 text-green-400" />
          <span>
            Data: <strong className="text-gray-200 font-semibold">{totalSizeFormatted}</strong>
          </span>
        </div>

        {/* Average Latency */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span>
            Avg: <strong className="text-gray-200 font-semibold">{avgLatency} ms</strong>
          </span>
        </div>

        {/* Error Count */}
        {errorCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/40 border border-red-800/40 text-red-400">
            <Zap className="w-3.5 h-3.5" />
            <span>{errorCount} Errors</span>
          </div>
        )}
      </div>
    </div>
  );
};
