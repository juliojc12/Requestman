import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Layers,
  Plus,
  RotateCw,
  Send,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { HttpLogEntry, HttpMethod, ThemeId } from '../types';
import { THEMES } from '../constants/themes';
import { TrafficService } from '../services/trafficService';

interface RequestComposerProps {
  initialLog?: HttpLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (log: HttpLogEntry) => void;
  themeId: ThemeId;
}

interface HeaderRow {
  key: string;
  value: string;
  enabled: boolean;
}

export const RequestComposer: React.FC<RequestComposerProps> = ({
  initialLog,
  isOpen,
  onClose,
  onSendRequest,
  themeId,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];

  const [method, setMethod] = useState<HttpMethod>(initialLog?.method || 'POST');
  const [url, setUrl] = useState<string>(
    initialLog?.url || 'https://api.acme-cloud.io/v2/auth/token'
  );
  const [headers, setHeaders] = useState<HeaderRow[]>(() => {
    if (initialLog?.requestHeaders) {
      return Object.entries(initialLog.requestHeaders).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));
    }
    return [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer demo_mock_token_sample', enabled: true },
      { key: 'X-Client-Platform', value: 'Tauri-Desktop-Linux', enabled: true },
    ];
  });

  const [body, setBody] = useState<string>(() => {
    if (initialLog?.requestBody) return initialLog.requestBody;
    return JSON.stringify(
      {
        grant_type: 'password',
        client_id: 'netspy_desktop_pro',
        username: 'dev_julio@workspace.internal',
      },
      null,
      2
    );
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

  if (!isOpen) return null;

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleUpdateHeader = (index: number, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: val };
    setHeaders(updated);
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const headerMap: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.enabled && h.key.trim()) {
          headerMap[h.key.trim()] = h.value;
        }
      });

      const resultLog = await TrafficService.executeRealRequest(
        method,
        url,
        headerMap,
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? body : undefined
      );

      onSendRequest(resultLog);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (presetUrl: string, presetMethod: HttpMethod, presetBody: string) => {
    setUrl(presetUrl);
    setMethod(presetMethod);
    setBody(presetBody);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="modal-request-composer"
        className="w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
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
            <Send className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm">HTTP Request Composer & Dispatcher</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL Bar */}
        <div className="p-4 flex flex-col gap-3">
          {/* Method & URL Input */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="px-3 py-2 rounded-lg border font-bold bg-black/40 text-cyan-300 focus:outline-none focus:border-cyan-500"
              style={{ borderColor: currentTheme.borderColor }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1/resource"
              className="flex-1 px-3 py-2 rounded-lg border bg-black/30 text-neutral-100 focus:outline-none focus:border-cyan-500"
              style={{ borderColor: currentTheme.borderColor }}
            />

            <button
              id="btn-composer-send"
              onClick={handleSend}
              disabled={isLoading || !url}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-neutral-400 font-medium">Presets:</span>
            <button
              onClick={() =>
                loadPreset(
                  'https://api.acme-cloud.io/v2/auth/token',
                  'POST',
                  JSON.stringify({ username: 'dev_julio', grant_type: 'password' }, null, 2)
                )
              }
              className="px-2 py-0.5 rounded bg-black/20 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
            >
              Auth Token (POST)
            </button>
            <button
              onClick={() =>
                loadPreset(
                  'https://api.acme-cloud.io/v2/users/me/workspace',
                  'GET',
                  ''
                )
              }
              className="px-2 py-0.5 rounded bg-black/20 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
            >
              Workspace (GET)
            </button>
            <button
              onClick={() =>
                loadPreset(
                  'https://payment.stripe.com/v1/payment_intents',
                  'POST',
                  JSON.stringify({ amount: 4900, currency: 'usd' }, null, 2)
                )
              }
              className="px-2 py-0.5 rounded bg-black/20 hover:bg-neutral-800 border border-neutral-700 text-neutral-300"
            >
              Stripe Intent (POST)
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 border-b text-xs font-semibold" style={{ borderColor: currentTheme.borderColor }}>
            <button
              onClick={() => setActiveTab('body')}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === 'body'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Request Body (JSON)
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === 'headers'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Headers ({headers.filter((h) => h.enabled && h.key).length})
            </button>
          </div>

          {/* Body Editor Tab */}
          {activeTab === 'body' && (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="JSON or raw payload body here..."
                className="w-full p-3 font-mono text-xs rounded-lg border bg-black/40 text-neutral-100 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                style={{ borderColor: currentTheme.borderColor }}
              />
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Valid JSON formatted payloads are recommended.</span>
                <button
                  onClick={() => {
                    try {
                      setBody(JSON.stringify(JSON.parse(body), null, 2));
                    } catch {}
                  }}
                  className="hover:text-cyan-400"
                >
                  Prettify JSON
                </button>
              </div>
            </div>
          )}

          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto font-mono text-xs">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) => handleUpdateHeader(i, 'enabled', e.target.checked)}
                    className="rounded text-cyan-500"
                  />
                  <input
                    type="text"
                    value={h.key}
                    onChange={(e) => handleUpdateHeader(i, 'key', e.target.value)}
                    placeholder="Header Key (e.g. Authorization)"
                    className="flex-1 px-2.5 py-1.5 rounded border bg-black/30 text-neutral-200 focus:outline-none focus:border-cyan-500"
                    style={{ borderColor: currentTheme.borderColor }}
                  />
                  <input
                    type="text"
                    value={h.value}
                    onChange={(e) => handleUpdateHeader(i, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-2.5 py-1.5 rounded border bg-black/30 text-neutral-200 focus:outline-none focus:border-cyan-500"
                    style={{ borderColor: currentTheme.borderColor }}
                  />
                  <button
                    onClick={() => handleRemoveHeader(i)}
                    className="p-1 text-neutral-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddHeader}
                className="self-start flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Header</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
