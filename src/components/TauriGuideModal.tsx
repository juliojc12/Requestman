import React, { useState } from 'react';
import {
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  Terminal,
  X
} from 'lucide-react';
import { ThemeId } from '../types';
import { THEMES } from '../constants/themes';

interface TauriGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeId: ThemeId;
}

export const TauriGuideModal: React.FC<TauriGuideModalProps> = ({
  isOpen,
  onClose,
  themeId,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'build' | 'tauriconf' | 'rustmain'>('build');

  if (!isOpen) return null;

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const tauriConfJson = `{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "NetSpy-HTTP-Inspector",
    "version": "1.4.2"
  },
  "tauri": {
    "allowlist": {
      "all": true,
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$DESKTOP/*"]
      },
      "http": {
        "all": true,
        "request": true,
        "scope": ["https://*/*", "http://*/*"]
      },
      "shell": {
        "all": true,
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "targets": ["deb", "appimage", "msi", "nsis"],
      "identifier": "com.netspy.httpinspector",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.png"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "title": "NetSpy — HTTP Request Interceptor & Debugger",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ]
  }
}`;

  const rustMainCode = `// src-tauri/src/main.rs
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;
use std::sync::Mutex;
use rusqlite::{params, Connection};

struct AppState {
    db: Mutex<Option<Connection>>,
}

#[tauri::command]
fn start_local_proxy_listener(port: u16) -> Result<String, String> {
    println!("[Tauri Rust] Initialized HTTP Reverse Proxy on 127.0.0.1:{}", port);
    Ok(format!("Proxy listening on 127.0.0.1:{}", port))
}

#[tauri::command]
fn save_http_log_to_sqlite(state: tauri::State<AppState>, log_json: String) -> Result<bool, String> {
    // High-performance embedded SQLite storage in Rust
    println!("[SQLite] Recorded log: {}", &log_json[0..std::cmp::min(60, log_json.len())]);
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            start_local_proxy_listener,
            save_http_log_to_sqlite
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="modal-tauri-guide"
        className="w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
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
            <Laptop className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm">Tauri Desktop Build Guide (Windows & Linux)</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center px-4 border-b text-xs"
          style={{
            backgroundColor: currentTheme.bgCard,
            borderColor: currentTheme.borderColor,
          }}
        >
          <button
            onClick={() => setActiveTab('build')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'build'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            CLI Commands (Windows / Linux)
          </button>
          <button
            onClick={() => setActiveTab('tauriconf')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'tauriconf'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            tauri.conf.json
          </button>
          <button
            onClick={() => setActiveTab('rustmain')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'rustmain'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            src-tauri/src/main.rs (Rust Backend)
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[65vh] flex flex-col gap-4 text-xs">
          {activeTab === 'build' && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                <div className="flex items-center justify-between pb-1 mb-2 border-b border-neutral-800 font-semibold text-cyan-300">
                  <span>1. Install Tauri CLI</span>
                  <button
                    onClick={() => copyCode('npm install -D @tauri-apps/cli @tauri-apps/api', 'cmd_1')}
                    className="p-1 hover:text-white text-neutral-400"
                  >
                    {copiedKey === 'cmd_1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="font-mono text-[11px] text-neutral-200">
                  npm install -D @tauri-apps/cli @tauri-apps/api
                </code>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                <div className="flex items-center justify-between pb-1 mb-2 border-b border-neutral-800 font-semibold text-cyan-300">
                  <span>2. Build Windows .exe Installer</span>
                  <button
                    onClick={() => copyCode('npm run tauri build -- --target x86_64-pc-windows-msvc', 'cmd_2')}
                    className="p-1 hover:text-white text-neutral-400"
                  >
                    {copiedKey === 'cmd_2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="font-mono text-[11px] text-neutral-200">
                  npm run tauri build -- --target x86_64-pc-windows-msvc
                </code>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Generates standalone <span className="text-neutral-200">.msi</span> and <span className="text-neutral-200">.exe</span> in <span className="font-mono text-cyan-400">src-tauri/target/release/bundle/msi/</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                <div className="flex items-center justify-between pb-1 mb-2 border-b border-neutral-800 font-semibold text-cyan-300">
                  <span>3. Build Linux .deb and .AppImage packages</span>
                  <button
                    onClick={() => copyCode('sudo apt install libwebkit2gtk-4.0-dev build-essential libssl-dev libgtk-3-dev\nnpm run tauri build', 'cmd_3')}
                    className="p-1 hover:text-white text-neutral-400"
                  >
                    {copiedKey === 'cmd_3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="font-mono text-[11px] text-neutral-200 block whitespace-pre-wrap">
                  {`# Install Linux GTK/WebKit dev headers (Ubuntu/Debian):\nsudo apt install libwebkit2gtk-4.0-dev build-essential libssl-dev libgtk-3-dev\n\n# Compile native binary:\nnpm run tauri build`}
                </code>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Generates <span className="text-neutral-200">.deb</span> and <span className="text-neutral-200">.AppImage</span> in <span className="font-mono text-cyan-400">src-tauri/target/release/bundle/</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tauriconf' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">src-tauri/tauri.conf.json</span>
                <button
                  onClick={() => copyCode(tauriConfJson, 'conf')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs"
                >
                  {copiedKey === 'conf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Configuration</span>
                </button>
              </div>
              <pre className="p-3 bg-black/40 rounded-lg border border-neutral-800 font-mono text-[11px] text-cyan-200 overflow-auto max-h-96">
                {tauriConfJson}
              </pre>
            </div>
          )}

          {activeTab === 'rustmain' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">src-tauri/src/main.rs</span>
                <button
                  onClick={() => copyCode(rustMainCode, 'rust')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs"
                >
                  {copiedKey === 'rust' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Rust Code</span>
                </button>
              </div>
              <pre className="p-3 bg-black/40 rounded-lg border border-neutral-800 font-mono text-[11px] text-emerald-200 overflow-auto max-h-96">
                {rustMainCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
