import React from 'react';
import {
  Check,
  Globe,
  HardDrive,
  Laptop,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Sun,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { AppSettings, OsShellStyle, ThemeId, ThrottleProfile } from '../types';
import { THEMES } from '../constants/themes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const currentTheme = THEMES[settings.theme] || THEMES['cyber-dark'];

  if (!isOpen) return null;

  const handleThemeSelect = (themeId: ThemeId) => {
    onUpdateSettings({ theme: themeId });
  };

  const handleOsSelect = (os: OsShellStyle) => {
    onUpdateSettings({ osShellStyle: os });
  };

  const handleThrottleSelect = (throttle: ThrottleProfile) => {
    onUpdateSettings({ throttleProfile: throttle });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div
        id="modal-settings"
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: currentTheme.bgSidebar,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            backgroundColor: currentTheme.bgHeader,
            borderColor: currentTheme.borderColor,
          }}
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm">Application Preferences & Themes</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 overflow-y-auto max-h-[70vh] flex flex-col gap-6 text-xs">
          {/* Section 1: Themes */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300 text-sm flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Interface Theme</span>
              </span>
              <span className="text-[11px] text-neutral-400">
                {THEMES[settings.theme]?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.values(THEMES).map((th) => {
                const isSelected = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => handleThemeSelect(th.id)}
                    className={`p-2.5 rounded-lg border flex flex-col gap-2 text-left transition-all relative ${
                      isSelected
                        ? 'border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                    style={{ backgroundColor: th.bgMain }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]" style={{ color: th.textPrimary }}>
                        {th.name.split(' ')[0]}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.accent }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.bgCard }} />
                      <span className="w-3 h-3 rounded-full border" style={{ borderColor: th.borderColor }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Desktop OS Titlebar Frame */}
          <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: currentTheme.borderColor }}>
            <span className="font-semibold text-neutral-300 text-sm flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-purple-400" />
              <span>Desktop Shell Style (Tauri Frame)</span>
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'windows', label: 'Windows 11', desc: 'Title bar on left, Min/Max/Close on right' },
                { id: 'linux', label: 'Linux (Ubuntu/GNOME)', desc: 'Tauri native tag & clean layout' },
                { id: 'macos', label: 'macOS', desc: 'Traffic light controls on left' },
              ].map((os) => {
                const isSelected = settings.osShellStyle === os.id;
                return (
                  <button
                    key={os.id}
                    onClick={() => handleOsSelect(os.id as OsShellStyle)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500 text-neutral-100 shadow-sm'
                        : 'bg-black/20 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{os.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div className="text-[10px] opacity-70 mt-1">{os.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Network Latency Throttling */}
          <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: currentTheme.borderColor }}>
            <span className="font-semibold text-neutral-300 text-sm flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-amber-400" />
              <span>Network Throttling Simulation</span>
            </span>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'none', label: 'No Throttling', delay: '0ms' },
                { id: '4g', label: 'Fast 4G', delay: '+35ms' },
                { id: 'fast-3g', label: 'Fast 3G', delay: '+180ms' },
                { id: 'slow-3g', label: 'Slow 3G', delay: '+500ms' },
                { id: 'offline', label: 'Offline', delay: 'Drop' },
              ].map((th) => {
                const isSelected = settings.throttleProfile === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => handleThrottleSelect(th.id as ThrottleProfile)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 font-semibold shadow-sm'
                        : 'bg-black/20 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[11px]">{th.label}</div>
                    <div className="text-[10px] opacity-70 font-mono mt-0.5">{th.delay}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Proxy Listener & SQLite Storage */}
          <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: currentTheme.borderColor }}>
            <span className="font-semibold text-neutral-300 text-sm flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>Proxy & SQLite Storage Engine</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-black/20 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px]">Local Proxy Interceptor Port:</span>
                <input
                  type="number"
                  value={settings.proxyPort}
                  onChange={(e) => onUpdateSettings({ proxyPort: Number(e.target.value) || 8899 })}
                  className="px-2.5 py-1.5 rounded bg-black/40 border border-neutral-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-black/20 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400 text-[11px]">Max Stored Logs in SQLite:</span>
                <input
                  type="number"
                  value={settings.maxLogsInSqlite}
                  onChange={(e) => onUpdateSettings({ maxLogsInSqlite: Number(e.target.value) || 5000 })}
                  className="px-2.5 py-1.5 rounded bg-black/40 border border-neutral-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
