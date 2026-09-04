import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileJson,
  FileText,
  GitCompare,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  RotateCw,
  Search,
  Send,
  Shield,
  Sliders,
  Terminal,
  Zap
} from 'lucide-react';
import { HttpLogEntry, ThemeId } from '../../types';
import { THEMES } from '../../constants/themes';
import { ExportService } from '../../services/exportService';

interface InspectorPanelProps {
  log: HttpLogEntry;
  allLogs: HttpLogEntry[];
  onClose: () => void;
  onReplay: (log: HttpLogEntry) => void;
  themeId: ThemeId;
}

type InspectorTab = 'overview' | 'request-body' | 'response-body' | 'timings' | 'code' | 'diff';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  log,
  allLogs,
  onClose,
  onReplay,
  themeId,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawViewMode, setRawViewMode] = useState(false);
  const [diffLogId, setDiffLogId] = useState<string>(
    allLogs.find((l) => l.id !== log.id)?.id || ''
  );
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'fetch' | 'python'>('curl');

  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatJson = (str?: string): { formatted: string; isJson: boolean } => {
    if (!str) return { formatted: '', isJson: false };
    try {
      const obj = JSON.parse(str);
      return { formatted: JSON.stringify(obj, null, 2), isJson: true };
    } catch {
      return { formatted: str, isJson: false };
    }
  };

  const reqBodyInfo = formatJson(log.requestBody);
  const resBodyInfo = formatJson(log.responseBody);

  const diffTargetLog = allLogs.find((l) => l.id === diffLogId);

  // Extract query parameters
  const queryParams: Record<string, string> = {};
  try {
    const u = new URL(log.url);
    u.searchParams.forEach((v, k) => {
      queryParams[k] = v;
    });
  } catch {}

  const hasQueryParams = Object.keys(queryParams).length > 0;
  const hasRequestBody = Boolean(log.requestBody && log.requestBody.trim().length > 0);
  const hasResponseBody = Boolean(log.responseBody && log.responseBody.trim().length > 0);

  return (
    <div
      id="inspector-panel"
      className="w-[520px] md:w-[600px] lg:w-[680px] border-l flex flex-col h-full overflow-hidden select-none transition-colors"
      style={{
        backgroundColor: currentTheme.bgSidebar,
        borderColor: currentTheme.borderColor,
      }}
    >
      {/* Header Bar with Status & Replay */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: currentTheme.bgHeader,
          borderColor: currentTheme.borderColor,
        }}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
              log.method === 'GET'
                ? currentTheme.badgeGet
                : log.method === 'POST'
                ? currentTheme.badgePost
                : log.method === 'PUT'
                ? currentTheme.badgePut
                : currentTheme.badgeDelete
            }`}
          >
            {log.method}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
              log.status >= 200 && log.status < 300
                ? currentTheme.status2xx
                : log.status >= 400
                ? currentTheme.status4xx
                : currentTheme.statusError
            }`}
          >
            {log.status === 0 ? 'Network Error' : `${log.status} ${log.statusText}`}
          </span>
          <span
            className="text-xs font-mono truncate max-w-[240px]"
            style={{ color: currentTheme.textPrimary }}
            title={log.path}
          >
            {log.path}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onReplay(log)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 transition-colors"
            title="Replay this HTTP Request in Composer"
          >
            <RotateCw className="w-3 h-3" />
            <span>Replay</span>
          </button>
          <button
            onClick={() => copyToClipboard(ExportService.generateCurl(log), 'curl_top')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 transition-colors"
            title="Copy as cURL"
          >
            {copiedKey === 'curl_top' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>cURL</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#21262D] text-gray-400 hover:text-white"
            title="Close Inspector"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        className="flex items-center px-3 border-b text-xs overflow-x-auto shrink-0 font-medium bg-[#161B22] border-[#2D333B]"
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Headers & Params</span>
        </button>

        <button
          onClick={() => setActiveTab('request-body')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'request-body'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>Payload {hasRequestBody && '•'}</span>
        </button>

        <button
          onClick={() => setActiveTab('response-body')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'response-body'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Response {hasResponseBody && '•'}</span>
        </button>

        <button
          onClick={() => setActiveTab('timings')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'timings'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Waterfall ({log.durationMs}ms)</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'code'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Code Snippets</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'diff'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Diff</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono select-text">
        {/* TAB 1: OVERVIEW & HEADERS */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* General Info Card */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{
                backgroundColor: currentTheme.bgCard,
                borderColor: currentTheme.borderColor,
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: currentTheme.borderColor }}>
                <span className="font-sans font-semibold text-xs tracking-wider uppercase" style={{ color: currentTheme.textSecondary }}>
                  General Summary
                </span>
                <span className="text-[10px] opacity-70">ID: {log.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                <div>
                  <span className="opacity-60">Request URL:</span>
                  <div className="font-semibold text-cyan-300 break-all">{log.url}</div>
                </div>
                <div>
                  <span className="opacity-60">Status:</span>
                  <div className="font-semibold">{log.status} {log.statusText}</div>
                </div>
                <div>
                  <span className="opacity-60">Remote IP:</span>
                  <div>{log.ipAddress || '127.0.0.1'}</div>
                </div>
                <div>
                  <span className="opacity-60">Protocol:</span>
                  <div>{log.protocol || 'HTTP/1.1'}</div>
                </div>
                <div>
                  <span className="opacity-60">Transfer Size:</span>
                  <div>Req: {log.requestSize} B / Res: {log.responseSize} B</div>
                </div>
                <div>
                  <span className="opacity-60">Duration:</span>
                  <div className="font-semibold text-emerald-400">{log.durationMs} ms</div>
                </div>
              </div>
            </div>

            {/* Query Parameters */}
            {hasQueryParams && (
              <div
                className="p-3 rounded-lg border flex flex-col gap-2"
                style={{
                  backgroundColor: currentTheme.bgCard,
                  borderColor: currentTheme.borderColor,
                }}
              >
                <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: currentTheme.borderColor }}>
                  <span className="font-sans font-semibold text-xs tracking-wider uppercase" style={{ color: currentTheme.textSecondary }}>
                    Query Parameters ({Object.keys(queryParams).length})
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(queryParams, null, 2), 'query_params')}
                    className="p-1 text-neutral-400 hover:text-neutral-200"
                    title="Copy Query Parameters JSON"
                  >
                    {copiedKey === 'query_params' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="flex flex-col divide-y" style={{ borderColor: currentTheme.borderColor }}>
                  {Object.entries(queryParams).map(([key, val]) => (
                    <div key={key} className="py-1 flex items-start gap-2 text-[11px]">
                      <span className="font-semibold text-cyan-400 min-w-[120px]">{key}:</span>
                      <span className="text-neutral-200 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Headers */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{
                backgroundColor: currentTheme.bgCard,
                borderColor: currentTheme.borderColor,
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: currentTheme.borderColor }}>
                <span className="font-sans font-semibold text-xs tracking-wider uppercase" style={{ color: currentTheme.textSecondary }}>
                  Request Headers ({Object.keys(log.requestHeaders).length})
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(log.requestHeaders, null, 2), 'req_headers')}
                  className="p-1 text-neutral-400 hover:text-neutral-200"
                  title="Copy Request Headers JSON"
                >
                  {copiedKey === 'req_headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex flex-col divide-y" style={{ borderColor: currentTheme.borderColor }}>
                {Object.entries(log.requestHeaders).map(([key, val]) => (
                  <div key={key} className="py-1 flex items-start gap-2 text-[11px]">
                    <span className="font-semibold text-sky-400 min-w-[160px] truncate" title={key}>
                      {key}:
                    </span>
                    <span className="text-neutral-200 break-all">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Headers */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{
                backgroundColor: currentTheme.bgCard,
                borderColor: currentTheme.borderColor,
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: currentTheme.borderColor }}>
                <span className="font-sans font-semibold text-xs tracking-wider uppercase" style={{ color: currentTheme.textSecondary }}>
                  Response Headers ({Object.keys(log.responseHeaders).length})
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(log.responseHeaders, null, 2), 'res_headers')}
                  className="p-1 text-neutral-400 hover:text-neutral-200"
                  title="Copy Response Headers JSON"
                >
                  {copiedKey === 'res_headers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {Object.keys(log.responseHeaders).length === 0 ? (
                <div className="text-neutral-400 text-xs py-1">No response headers recorded.</div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: currentTheme.borderColor }}>
                  {Object.entries(log.responseHeaders).map(([key, val]) => (
                    <div key={key} className="py-1 flex items-start gap-2 text-[11px]">
                      <span className="font-semibold text-emerald-400 min-w-[160px] truncate" title={key}>
                        {key}:
                      </span>
                      <span className="text-neutral-200 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REQUEST PAYLOAD */}
        {activeTab === 'request-body' && (
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans font-semibold text-xs text-neutral-400 uppercase">
                  Request Payload Body
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-neutral-700">
                  {log.requestSize} Bytes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRawViewMode(!rawViewMode)}
                  className="px-2 py-0.5 rounded text-[11px] border border-neutral-700 hover:bg-neutral-800"
                >
                  {rawViewMode ? 'Formatted' : 'Raw'}
                </button>
                <button
                  onClick={() => copyToClipboard(log.requestBody || '', 'req_body')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-neutral-700 hover:bg-neutral-800"
                >
                  {copiedKey === 'req_body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {!hasRequestBody ? (
              <div className="p-8 text-center text-neutral-500 bg-black/20 rounded-lg border border-dashed border-neutral-800">
                No request payload sent for this {log.method} request.
              </div>
            ) : (
              <pre
                className="p-3.5 rounded-lg bg-black/40 border border-neutral-800 text-[11px] leading-relaxed overflow-auto max-h-[500px]"
                style={{ color: currentTheme.textPrimary }}
              >
                {rawViewMode ? log.requestBody : reqBodyInfo.formatted}
              </pre>
            )}
          </div>
        )}

        {/* TAB 3: RESPONSE BODY */}
        {activeTab === 'response-body' && (
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans font-semibold text-xs text-neutral-400 uppercase">
                  Response Payload Body
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-neutral-700">
                  {log.contentType}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-neutral-700">
                  {log.responseSize} Bytes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRawViewMode(!rawViewMode)}
                  className="px-2 py-0.5 rounded text-[11px] border border-neutral-700 hover:bg-neutral-800"
                >
                  {rawViewMode ? 'Formatted' : 'Raw'}
                </button>
                <button
                  onClick={() => copyToClipboard(log.responseBody || '', 'res_body')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-neutral-700 hover:bg-neutral-800"
                >
                  {copiedKey === 'res_body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {!hasResponseBody ? (
              <div className="p-8 text-center text-neutral-500 bg-black/20 rounded-lg border border-dashed border-neutral-800">
                No response body received (204 No Content or empty payload).
              </div>
            ) : (
              <pre
                className="p-3.5 rounded-lg bg-black/40 border border-neutral-800 text-[11px] leading-relaxed overflow-auto max-h-[500px]"
                style={{ color: currentTheme.textPrimary }}
              >
                {rawViewMode ? log.responseBody : resBodyInfo.formatted}
              </pre>
            )}
          </div>
        )}

        {/* TAB 4: TIMINGS & WATERFALL */}
        {activeTab === 'timings' && (
          <div className="flex flex-col gap-4">
            <div
              className="p-4 rounded-lg border flex flex-col gap-3"
              style={{
                backgroundColor: currentTheme.bgCard,
                borderColor: currentTheme.borderColor,
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: currentTheme.borderColor }}>
                <span className="font-sans font-semibold text-xs uppercase" style={{ color: currentTheme.textSecondary }}>
                  Latency Breakdown Waterfall
                </span>
                <span className="text-sm font-bold text-emerald-400">{log.durationMs} ms Total</span>
              </div>

              {/* Graphical waterfall bars */}
              <div className="flex flex-col gap-2 pt-1 text-[11px]">
                {/* DNS */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 w-36">DNS Lookup:</span>
                  <div className="flex-1 mx-3 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-400 h-full rounded-full"
                      style={{ width: `${Math.max(5, (log.timing.dns / log.timing.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold">{log.timing.dns} ms</span>
                </div>

                {/* TCP Connect */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 w-36">TCP Connection:</span>
                  <div className="flex-1 mx-3 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full"
                      style={{ width: `${Math.max(5, (log.timing.connect / log.timing.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold">{log.timing.connect} ms</span>
                </div>

                {/* SSL Handshake */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 w-36">TLS / SSL Handshake:</span>
                  <div className="flex-1 mx-3 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${Math.max(5, (log.timing.ssl / log.timing.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold">{log.timing.ssl} ms</span>
                </div>

                {/* TTFB */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 w-36">Waiting (TTFB):</span>
                  <div className="flex-1 mx-3 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full"
                      style={{ width: `${Math.max(5, (log.timing.ttfb / log.timing.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold text-emerald-300">{log.timing.ttfb} ms</span>
                </div>

                {/* Content Download */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 w-36">Content Download:</span>
                  <div className="flex-1 mx-3 bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${Math.max(5, (log.timing.download / log.timing.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold">{log.timing.download} ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CODE SNIPPETS */}
        {activeTab === 'code' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCodeLanguage('curl')}
                className={`px-3 py-1 rounded text-xs border font-medium ${
                  codeLanguage === 'curl'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setCodeLanguage('fetch')}
                className={`px-3 py-1 rounded text-xs border font-medium ${
                  codeLanguage === 'fetch'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                JavaScript fetch()
              </button>
              <button
                onClick={() => setCodeLanguage('python')}
                className={`px-3 py-1 rounded text-xs border font-medium ${
                  codeLanguage === 'python'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Python requests
              </button>

              <button
                onClick={() => {
                  const snippet =
                    codeLanguage === 'curl'
                      ? ExportService.generateCurl(log)
                      : codeLanguage === 'fetch'
                      ? ExportService.generateFetch(log)
                      : ExportService.generatePython(log);
                  copyToClipboard(snippet, 'code_snippet');
                }}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
              >
                {copiedKey === 'code_snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Snippet</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-lg bg-black/40 border border-neutral-800 text-[11px] leading-relaxed overflow-auto max-h-[440px] text-cyan-200">
              {codeLanguage === 'curl' && ExportService.generateCurl(log)}
              {codeLanguage === 'fetch' && ExportService.generateFetch(log)}
              {codeLanguage === 'python' && ExportService.generatePython(log)}
            </pre>
          </div>
        )}

        {/* TAB 6: DIFF TOOL */}
        {activeTab === 'diff' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Compare with:</span>
              <select
                value={diffLogId}
                onChange={(e) => setDiffLogId(e.target.value)}
                className="bg-black/30 border border-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
              >
                {allLogs
                  .filter((l) => l.id !== log.id)
                  .map((l) => (
                    <option key={l.id} value={l.id} className="bg-neutral-900 text-neutral-200">
                      [{l.method}] {l.status} — {l.path} ({l.durationMs}ms)
                    </option>
                  ))}
              </select>
            </div>

            {diffTargetLog ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-black/30 border border-neutral-800 flex flex-col gap-2">
                  <div className="font-bold text-cyan-400 pb-1 border-b border-neutral-800">
                    Current Request ({log.method} {log.status})
                  </div>
                  <div className="text-[10px] space-y-1">
                    <div><strong>URL:</strong> {log.url}</div>
                    <div><strong>Duration:</strong> {log.durationMs} ms</div>
                    <div><strong>Payload size:</strong> {log.responseSize} B</div>
                    <pre className="mt-2 p-2 bg-black/50 rounded overflow-auto max-h-44 text-[10px]">
                      {log.responseBody || '[No Body]'}
                    </pre>
                  </div>
                </div>

                <div className="p-3 rounded bg-black/30 border border-neutral-800 flex flex-col gap-2">
                  <div className="font-bold text-amber-400 pb-1 border-b border-neutral-800">
                    Compared Request ({diffTargetLog.method} {diffTargetLog.status})
                  </div>
                  <div className="text-[10px] space-y-1">
                    <div><strong>URL:</strong> {diffTargetLog.url}</div>
                    <div><strong>Duration:</strong> {diffTargetLog.durationMs} ms ({diffTargetLog.durationMs - log.durationMs > 0 ? `+${(diffTargetLog.durationMs - log.durationMs).toFixed(1)}` : (diffTargetLog.durationMs - log.durationMs).toFixed(1)} ms)</div>
                    <div><strong>Payload size:</strong> {diffTargetLog.responseSize} B</div>
                    <pre className="mt-2 p-2 bg-black/50 rounded overflow-auto max-h-44 text-[10px]">
                      {diffTargetLog.responseBody || '[No Body]'}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-neutral-500">
                Please select another request to compare.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
