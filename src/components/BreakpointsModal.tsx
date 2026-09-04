import React, { useState } from 'react';
import {
  Check,
  Edit2,
  Plus,
  Radio,
  Sliders,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { BreakpointRule, HttpMethod, ThemeId } from '../types';
import { THEMES } from '../constants/themes';

interface BreakpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: BreakpointRule[];
  onSaveRules: (rules: BreakpointRule[]) => void;
  themeId: ThemeId;
}

export const BreakpointsModal: React.FC<BreakpointsModalProps> = ({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  themeId,
}) => {
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];
  const [localRules, setLocalRules] = useState<BreakpointRule[]>(rules);

  if (!isOpen) return null;

  const handleAddRule = () => {
    const newRule: BreakpointRule = {
      id: 'rule_' + Date.now(),
      name: 'Mock Auth 401 Unauthorized',
      enabled: true,
      urlPattern: '*/v2/auth/*',
      method: 'ALL',
      phase: 'request',
      action: 'mock',
      mockStatus: 401,
      mockResponseBody: JSON.stringify({ error: 'Session token expired', code: 'UNAUTHORIZED' }, null, 2),
    };
    const updated = [...localRules, newRule];
    setLocalRules(updated);
    onSaveRules(updated);
  };

  const handleToggleRule = (id: string) => {
    const updated = localRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setLocalRules(updated);
    onSaveRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = localRules.filter((r) => r.id !== id);
    setLocalRules(updated);
    onSaveRules(updated);
  };

  const handleUpdateRule = (id: string, updates: Partial<BreakpointRule>) => {
    const updated = localRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    setLocalRules(updated);
    onSaveRules(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="modal-breakpoints"
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans"
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
            <Radio className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">Interception Rules & Response Mocking</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules List */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Define URL matching patterns to pause requests or inject mock responses automatically.
            </span>
            <button
              onClick={handleAddRule}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
          </div>

          {localRules.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border border-dashed rounded-lg border-neutral-800">
              No interception rules defined yet. Click "Add Rule" above.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {localRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-lg border flex flex-col gap-2 bg-black/30"
                  style={{ borderColor: currentTheme.borderColor }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="rounded text-amber-500"
                      />
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                        className="font-semibold text-xs bg-transparent focus:outline-none border-b border-dashed border-neutral-700 hover:border-neutral-500 px-1"
                        style={{ color: currentTheme.textPrimary }}
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-neutral-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-neutral-500 block mb-0.5">URL Glob Pattern:</span>
                      <input
                        type="text"
                        value={rule.urlPattern}
                        onChange={(e) => handleUpdateRule(rule.id, { urlPattern: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-black/40 border border-neutral-800 text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block mb-0.5">Action:</span>
                      <select
                        value={rule.action}
                        onChange={(e) => handleUpdateRule(rule.id, { action: e.target.value as any })}
                        className="w-full px-2 py-1 rounded bg-black/40 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="mock">Inject Mock Response</option>
                        <option value="pause">Pause for Manual Edit</option>
                      </select>
                    </div>
                  </div>

                  {rule.action === 'mock' && (
                    <div className="flex flex-col gap-1 text-xs font-mono mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500">Mock Status:</span>
                        <input
                          type="number"
                          value={rule.mockStatus || 200}
                          onChange={(e) => handleUpdateRule(rule.id, { mockStatus: Number(e.target.value) })}
                          className="w-20 px-2 py-0.5 rounded bg-black/40 border border-neutral-800 text-amber-300"
                        />
                      </div>
                      <textarea
                        value={rule.mockResponseBody || ''}
                        onChange={(e) => handleUpdateRule(rule.id, { mockResponseBody: e.target.value })}
                        rows={3}
                        placeholder="Mock JSON response payload..."
                        className="w-full p-2 text-[11px] rounded bg-black/40 border border-neutral-800 text-neutral-200 resize-none font-mono"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
