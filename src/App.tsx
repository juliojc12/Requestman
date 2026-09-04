import React, { useEffect, useMemo, useState } from 'react';
import {
  AppSettings,
  BreakpointRule,
  FilterState,
  HttpLogEntry,
  HttpMethod,
  ThemeId
} from './types';
import { THEMES } from './constants/themes';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { FilterBar } from './components/FilterBar';
import { TrafficTable } from './components/TrafficTable';
import { InspectorPanel } from './components/Inspector/InspectorPanel';
import { RequestComposer } from './components/RequestComposer';
import { SqlConsoleModal } from './components/SqlConsoleModal';
import { BreakpointsModal } from './components/BreakpointsModal';
import { TauriGuideModal } from './components/TauriGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { sqliteService } from './services/sqliteService';
import { TrafficService } from './services/trafficService';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cyber-dark',
  osShellStyle: 'linux',
  proxyPort: 8899,
  isRecording: true,
  autoScroll: true,
  maxLogsInSqlite: 5000,
  throttleProfile: 'none',
  customLatencyMs: 0,
  showTimingWaterfall: true,
  compactList: false,
  fontSize: 'base',
};

const DEFAULT_FILTER: FilterState = {
  searchQuery: '',
  searchRegex: false,
  searchInHeaders: false,
  searchInBody: false,
  methods: [],
  statusCategories: [],
  contentCategories: [],
  hostFilter: '',
  minDurationMs: 0,
  maxDurationMs: 5000,
  onlyPinned: false,
  onlyErrors: false,
};

