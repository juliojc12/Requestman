export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type HttpStatusCategory = '2xx' | '3xx' | '4xx' | '5xx' | 'error';

export type ContentCategory = 'json' | 'xml' | 'html' | 'text' | 'form' | 'image' | 'javascript' | 'css' | 'other';

export interface HttpTimingBreakdown {
  dns: number;       // ms
  connect: number;   // ms
  ssl: number;       // ms
  ttfb: number;      // ms
  download: number;  // ms
  total: number;     // ms
}

export interface HttpRequestData {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  protocol: 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3' | 'HTTPS';
  host: string;
  path: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  parsedBody?: any;
  contentType?: string;
  sizeBytes: number;
}

export interface HttpResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  parsedBody?: any;
  contentType?: string;
  sizeBytes: number;
  timing: HttpTimingBreakdown;
}

export interface HttpLogEntry {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  host: string;
  path: string;
  protocol: string;
  status: number;
  statusText: string;
  requestSize: number;
  responseSize: number;
  durationMs: number;
  contentType: string;
  contentCategory: ContentCategory;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody?: string;
  timing: HttpTimingBreakdown;
  tags?: string[];
  isPinned?: boolean;
  notes?: string;
  isMocked?: boolean;
  isIntercepted?: boolean;
  ipAddress?: string;
}

export interface FilterState {
  searchQuery: string;
  searchRegex: boolean;
  searchInHeaders: boolean;
  searchInBody: boolean;
  methods: HttpMethod[];
  statusCategories: HttpStatusCategory[];
  contentCategories: ContentCategory[];
  hostFilter: string;
  minDurationMs: number;
  maxDurationMs: number;
  onlyPinned: boolean;
  onlyErrors: boolean;
}

export type ThemeId =
  | 'cyber-dark'
  | 'dracula'
  | 'nord'
  | 'monokai'
  | 'tokyo-night'
  | 'github-dark'
  | 'slate-light'
  | 'solarized-light';

export type OsShellStyle = 'windows' | 'linux' | 'macos';

export type ThrottleProfile = 'none' | 'slow-3g' | 'fast-3g' | '4g' | 'offline' | 'custom';

export interface AppSettings {
  theme: ThemeId;
  osShellStyle: OsShellStyle;
  proxyPort: number;
  isRecording: boolean;
  autoScroll: boolean;
  maxLogsInSqlite: number;
  throttleProfile: ThrottleProfile;
  customLatencyMs: number;
  showTimingWaterfall: boolean;
  compactList: boolean;
  fontSize: 'sm' | 'base' | 'lg';
}

export interface BreakpointRule {
  id: string;
  name: string;
  enabled: boolean;
  urlPattern: string;
  method: HttpMethod | 'ALL';
  phase: 'request' | 'response' | 'both';
  action: 'pause' | 'mock' | 'modify';
  mockStatus?: number;
  mockResponseBody?: string;
  mockResponseHeaders?: Record<string, string>;
}

export interface SQLiteQueryResult {
  columns: string[];
  rows: any[][];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}
