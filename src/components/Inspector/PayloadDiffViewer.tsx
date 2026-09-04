import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Columns,
  Copy,
  FileCode,
  FileJson,
  FileText,
  Filter,
  Layers,
  List,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { HttpLogEntry } from '../../types';
import { ThemeConfig } from '../../constants/themes';
import { DiffService, AlignedDiffRow, JsonKeyDifference } from '../../services/diffService';

interface PayloadDiffViewerProps {
  currentLog: HttpLogEntry;
  allLogs: HttpLogEntry[];
  theme: ThemeConfig;
}

type DiffTarget = 'response-body' | 'request-body' | 'response-headers' | 'request-headers' | 'metadata';
type ViewLayout = 'split' | 'unified';

export const PayloadDiffViewer: React.FC<PayloadDiffViewerProps> = ({
  currentLog,
  allLogs,
  theme,
}) => {
  // Target logs to compare: Left (Base) and Right (Comparison)
  const [leftLogId, setLeftLogId] = useState<string>(currentLog.id);
  const [rightLogId, setRightLogId] = useState<string>(() => {
    // Pick the most relevant comparison log (e.g. previous log or another log with the same path)
    const samePathOther = allLogs.find((l) => l.path === currentLog.path && l.id !== currentLog.id);
    if (samePathOther) return samePathOther.id;
    const anyOther = allLogs.find((l) => l.id !== currentLog.id);
    return anyOther ? anyOther.id : currentLog.id;
  });

  // Diff configuration state
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('response-body');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('split');
  const [formatJson, setFormatJson] = useState<boolean>(true);
  const [onlyChanges, setOnlyChanges] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showKeyDiffs, setShowKeyDiffs] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync left log when parent selected log changes if left log was currentLog
  useEffect(() => {
    setLeftLogId(currentLog.id);
    // If rightLog was the same as currentLog, pick a different one
    if (rightLogId === currentLog.id) {
      const other = allLogs.find((l) => l.id !== currentLog.id);
      if (other) setRightLogId(other.id);
    }
  }, [currentLog.id]);

  const leftLog = useMemo(
    () => allLogs.find((l) => l.id === leftLogId) || currentLog,
    [allLogs, leftLogId, currentLog]
  );
  const rightLog = useMemo(
    () => allLogs.find((l) => l.id === rightLogId) || currentLog,
    [allLogs, rightLogId, currentLog]
  );

  // Quick swap
  const handleSwapLogs = () => {
    const temp = leftLogId;
    setLeftLogId(rightLogId);
    setRightLogId(temp);
  };

  // Extract raw comparison text for both sides according to target
  const { rawTextLeft, rawTextRight, targetName } = useMemo(() => {
    switch (diffTarget) {
      case 'response-body':
        return {
          rawTextLeft: leftLog.responseBody || '',
          rawTextRight: rightLog.responseBody || '',
          targetName: 'Response Body',
        };
      case 'request-body':
        return {
          rawTextLeft: leftLog.requestBody || '',
          rawTextRight: rightLog.requestBody || '',
          targetName: 'Request Body',
        };
      case 'response-headers':
        return {
          rawTextLeft: JSON.stringify(leftLog.responseHeaders, null, 2),
          rawTextRight: JSON.stringify(rightLog.responseHeaders, null, 2),
          targetName: 'Response Headers',
        };
      case 'request-headers':
        return {
          rawTextLeft: JSON.stringify(leftLog.requestHeaders, null, 2),
          rawTextRight: JSON.stringify(rightLog.requestHeaders, null, 2),
          targetName: 'Request Headers',
        };
      case 'metadata':
        const metaLeft = {
          method: leftLog.method,
          url: leftLog.url,
          status: leftLog.status,
          statusText: leftLog.statusText,
          durationMs: leftLog.durationMs,
          requestSize: leftLog.requestSize,
          responseSize: leftLog.responseSize,
          contentType: leftLog.contentType,
          contentCategory: leftLog.contentCategory,
          ipAddress: leftLog.ipAddress,
        };
        const metaRight = {
          method: rightLog.method,
          url: rightLog.url,
          status: rightLog.status,
          statusText: rightLog.statusText,
          durationMs: rightLog.durationMs,
          requestSize: rightLog.requestSize,
          responseSize: rightLog.responseSize,
          contentType: rightLog.contentType,
          contentCategory: rightLog.contentCategory,
          ipAddress: rightLog.ipAddress,
        };
        return {
          rawTextLeft: JSON.stringify(metaLeft, null, 2),
          rawTextRight: JSON.stringify(metaRight, null, 2),
          targetName: 'Metadata',
        };
    }
  }, [diffTarget, leftLog, rightLog]);

  // Process text based on formatJson setting
  const { preparedLeft, preparedRight, isJson, jsonDiffs } = useMemo(() => {
    if (formatJson) {
      const leftCanon = DiffService.canonicalizeJson(rawTextLeft);
      const rightCanon = DiffService.canonicalizeJson(rawTextRight);

      let keyDiffs: JsonKeyDifference[] = [];
      if (leftCanon.isValidJson && rightCanon.isValidJson) {
        keyDiffs = DiffService.computeJsonDifferences(leftCanon.parsed, rightCanon.parsed);
      }

      return {
        preparedLeft: leftCanon.formatted || '(Empty Payload)',
        preparedRight: rightCanon.formatted || '(Empty Payload)',
        isJson: leftCanon.isValidJson && rightCanon.isValidJson,
        jsonDiffs: keyDiffs,
      };
    } else {
      return {
        preparedLeft: rawTextLeft || '(Empty Payload)',
        preparedRight: rawTextRight || '(Empty Payload)',
        isJson: false,
        jsonDiffs: [],
      };
    }
  }, [rawTextLeft, rawTextRight, formatJson]);

  // Compute aligned diff rows & summary
  const { rows, summary } = useMemo(() => {
    return DiffService.computeAlignedDiff(preparedLeft, preparedRight);
  }, [preparedLeft, preparedRight]);

  // Filter rows if "onlyChanges" or "searchQuery" is active
  const displayedRows = useMemo(() => {
    let result = rows;
    if (onlyChanges) {
      result = result.filter((r) => r.type !== 'equal');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.left && r.left.text.toLowerCase().includes(q)) ||
          (r.right && r.right.text.toLowerCase().includes(q))
      );
    }
    return result;
  }, [rows, onlyChanges, searchQuery]);

  // Synchronized scroll refs for side-by-side split view
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleScrollLeft = () => {
    if (isSyncingScroll.current) return;
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingScroll.current = true;
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const handleScrollRight = () => {
    if (isSyncingScroll.current) return;
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingScroll.current = true;
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyUnifiedDiff = () => {
    let output = `--- A: ${leftLog.method} ${leftLog.path} (${leftLog.status})\n`;
    output += `+++ B: ${rightLog.method} ${rightLog.path} (${rightLog.status})\n`;
    output += `@@ ${targetName} @@\n`;

    for (const r of rows) {
      if (r.type === 'equal') {
        output += `  ${r.left?.text || ''}\n`;
      } else if (r.type === 'delete') {
        output += `- ${r.left?.text || ''}\n`;
      } else if (r.type === 'add') {
        output += `+ ${r.right?.text || ''}\n`;
      } else if (r.type === 'modify') {
        output += `- ${r.left?.text || ''}\n`;
        output += `+ ${r.right?.text || ''}\n`;
      }
    }
    copyToClipboard(output, 'unified_diff');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs select-none">
      {/* 1. ENTRY SELECTOR BAR */}
      <div className="p-3 bg-[#0D1117] border-b border-[#2D333B] flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-gray-200">Side-by-Side Payload Comparator</span>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {summary.isIdentical ? (
              <span className="px-2 py-0.5 rounded-full bg-green-950/60 text-green-400 border border-green-800/40 flex items-center gap-1">
                <Check className="w-3 h-3" /> Identical
              </span>
            ) : (
              <>
                {summary.additions > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    +{summary.additions}
                  </span>
                )}
                {summary.deletions > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/40">
                    -{summary.deletions}
                  </span>
                )}
                {summary.modifications > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    ~{summary.modifications} altered
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dual Selectors: Left (Base) vs Right (Compare) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Left Entry Dropdown */}
          <div className="flex flex-col gap-1 bg-[#161B22] p-2 rounded-md border border-[#30363D]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Base Entry (Left)
              </span>
              <span className="text-gray-400 font-mono text-[10px]">
                {leftLog.durationMs}ms · {leftLog.responseSize} B
              </span>
            </div>
            <select
              id="select-diff-left-log"
              value={leftLogId}
              onChange={(e) => setLeftLogId(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono truncate"
            >
              {allLogs.map((l) => (
                <option key={`left-${l.id}`} value={l.id}>
                  [{l.method}] {l.status} — {l.path} ({l.durationMs}ms)
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapLogs}
            className="p-2 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 hover:text-white transition-colors"
            title="Swap Base and Comparison entries"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* Right Entry Dropdown */}
          <div className="flex flex-col gap-1 bg-[#161B22] p-2 rounded-md border border-[#30363D]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Comparison Entry (Right)
              </span>
              <span className="text-gray-400 font-mono text-[10px]">
                {rightLog.durationMs}ms · {rightLog.responseSize} B
              </span>
            </div>
            <select
              id="select-diff-right-log"
              value={rightLogId}
              onChange={(e) => setRightLogId(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-mono truncate"
            >
              {allLogs.map((l) => (
                <option key={`right-${l.id}`} value={l.id}>
                  [{l.method}] {l.status} — {l.path} ({l.durationMs}ms)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] text-gray-400 pb-0.5">
          <span className="shrink-0 text-gray-500">Quick Match:</span>
          {allLogs
            .filter((l) => l.path === currentLog.path && l.id !== currentLog.id)
            .slice(0, 2)
            .map((l) => (
              <button
                key={`suggest-same-${l.id}`}
                onClick={() => setRightLogId(l.id)}
                className="px-2 py-0.5 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 font-mono shrink-0 truncate max-w-[200px]"
                title={`Compare with ${l.method} ${l.status} at ${l.path}`}
              >
                Same Path: {l.status} ({l.durationMs}ms)
              </button>
            ))}
          {allLogs
            .filter((l) => (l.status >= 400 || l.status === 0) && l.id !== currentLog.id)
            .slice(0, 1)
            .map((l) => (
              <button
                key={`suggest-err-${l.id}`}
                onClick={() => setRightLogId(l.id)}
                className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 font-mono shrink-0"
              >
                Error Log: {l.status} {l.path}
              </button>
            ))}
        </div>
      </div>

      {/* 2. TARGET TABS & DIFF CONTROLS */}
      <div className="px-3 py-2 bg-[#161B22] border-b border-[#2D333B] flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Comparison Target Selection */}
        <div className="flex items-center gap-1 bg-[#0D1117] p-0.5 rounded-md border border-[#30363D]">
          <button
            onClick={() => setDiffTarget('response-body')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              diffTarget === 'response-body'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Response Body
          </button>
          <button
            onClick={() => setDiffTarget('request-body')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              diffTarget === 'request-body'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Request Body
          </button>
          <button
            onClick={() => setDiffTarget('response-headers')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              diffTarget === 'response-headers'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Headers
          </button>
          <button
            onClick={() => setDiffTarget('metadata')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              diffTarget === 'metadata'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
        </div>

        {/* View Mode & Filter Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Split vs Unified */}
          <div className="flex items-center bg-[#0D1117] p-0.5 rounded-md border border-[#30363D]">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                viewLayout === 'split' ? 'bg-[#21262D] text-blue-400 font-semibold' : 'text-gray-400 hover:text-white'
              }`}
              title="Split Side-by-Side View"
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewLayout('unified')}
              className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                viewLayout === 'unified' ? 'bg-[#21262D] text-blue-400 font-semibold' : 'text-gray-400 hover:text-white'
              }`}
              title="Unified Inline Diff View"
            >
              <List className="w-3 h-3" />
              <span>Unified</span>
            </button>
          </div>

          {/* Canonical JSON Format Toggle */}
          <button
            onClick={() => setFormatJson(!formatJson)}
            className={`px-2 py-1 rounded-md border text-[11px] flex items-center gap-1 transition-colors ${
              formatJson
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold'
                : 'bg-[#0D1117] text-gray-400 border-[#30363D] hover:bg-[#21262D]'
            }`}
            title="Auto-format and sort JSON keys canonically for clean comparison"
          >
            <FileJson className="w-3 h-3" />
            <span>Format JSON</span>
          </button>

          {/* Only Changes Toggle */}
          <button
            onClick={() => setOnlyChanges(!onlyChanges)}
            className={`px-2 py-1 rounded-md border text-[11px] flex items-center gap-1 transition-colors ${
              onlyChanges
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold'
                : 'bg-[#0D1117] text-gray-400 border-[#30363D] hover:bg-[#21262D]'
            }`}
            title="Hide unchanged identical lines to focus only on differences"
          >
            <Filter className="w-3 h-3" />
            <span>Diffs Only</span>
          </button>

          {/* Copy Actions */}
          <button
            onClick={handleCopyUnifiedDiff}
            className="px-2 py-1 rounded-md bg-[#0D1117] hover:bg-[#21262D] border border-[#30363D] text-gray-300 flex items-center gap-1 transition-colors"
            title="Copy patch diff to clipboard"
          >
            {copiedKey === 'unified_diff' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>Copy Diff</span>
          </button>
        </div>
      </div>

      {/* 3. SUBTLE JSON CHANGES DRAWER (When comparing structured JSON) */}
      {jsonDiffs.length > 0 && (
        <div className="border-b border-[#2D333B] bg-[#0D1117] shrink-0">
          <button
            onClick={() => setShowKeyDiffs(!showKeyDiffs)}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-300 hover:bg-[#161B22] transition-colors"
          >
            <div className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {jsonDiffs.length} Subtle JSON {jsonDiffs.length === 1 ? 'Difference' : 'Differences'} Detected
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[10px] font-normal text-gray-500">
                {showKeyDiffs ? 'Collapse details' : 'Expand details'}
              </span>
              {showKeyDiffs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showKeyDiffs && (
            <div className="px-3 pb-2.5 max-h-36 overflow-y-auto flex flex-col gap-1 text-[11px] font-mono">
              {jsonDiffs.map((diff, idx) => (
                <div
                  key={`kdiff-${idx}`}
                  className="px-2 py-1 rounded bg-[#161B22] border border-[#2D333B] flex items-center justify-between gap-2 overflow-hidden"
                >
                  <span className="font-semibold text-blue-400 shrink-0 truncate max-w-[200px]" title={diff.path}>
                    {diff.path}:
                  </span>

                  {diff.type === 'changed' && (
                    <div className="flex items-center gap-1.5 truncate text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 line-through truncate max-w-[160px]">
                        {JSON.stringify(diff.leftValue)}
                      </span>
                      <span className="text-gray-500">➔</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold truncate max-w-[160px]">
                        {JSON.stringify(diff.rightValue)}
                      </span>
                    </div>
                  )}

                  {diff.type === 'added' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px]">
                      + Added: {JSON.stringify(diff.rightValue)}
                    </span>
                  )}

                  {diff.type === 'removed' && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 text-[10px] line-through">
                      - Removed: {JSON.stringify(diff.leftValue)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-3 py-1.5 bg-[#0D1117] border-b border-[#2D333B] flex items-center gap-2 shrink-0">
        <div className="flex-1 relative flex items-center rounded border px-2 py-0.5 bg-[#161B22] border-[#30363D] focus-within:border-blue-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-gray-500 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within compared payloads..."
            className="w-full bg-transparent focus:outline-none text-[11px] text-gray-200 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white text-[10px] p-0.5 font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-[11px] text-gray-400 shrink-0 font-mono">
          Showing {displayedRows.length} of {rows.length} lines
        </div>
      </div>

      {/* 4. MAIN DIFF CONTENT: SPLIT OR UNIFIED */}
      <div className="flex-1 overflow-hidden bg-[#0A0D12]">
        {summary.isIdentical && !onlyChanges ? (
          <div className="p-8 flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-200">Both Payloads Are Identical</h4>
              <p className="text-gray-500 text-xs mt-1 max-w-sm">
                There are no differences between the {targetName.toLowerCase()} of {leftLog.method} {leftLog.path} and{' '}
                {rightLog.method} {rightLog.path}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyChanges(false)}
                className="px-3 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-300 transition-colors text-xs"
              >
                Inspect Matching Lines ({rows.length})
              </button>
            </div>
          </div>
        ) : viewLayout === 'split' ? (
          /* SIDE-BY-SIDE (SPLIT) VIEW */
          <div className="grid grid-cols-2 h-full divide-x divide-[#2D333B] overflow-hidden">
            {/* Left Column (Base) */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-3 py-1.5 bg-[#161B22] border-b border-[#2D333B] flex items-center justify-between text-[11px] font-mono text-gray-300 shrink-0">
                <span className="font-semibold text-blue-400 truncate">
                  Base: {leftLog.method} {leftLog.status} ({leftLog.durationMs}ms)
                </span>
                <button
                  onClick={() => copyToClipboard(preparedLeft, 'copy_left')}
                  className="p-1 rounded hover:bg-[#21262D] text-gray-400 hover:text-white"
                  title="Copy Base payload"
                >
                  {copiedKey === 'copy_left' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div
                ref={leftScrollRef}
                onScroll={handleScrollLeft}
                className="flex-1 overflow-auto font-mono text-[11px] leading-5"
              >
                {displayedRows.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No matching lines found.</div>
                ) : (
                  displayedRows.map((row) => {
                    const isDelete = row.type === 'delete' || row.type === 'modify';
                    const isEmpty = !row.left;

                    return (
                      <div
                        key={`left-row-${row.id}`}
                        className={`flex items-start min-w-full ${
                          isDelete
                            ? 'bg-rose-950/30 text-rose-200 border-l-2 border-rose-500'
                            : isEmpty
                            ? 'bg-[#0D1117]/60 text-transparent'
                            : 'text-gray-300 hover:bg-[#161B22]/50'
                        }`}
                      >
                        {/* Line number */}
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-600 select-none shrink-0 border-r border-[#2D333B]/50 bg-[#0D1117]/30">
                          {row.left?.lineNum || ''}
                        </div>

                        {/* Sign */}
                        <div className="w-4 text-center py-0.5 text-[10px] shrink-0 font-bold">
                          {isDelete ? '-' : ''}
                        </div>

                        {/* Text */}
                        <div className="px-2 py-0.5 whitespace-pre flex-1 overflow-hidden truncate">
                          {row.left?.tokens ? (
                            row.left.tokens.map((token, tIdx) => (
                              <span
                                key={`token-l-${tIdx}`}
                                className={
                                  token.type === 'delete'
                                    ? 'bg-rose-600/40 text-rose-100 rounded px-0.5 font-bold'
                                    : ''
                                }
                              >
                                {token.text}
                              </span>
                            ))
                          ) : (
                            row.left?.text || (isEmpty ? '\u00A0' : '')
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column (Comparison) */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-3 py-1.5 bg-[#161B22] border-b border-[#2D333B] flex items-center justify-between text-[11px] font-mono text-gray-300 shrink-0">
                <span className="font-semibold text-purple-400 truncate">
                  Compare: {rightLog.method} {rightLog.status} ({rightLog.durationMs}ms)
                </span>
                <button
                  onClick={() => copyToClipboard(preparedRight, 'copy_right')}
                  className="p-1 rounded hover:bg-[#21262D] text-gray-400 hover:text-white"
                  title="Copy Comparison payload"
                >
                  {copiedKey === 'copy_right' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div
                ref={rightScrollRef}
                onScroll={handleScrollRight}
                className="flex-1 overflow-auto font-mono text-[11px] leading-5"
              >
                {displayedRows.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No matching lines found.</div>
                ) : (
                  displayedRows.map((row) => {
                    const isAdd = row.type === 'add' || row.type === 'modify';
                    const isEmpty = !row.right;

                    return (
                      <div
                        key={`right-row-${row.id}`}
                        className={`flex items-start min-w-full ${
                          isAdd
                            ? 'bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500'
                            : isEmpty
                            ? 'bg-[#0D1117]/60 text-transparent'
                            : 'text-gray-300 hover:bg-[#161B22]/50'
                        }`}
                      >
                        {/* Line number */}
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-600 select-none shrink-0 border-r border-[#2D333B]/50 bg-[#0D1117]/30">
                          {row.right?.lineNum || ''}
                        </div>

                        {/* Sign */}
                        <div className="w-4 text-center py-0.5 text-[10px] shrink-0 font-bold text-emerald-400">
                          {isAdd ? '+' : ''}
                        </div>

                        {/* Text */}
                        <div className="px-2 py-0.5 whitespace-pre flex-1 overflow-hidden truncate">
                          {row.right?.tokens ? (
                            row.right.tokens.map((token, tIdx) => (
                              <span
                                key={`token-r-${tIdx}`}
                                className={
                                  token.type === 'add'
                                    ? 'bg-emerald-600/40 text-emerald-100 rounded px-0.5 font-bold'
                                    : ''
                                }
                              >
                                {token.text}
                              </span>
                            ))
                          ) : (
                            row.right?.text || (isEmpty ? '\u00A0' : '')
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* UNIFIED (INLINE) VIEW */
          <div className="flex flex-col h-full overflow-auto font-mono text-[11px] leading-5">
            <div className="px-3 py-1.5 bg-[#161B22] border-b border-[#2D333B] flex items-center justify-between text-[11px] text-gray-300 shrink-0">
              <span className="font-semibold text-gray-200">
                Unified Diff: {leftLog.path} ({leftLog.status} ➔ {rightLog.status})
              </span>
              <span className="text-gray-500 text-[10px]">
                - Base ({leftLog.id.slice(0, 8)}) | + Compare ({rightLog.id.slice(0, 8)})
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {displayedRows.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No matching lines found.</div>
              ) : (
                displayedRows.map((row) => {
                  if (row.type === 'equal') {
                    return (
                      <div
                        key={`uni-eq-${row.id}`}
                        className="flex items-start hover:bg-[#161B22]/40 text-gray-400 min-w-full"
                      >
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-600 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.left?.lineNum}
                        </div>
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-600 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.right?.lineNum}
                        </div>
                        <div className="w-5 text-center text-gray-600 shrink-0"> </div>
                        <div className="px-2 py-0.5 whitespace-pre flex-1 truncate">{row.left?.text}</div>
                      </div>
                    );
                  }

                  if (row.type === 'delete') {
                    return (
                      <div
                        key={`uni-del-${row.id}`}
                        className="flex items-start bg-rose-950/30 text-rose-200 border-l-2 border-rose-500 min-w-full"
                      >
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-rose-400 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.left?.lineNum}
                        </div>
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-700 select-none shrink-0 border-r border-[#2D333B]/50">
                          -
                        </div>
                        <div className="w-5 text-center text-rose-400 font-bold shrink-0">-</div>
                        <div className="px-2 py-0.5 whitespace-pre flex-1 truncate">{row.left?.text}</div>
                      </div>
                    );
                  }

                  if (row.type === 'add') {
                    return (
                      <div
                        key={`uni-add-${row.id}`}
                        className="flex items-start bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500 min-w-full"
                      >
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-700 select-none shrink-0 border-r border-[#2D333B]/50">
                          -
                        </div>
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-emerald-400 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.right?.lineNum}
                        </div>
                        <div className="w-5 text-center text-emerald-400 font-bold shrink-0">+</div>
                        <div className="px-2 py-0.5 whitespace-pre flex-1 truncate">{row.right?.text}</div>
                      </div>
                    );
                  }

                  // Modified: show delete row then add row
                  return (
                    <React.Fragment key={`uni-mod-${row.id}`}>
                      <div className="flex items-start bg-rose-950/30 text-rose-200 border-l-2 border-rose-500 min-w-full">
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-rose-400 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.left?.lineNum}
                        </div>
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-700 select-none shrink-0 border-r border-[#2D333B]/50">
                          -
                        </div>
                        <div className="w-5 text-center text-rose-400 font-bold shrink-0">-</div>
                        <div className="px-2 py-0.5 whitespace-pre flex-1 truncate">
                          {row.left?.tokens ? (
                            row.left.tokens.map((t, idx) => (
                              <span
                                key={`ut-l-${idx}`}
                                className={
                                  t.type === 'delete' ? 'bg-rose-600/40 text-rose-100 rounded px-0.5 font-bold' : ''
                                }
                              >
                                {t.text}
                              </span>
                            ))
                          ) : (
                            row.left?.text
                          )}
                        </div>
                      </div>

                      <div className="flex items-start bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500 min-w-full">
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-gray-700 select-none shrink-0 border-r border-[#2D333B]/50">
                          -
                        </div>
                        <div className="w-10 px-2 py-0.5 text-right text-[10px] text-emerald-400 select-none shrink-0 border-r border-[#2D333B]/50">
                          {row.right?.lineNum}
                        </div>
                        <div className="w-5 text-center text-emerald-400 font-bold shrink-0">+</div>
                        <div className="px-2 py-0.5 whitespace-pre flex-1 truncate">
                          {row.right?.tokens ? (
                            row.right.tokens.map((t, idx) => (
                              <span
                                key={`ut-r-${idx}`}
                                className={
                                  t.type === 'add' ? 'bg-emerald-600/40 text-emerald-100 rounded px-0.5 font-bold' : ''
                                }
                              >
                                {t.text}
                              </span>
                            ))
                          ) : (
                            row.right?.text
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