export default function App() {
  // Settings with localStorage persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('netspy_app_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Breakpoints with localStorage persistence
  const [breakpointRules, setBreakpointRules] = useState<BreakpointRule[]>(() => {
    try {
      const saved = localStorage.getItem('netspy_breakpoint_rules');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rule_default_1',
        name: 'Mock Auth 401 Unauthorized',
        enabled: false,
        urlPattern: '*/v2/auth/*',
        method: 'ALL',
        phase: 'request',
        action: 'mock',
        mockStatus: 401,
        mockResponseBody: JSON.stringify({ error: 'Token expired', code: 'UNAUTHORIZED' }, null, 2),
      },
    ];
  });

  const [logs, setLogs] = useState<HttpLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Modals state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerInitialLog, setComposerInitialLog] = useState<HttpLogEntry | null>(null);
  const [isSqlConsoleOpen, setIsSqlConsoleOpen] = useState(false);
  const [isBreakpointsOpen, setIsBreakpointsOpen] = useState(false);
  const [isTauriGuideOpen, setIsTauriGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Save settings on update
  useEffect(() => {
    localStorage.setItem('netspy_app_settings', JSON.stringify(settings));
  }, [settings]);

  // Save breakpoint rules on update
  useEffect(() => {
    localStorage.setItem('netspy_breakpoint_rules', JSON.stringify(breakpointRules));
  }, [breakpointRules]);

  // Seed initial mock traffic into SQLite & UI
  useEffect(() => {
    const initialMocks = TrafficService.getRealisticMockScenarios();
    setLogs(initialMocks);
    setSelectedLogId(initialMocks[0]?.id || null);

    // Save to SQLite
    sqliteService.batchSaveLogs(initialMocks).catch(console.error);
  }, []);

  // Background Live Simulation Interval
  useEffect(() => {
    if (!isSimulating || !settings.isRecording) return;

    const interval = setInterval(() => {
      const newEntry = TrafficService.createRandomLiveTraffic();

      // Check if matches any mock breakpoint rule
      for (const rule of breakpointRules) {
        if (rule.enabled && rule.action === 'mock' && rule.mockStatus) {
          if (newEntry.url.includes(rule.urlPattern.replace(/\*/g, ''))) {
            newEntry.status = rule.mockStatus;
            newEntry.statusText = rule.mockStatus === 401 ? 'Unauthorized' : 'Mocked';
            if (rule.mockResponseBody) {
              newEntry.responseBody = rule.mockResponseBody;
            }
            newEntry.isMocked = true;
            break;
          }
        }
      }

      setLogs((prev) => {
        const next = [...prev, newEntry];
        if (next.length > settings.maxLogsInSqlite) {
          return next.slice(next.length - settings.maxLogsInSqlite);
        }
        return next;
      });

      sqliteService.saveLog(newEntry).catch(console.error);
    }, 3200);

    return () => clearInterval(interval);
  }, [isSimulating, settings.isRecording, settings.maxLogsInSqlite, breakpointRules]);

  // Handlers
  const handleUpdateSettings = (
    updater: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)
  ) => {
    setSettings((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
  };

  const handleClearLogs = async () => {
    setLogs([]);
    setSelectedLogId(null);
    await sqliteService.clearAll();
  };

  const handleInjectSampleTraffic = async () => {
    const samples = TrafficService.getRealisticMockScenarios();
    setLogs((prev) => [...prev, ...samples]);
    await sqliteService.batchSaveLogs(samples);
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isPinned } : l))
    );
    await sqliteService.togglePin(id, isPinned);
  };

  const handleDeleteLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (selectedLogId === id) setSelectedLogId(null);
    await sqliteService.deleteLog(id);
  };

  const handleReplayLog = (log: HttpLogEntry) => {
    setComposerInitialLog(log);
    setIsComposerOpen(true);
  };

  const handleSendFromComposer = async (newLog: HttpLogEntry) => {
    setLogs((prev) => [...prev, newLog]);
    setSelectedLogId(newLog.id);
    await sqliteService.saveLog(newLog);
  };

  const handleImportLogs = async (imported: HttpLogEntry[]) => {
    setLogs((prev) => [...prev, ...imported]);
    await sqliteService.batchSaveLogs(imported);
  };

  // Filter computation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Pinned only
      if (filter.onlyPinned && !log.isPinned) return false;

      // 2. Errors only
      if (filter.onlyErrors && log.status < 400 && log.status !== 0) return false;

      // 3. HTTP Methods filter
      if (filter.methods.length > 0 && !filter.methods.includes(log.method)) {
        return false;
      }

      // 4. Status Categories (2xx, 3xx, 4xx, 5xx, error)
      if (filter.statusCategories.length > 0) {
        const matchesCategory = filter.statusCategories.some((cat) => {
          if (cat === '2xx') return log.status >= 200 && log.status < 300;
          if (cat === '3xx') return log.status >= 300 && log.status < 400;
          if (cat === '4xx') return log.status >= 400 && log.status < 500;
          if (cat === '5xx') return log.status >= 500;
          if (cat === 'error') return log.status === 0;
          return false;
        });
        if (!matchesCategory) return false;
      }

      // 5. Content Categories (json, html, xml, form, image, etc.)
      if (filter.contentCategories.length > 0) {
        if (!filter.contentCategories.includes(log.contentCategory)) {
          return false;
        }
      }

      // 6. Search query
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.trim();

        if (filter.searchRegex) {
          try {
            const re = new RegExp(q, 'i');
            let match = re.test(log.url) || re.test(log.path) || re.test(log.host) || re.test(String(log.status));
            if (!match && filter.searchInHeaders) {
              match = re.test(JSON.stringify(log.requestHeaders)) || re.test(JSON.stringify(log.responseHeaders));
            }
            if (!match && filter.searchInBody) {
              match = (log.requestBody ? re.test(log.requestBody) : false) || (log.responseBody ? re.test(log.responseBody) : false);
            }
            if (!match) return false;
          } catch {
            return false;
          }
        } else {
          const lowerQ = q.toLowerCase();
          let match =
            log.url.toLowerCase().includes(lowerQ) ||
            log.path.toLowerCase().includes(lowerQ) ||
            log.host.toLowerCase().includes(lowerQ) ||
            String(log.status).includes(lowerQ) ||
            log.method.toLowerCase().includes(lowerQ);

          if (!match && filter.searchInHeaders) {
            match =
              JSON.stringify(log.requestHeaders).toLowerCase().includes(lowerQ) ||
              JSON.stringify(log.responseHeaders).toLowerCase().includes(lowerQ);
          }

          if (!match && filter.searchInBody) {
            match =
              (log.requestBody ? log.requestBody.toLowerCase().includes(lowerQ) : false) ||
              (log.responseBody ? log.responseBody.toLowerCase().includes(lowerQ) : false);
          }

          if (!match) return false;
        }
      }

      return true;
    });
  }, [logs, filter]);

  const selectedLog = useMemo(() => {
    return logs.find((l) => l.id === selectedLogId) || null;
  }, [logs, selectedLogId]);

  const currentTheme = THEMES[settings.theme] || THEMES['cyber-dark'];

  return (
    <div
      id="app-root-shell"
      className="h-screen w-screen flex flex-col overflow-hidden select-none transition-colors"
      style={{
        backgroundColor: currentTheme.bgMain,
        color: currentTheme.textPrimary,
      }}
    >
      {/* 1. Tauri OS Titlebar */}
      <TitleBar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenComposer={() => {
          setComposerInitialLog(null);
          setIsComposerOpen(true);
        }}
        onOpenSqlConsole={() => setIsSqlConsoleOpen(true)}
        onOpenBreakpoints={() => setIsBreakpointsOpen(true)}
        onOpenTauriGuide={() => setIsTauriGuideOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExport={() => setIsExportOpen(true)}
        onImport={() => setIsExportOpen(true)}
        onToggleSimulate={() => setIsSimulating(!isSimulating)}
        isSimulating={isSimulating}
        logCount={logs.length}
      />

      {/* 2. Primary Control Toolbar */}
      <Toolbar
        settings={settings}
        logs={logs}
        filteredCount={filteredLogs.length}
        onUpdateSettings={handleUpdateSettings}
        onClearLogs={handleClearLogs}
        onInjectSampleTraffic={handleInjectSampleTraffic}
        onOpenExportModal={() => setIsExportOpen(true)}
      />

      {/* 3. Advanced Filter Bar */}
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        onResetFilters={() => setFilter(DEFAULT_FILTER)}
        themeId={settings.theme}
      />

      {/* 4. Split View Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Quick Navigation & Filter Dock (from Professional Polish Theme) */}
        <aside
          id="app-methods-sidebar"
          className="w-56 lg:w-60 border-r flex flex-col shrink-0 overflow-y-auto text-xs select-none transition-colors"
          style={{
            backgroundColor: currentTheme.bgSidebar,
            borderColor: currentTheme.borderColor,
          }}
        >
          {/* Methods Group */}
          <div className="p-3 flex flex-col gap-1 border-b border-[#2D333B]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1 font-mono">
              HTTP Methods
            </span>
            <button
              onClick={() => setFilter((p) => ({ ...p, methods: [] }))}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-all ${
                filter.methods.length === 0
                  ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                  : 'hover:bg-[#161B22] text-gray-400'
              }`}
            >
              <span>All Methods</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161B22] text-gray-400 border border-[#2D333B]">
                {logs.length}
              </span>
            </button>

            {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as HttpMethod[]).map((method) => {
              const count = logs.filter((l) => l.method === method).length;
              const isSelected = filter.methods.includes(method);
              return (
                <button
                  key={method}
                  onClick={() =>
                    setFilter((prev) => {
                      const exists = prev.methods.includes(method);
                      return {
                        ...prev,
                        methods: exists ? prev.methods.filter((m) => m !== method) : [...prev.methods, method],
                      };
                    })
                  }
                  className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                      : 'hover:bg-[#161B22] text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        method === 'GET'
                          ? 'bg-blue-400'
                          : method === 'POST'
                          ? 'bg-green-400'
                          : method === 'PUT'
                          ? 'bg-orange-400'
                          : method === 'DELETE'
                          ? 'bg-red-400'
                          : 'bg-purple-400'
                      }`}
                    />
                    <span>{method}</span>
                  </div>
                  <span className="text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Categories */}
          <div className="p-3 flex flex-col gap-1 border-b border-[#2D333B]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1 font-mono">
              Quick Views
            </span>
            <button
              onClick={() => setFilter((p) => ({ ...p, onlyErrors: !p.onlyErrors }))}
              className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors ${
                filter.onlyErrors
                  ? 'bg-red-500/20 text-red-400 font-semibold border border-red-500/30'
                  : 'hover:bg-[#161B22] text-gray-400'
              }`}
            >
              <span>4xx / 5xx Errors</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/40 text-red-400 font-mono">
                {logs.filter((l) => l.status >= 400 || l.status === 0).length}
              </span>
            </button>

            <button
              onClick={() => setFilter((p) => ({ ...p, onlyPinned: !p.onlyPinned }))}
              className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors ${
                filter.onlyPinned
                  ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30'
                  : 'hover:bg-[#161B22] text-gray-400'
              }`}
            >
              <span>Pinned Requests</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161B22] text-orange-400 font-mono">
                {logs.filter((l) => l.isPinned).length}
              </span>
            </button>
          </div>

          {/* Local SQLite Storage Widget */}
          <div className="mt-auto p-3 flex flex-col gap-2 bg-[#0D1117] border-t border-[#2D333B]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400 font-mono">SQLite DB Usage</span>
              <span className="text-blue-400 font-mono font-semibold">
                {(logs.length * 0.08 + 1.2).toFixed(1)} MB / 500 MB
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#21262D] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(3, (logs.length / 5000) * 100))}%` }}
              />
            </div>
            <button
              onClick={() => setIsSqlConsoleOpen(true)}
              className="w-full text-center py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[11px] text-gray-300 font-mono transition-colors"
            >
              Query SQL Storage
            </button>
          </div>
        </aside>

        {/* Center / Primary: Traffic Table List */}
        <TrafficTable
          logs={filteredLogs}
          selectedLogId={selectedLogId}
          onSelectLog={(log) => setSelectedLogId(log.id)}
          onTogglePin={handleTogglePin}
          onDeleteLog={handleDeleteLog}
          onReplayLog={handleReplayLog}
          themeId={settings.theme}
          autoScroll={settings.autoScroll}
          compact={settings.compactList}
        />

        {/* Right / Secondary: Inspector Panel */}
        {selectedLog && (
          <InspectorPanel
            key={selectedLog.id}
            log={selectedLog}
            allLogs={logs}
            onClose={() => setSelectedLogId(null)}
            onReplay={handleReplayLog}
            themeId={settings.theme}
          />
        )}
      </main>

      {/* 5. Professional Polish Telemetry Status Footer */}
      <footer
        id="app-bottom-status-bar"
        className="flex items-center justify-between px-4 py-1.5 border-t text-[11px] font-mono shrink-0 select-none transition-colors"
        style={{
          backgroundColor: currentTheme.bgSidebar,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textSecondary,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Tauri Desktop Bridge: Connected</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Proxy Port: <strong className="text-gray-200">{settings.proxyPort}</strong> (127.0.0.1)
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            SQLite Engine: <strong className="text-blue-400">v3.45 WAL Mode</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            Memory: <strong className="text-gray-200">{(logs.length * 0.04 + 18.4).toFixed(1)} MB</strong>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Platform: <strong className="text-purple-400 uppercase">{settings.osShellStyle} x64</strong>
          </span>
        </div>
      </footer>

      {/* Modals */}
      <RequestComposer
        isOpen={isComposerOpen}
        initialLog={composerInitialLog}
        onClose={() => setIsComposerOpen(false)}
        onSendRequest={handleSendFromComposer}
        themeId={settings.theme}
      />

      <SqlConsoleModal
        isOpen={isSqlConsoleOpen}
        onClose={() => setIsSqlConsoleOpen(false)}
        themeId={settings.theme}
      />

      <BreakpointsModal
        isOpen={isBreakpointsOpen}
        rules={breakpointRules}
        onSaveRules={setBreakpointRules}
        onClose={() => setIsBreakpointsOpen(false)}
        themeId={settings.theme}
      />

      <TauriGuideModal
        isOpen={isTauriGuideOpen}
        onClose={() => setIsTauriGuideOpen(false)}
        themeId={settings.theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        logs={logs}
        onImportLogs={handleImportLogs}
        onClose={() => setIsExportOpen(false)}
        themeId={settings.theme}
      />
    </div>
  );
}
