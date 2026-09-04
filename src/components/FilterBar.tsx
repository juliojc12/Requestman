import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Code,
  FileCode,
  Filter,
  Layers,
  Pin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { ContentCategory, FilterState, HttpMethod, HttpStatusCategory, ThemeId } from '../types';
import { THEMES } from '../constants/themes';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (updater: FilterState | ((prev: FilterState) => FilterState)) => void;
  onResetFilters: () => void;
  themeId: ThemeId;
}

const ALL_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALL_STATUS_CATEGORIES: { id: HttpStatusCategory; label: string }[] = [
  { id: '2xx', label: '2xx Success' },
  { id: '3xx', label: '3xx Redirect' },
  { id: '4xx', label: '4xx Client Err' },
  { id: '5xx', label: '5xx Server Err' },
  { id: 'error', label: 'Network Errs' },
];

const ALL_CONTENT_CATEGORIES: { id: ContentCategory; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'form', label: 'Form' },
  { id: 'html', label: 'HTML' },
  { id: 'xml', label: 'XML' },
  { id: 'image', label: 'Image' },
  { id: 'javascript', label: 'JS/CSS' },
  { id: 'text', label: 'Text' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  onResetFilters,
  themeId,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const currentTheme = THEMES[themeId] || THEMES['cyber-dark'];

  const toggleMethod = (method: HttpMethod) => {
    onFilterChange((prev) => {
      const exists = prev.methods.includes(method);
      return {
        ...prev,
        methods: exists ? prev.methods.filter((m) => m !== method) : [...prev.methods, method],
      };
    });
  };

  const toggleStatusCategory = (cat: HttpStatusCategory) => {
    onFilterChange((prev) => {
      const exists = prev.statusCategories.includes(cat);
      return {
        ...prev,
        statusCategories: exists
          ? prev.statusCategories.filter((c) => c !== cat)
          : [...prev.statusCategories, cat],
      };
    });
  };

  const toggleContentCategory = (cat: ContentCategory) => {
    onFilterChange((prev) => {
      const exists = prev.contentCategories.includes(cat);
      return {
        ...prev,
        contentCategories: exists
          ? prev.contentCategories.filter((c) => c !== cat)
          : [...prev.contentCategories, cat],
      };
    });
  };

  const isFilterActive =
    filter.searchQuery !== '' ||
    filter.methods.length > 0 ||
    filter.statusCategories.length > 0 ||
    filter.contentCategories.length > 0 ||
    filter.onlyPinned ||
    filter.onlyErrors ||
    filter.minDurationMs > 0;

  return (
    <div
      id="app-filter-bar"
      className="px-3 py-2 border-b flex flex-col gap-2 text-xs transition-colors"
      style={{
        backgroundColor: currentTheme.bgCard,
        borderColor: currentTheme.borderColor,
      }}
    >
      {/* Primary Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div
          className="relative flex-1 min-w-[240px] flex items-center rounded-md border px-2.5 py-1 bg-[#0D1117] border-[#30363D] focus-within:border-blue-500 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-gray-500 mr-2 shrink-0" />
          <input
            id="input-filter-search"
            type="text"
            value={filter.searchQuery}
            onChange={(e) => onFilterChange((p) => ({ ...p, searchQuery: e.target.value }))}
            placeholder="Filter by URL, host, path, status, header, or payload body..."
            className="w-full bg-transparent focus:outline-none text-xs text-gray-200 placeholder-gray-500"
          />

          {filter.searchQuery && (
            <button
              onClick={() => onFilterChange((p) => ({ ...p, searchQuery: '' }))}
              className="p-0.5 hover:text-gray-200 text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* HTTP Method Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => onFilterChange((p) => ({ ...p, methods: [] }))}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors ${
              filter.methods.length === 0
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-semibold'
                : 'bg-[#21262D] hover:bg-[#30363D] text-gray-400 border-[#30363D]'
            }`}
          >
            All Methods
          </button>
          {ALL_METHODS.map((method) => {
            const isSelected = filter.methods.includes(method);
            return (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm font-semibold'
                    : 'bg-[#21262D] hover:bg-[#30363D] text-gray-400 border-[#30363D]'
                }`}
              >
                {method}
              </button>
            );
          })}
        </div>

        {/* Pinned Only Button */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, onlyPinned: !p.onlyPinned }))}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
            filter.onlyPinned
              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
              : 'bg-[#21262D] hover:bg-[#30363D] text-gray-400 border-[#30363D]'
          }`}
          title="Show only pinned requests"
        >
          <Pin className="w-3 h-3 fill-current" />
          <span>Pinned</span>
        </button>

        {/* Errors Only Button */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, onlyErrors: !p.onlyErrors }))}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
            filter.onlyErrors
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-[#21262D] hover:bg-[#30363D] text-gray-400 border-[#30363D]'
          }`}
          title="Show only 4xx/5xx error responses"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Errors</span>
        </button>

        {/* Advanced Filters Drawer Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors ${
            showAdvanced || filter.statusCategories.length > 0 || filter.contentCategories.length > 0
              ? 'bg-[#21262D] text-blue-400 border-blue-500/40'
              : 'bg-[#21262D] hover:bg-[#30363D] text-gray-400 border-[#30363D]'
          }`}
          title="Toggle Status Code & Content Type filters"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Filters</span>
        </button>

        {/* Reset Filter Button */}
        {isFilterActive && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-gray-400 hover:text-white bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors"
            title="Clear all active filters"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Sub-Bar (Expandable) */}
      {showAdvanced && (
        <div
          className="pt-2 border-t flex flex-col gap-2 text-[11px]"
          style={{ borderColor: currentTheme.borderColor }}
        >
          {/* Status Categories */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-mono">Status:</span>
            {ALL_STATUS_CATEGORIES.map((cat) => {
              const isSelected = filter.statusCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleStatusCategory(cat.id)}
                  className={`px-2 py-0.5 rounded font-mono border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold'
                      : 'hover:bg-neutral-800/40 border-neutral-700/50 text-neutral-400'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Content Type Categories */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-mono">Type:</span>
            {ALL_CONTENT_CATEGORIES.map((cat) => {
              const isSelected = filter.contentCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleContentCategory(cat.id)}
                  className={`px-2 py-0.5 rounded font-mono border transition-all ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-semibold'
                      : 'hover:bg-neutral-800/40 border-neutral-700/50 text-neutral-400'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}

            {/* Regex search toggle & scope */}
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer text-neutral-400 hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={filter.searchRegex}
                  onChange={(e) => onFilterChange((p) => ({ ...p, searchRegex: e.target.checked }))}
                  className="rounded border-neutral-700 text-cyan-500"
                />
                <span className="font-mono">.* Regex</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-neutral-400 hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={filter.searchInBody}
                  onChange={(e) => onFilterChange((p) => ({ ...p, searchInBody: e.target.checked }))}
                  className="rounded border-neutral-700 text-cyan-500"
                />
                <span>Payload Body</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-neutral-400 hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={filter.searchInHeaders}
                  onChange={(e) => onFilterChange((p) => ({ ...p, searchInHeaders: e.target.checked }))}
                  className="rounded border-neutral-700 text-cyan-500"
                />
                <span>Headers</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
