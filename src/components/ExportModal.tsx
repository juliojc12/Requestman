import React, { useRef } from 'react';
import {
  Archive,
  Database,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { HttpLogEntry, ThemeId } from '../types';
import { THEMES } from '../constants/themes';
import { ExportService } from '../services/exportService';
import { sqliteService } from '../services/sqliteService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: HttpLogEntry[];
  onImportLogs: (logs: HttpLogEntry[]) => void;
  themeId: ThemeId;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  logs,
  onImportLogs,
  themeId,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    ExportService.exportToJson(logs);
    onClose();
  };

  const handleExportHar = () => {
    ExportService.exportToHar(logs);
    onClose();
  };

  const handleExportCsv = () => {
    ExportService.exportToCsv(logs);
    onClose();
  };

  const handleExportSqlite = async () => {
    const data = await sqliteService.exportDatabaseBinary();
    if (data) {
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netspy-logs-${Date.now()}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await ExportService.parseImportedFile(file);
      onImportLogs(imported);
      onClose();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div
        id="modal-export-import"
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col"
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
            <Download className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm">Export / Import HTTP Logs</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          <div className="text-neutral-300">
            Export {logs.length} captured request logs in your preferred format:
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* JSON Export */}
            <button
              onClick={handleExportJson}
              className="p-3 rounded-lg border border-neutral-800 bg-black/30 hover:border-cyan-500/60 flex flex-col gap-1 text-left transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <FileCode className="w-4 h-4" />
                <span>JSON Logs</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Full structured JSON array of requests, responses, headers & timestamps.
              </span>
            </button>

            {/* HAR 1.2 Export */}
            <button
              onClick={handleExportHar}
              className="p-3 rounded-lg border border-neutral-800 bg-black/30 hover:border-cyan-500/60 flex flex-col gap-1 text-left transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-purple-300">
                <Archive className="w-4 h-4" />
                <span>HAR 1.2 Archive</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Standard HTTP Archive format for Chrome DevTools, Charles, Postman & Insomnia.
              </span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCsv}
              className="p-3 rounded-lg border border-neutral-800 bg-black/30 hover:border-cyan-500/60 flex flex-col gap-1 text-left transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV Spreadsheet</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Tabular summary for analysis in Excel, Google Sheets, or data pipelines.
              </span>
            </button>

            {/* SQLite Binary Export */}
            <button
              onClick={handleExportSqlite}
              className="p-3 rounded-lg border border-neutral-800 bg-black/30 hover:border-cyan-500/60 flex flex-col gap-1 text-left transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Database className="w-4 h-4" />
                <span>SQLite (.sqlite)</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Complete binary SQLite database file with indexes and table schema.
              </span>
            </button>
          </div>

          {/* Import section */}
          <div className="border-t pt-4 flex items-center justify-between" style={{ borderColor: currentTheme.borderColor }}>
            <div>
              <div className="font-semibold text-neutral-200">Import Logs</div>
              <div className="text-[11px] text-neutral-400">Restore logs from a previous JSON or HAR file</div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.har"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-black/40 hover:bg-neutral-800 text-neutral-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
