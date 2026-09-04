import React from 'react';
import {
  Activity,
  Code2,
  Database,
  Download,
  Flame,
  Globe,
  HardDrive,
  HelpCircle,
  Laptop,
  Maximize2,
  Minus,
  Moon,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Sun,
  Terminal,
  Upload,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { AppSettings, ThemeId } from '../types';
import { THEMES } from '../constants/themes';

interface TitleBarProps {
  settings: AppSettings;
  onUpdateSettings: (updater: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
  onOpenComposer: () => void;
  onOpenSqlConsole: () => void;
  onOpenBreakpoints: () => void;
  onOpenTauriGuide: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleSimulate: () => void;
  isSimulating: boolean;
  logCount: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  settings,
  onUpdateSettings,
  onOpenComposer,
  onOpenSqlConsole,
  onOpenBreakpoints,
  onOpenTauriGuide,
  onOpenSettings,
  onExport,
  onImport,
  onToggleSimulate,
  isSimulating,
  logCount,
}) => {
  const currentTheme = THEMES[settings.theme] || THEMES['cyber-dark'];

  const toggleRecording = () => {
    onUpdateSettings((prev) => ({ ...prev, isRecording: !prev.isRecording }));
  };

  return (
    <header
      id="app-desktop-titlebar"
      className="h-10 flex items-center justify-between px-3 border-b text-xs select-none shrink-0 transition-colors"
      style={{
        backgroundColor: currentTheme.bgHeader,
        borderColor: currentTheme.borderColor,
        color: currentTheme.textPrimary,
      }}
    >
      {/* Left: Window Controls for macOS / Linux or Brand Icon */}
      <div className="flex items-center gap-3">
        {settings.osShellStyle === 'macos' && (
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-3 h-3 rounded-full bg-rose-500/90 border border-rose-600 cursor-pointer hover:opacity-80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/90 border border-amber-600 cursor-pointer hover:opacity-80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/90 border border-emerald-600 cursor-pointer hover:opacity-80" />
          </div>
        )}

        {settings.osShellStyle === 'linux' && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
            <span className="font-mono text-[10px] text-neutral-400 font-semibold px-1 py-0.5 bg-neutral-800/80 rounded">
              Tauri-Linux
            </span>
          </div>
        )}

        {settings.osShellStyle === 'windows' && (
          <div className="flex items-center gap-1.5 text-sky-400">
            <Shield className="w-4 h-4" />
          </div>
        )}

        {/* App Logo & Title */}
        <div className="flex items-center gap-2.5 font-medium">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/30 text-xs font-mono">
            H
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-tight text-white uppercase font-sans">
              NetSpy HTTP Sentinel
            </span>
            <span className="text-blue-400 font-mono text-[10px] px-1.5 py-0.5 border border-blue-400/30 rounded bg-blue-950/30">
              v2.4.0
            </span>
          </div>
        </div>

        {/* Interceptor Engine Status Pill */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l" style={{ borderColor: currentTheme.borderColor }}>
          <button
            id="btn-toggle-capture"
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono text-xs uppercase tracking-wider transition-all ${
              settings.isRecording
                ? 'bg-[#0D1117] border-[#30363D] text-green-500'
                : 'bg-[#0D1117] border-[#30363D] text-rose-500'
            }`}
            title="Toggle Live Request Interception"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                settings.isRecording
                  ? 'bg-green-500 shadow-[0_0_8px_#10B981] animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span>{settings.isRecording ? 'Capturing' : 'Paused'}</span>
          </button>

          {/* SQLite DB Log Badge */}
          <button
            id="btn-sqlite-status"
            onClick={onOpenSqlConsole}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono border bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-300 transition-colors"
            title="Open SQLite Query Workbench"
          >
            <Database className="w-3 h-3 text-blue-400" />
            <span>SQLite: {logCount} logs</span>
          </button>

          {/* Network Throttling Indicator */}
          {settings.throttleProfile !== 'none' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <WifiOff className="w-2.5 h-2.5" />
              <span>{settings.throttleProfile.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle/Right Quick Actions */}
      <div className="flex items-center gap-1.5">
        {/* Live Simulator Toggle */}
        <button
          id="btn-toggle-simulation"
          onClick={onToggleSimulate}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
            isSimulating
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-300'
          }`}
          title={isSimulating ? 'Stop Background Live Traffic Generator' : 'Start Realistic Background Traffic Generator'}
        >
          <Flame className={`w-3.5 h-3.5 ${isSimulating ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
          <span>{isSimulating ? 'Simulating...' : 'Simulate'}</span>
        </button>

        {/* Composer */}
        <button
          id="btn-open-composer"
          onClick={onOpenComposer}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-200 rounded-md font-medium transition-colors"
          title="Compose and Send Custom HTTP Request"
        >
          <Send className="w-3.5 h-3.5 text-green-400" />
          <span>Composer</span>
        </button>

        {/* SQL Console */}
        <button
          id="btn-open-sql"
          onClick={onOpenSqlConsole}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-200 rounded-md font-medium transition-colors"
          title="Run SQLite SQL Queries on Captured Traffic"
        >
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>SQL Query</span>
        </button>

        {/* Breakpoints */}
        <button
          id="btn-open-breakpoints"
          onClick={onOpenBreakpoints}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-200 rounded-md font-medium transition-colors"
          title="Configure Interception Breakpoints and Mock Rules"
        >
          <Radio className="w-3.5 h-3.5 text-orange-400" />
          <span>Breakpoints</span>
        </button>

        {/* Tauri Native Guide */}
        <button
          id="btn-open-tauri-guide"
          onClick={onOpenTauriGuide}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-200 rounded-md font-medium transition-colors"
          title="Tauri Desktop Compilation (Windows .exe / Linux .deb)"
        >
          <Laptop className="w-3.5 h-3.5 text-purple-400" />
          <span>Tauri Desktop</span>
        </button>

        {/* Export / Import */}
        <div className="flex items-center gap-1 border-l pl-2 border-[#2D333B]">
          <button
            id="btn-export-logs"
            onClick={onExport}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-md font-medium transition-colors shadow-sm"
            title="Export Logs (JSON, HAR 1.2, CSV, SQLite)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            id="btn-import-logs"
            onClick={onImport}
            className="p-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 transition-colors"
            title="Import Logs (JSON or HAR archive)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Settings */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="p-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 transition-colors ml-1"
          title="Settings, Themes & OS Shell Style"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Windows OS Frame Controls */}
        {settings.osShellStyle === 'windows' && (
          <div className="flex items-center ml-2 -mr-1 border-l pl-2" style={{ borderColor: currentTheme.borderColor }}>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200">
              <Minus className="w-3 h-3" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200">
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-rose-600 text-neutral-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
