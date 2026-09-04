import { ContentCategory, HttpLogEntry, HttpMethod, HttpResponseData, HttpTimingBreakdown } from '../types';

export class TrafficService {
  private static idCounter = 1;

  public static generateId(): string {
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  public static determineContentCategory(contentType: string): ContentCategory {
    const ct = contentType.toLowerCase();
    if (ct.includes('application/json') || ct.includes('+json')) return 'json';
    if (ct.includes('text/html')) return 'html';
    if (ct.includes('application/xml') || ct.includes('text/xml')) return 'xml';
    if (ct.includes('application/javascript') || ct.includes('text/javascript')) return 'javascript';
    if (ct.includes('text/css')) return 'css';
    if (ct.includes('image/')) return 'image';
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) return 'form';
    if (ct.includes('text/')) return 'text';
    return 'other';
  }

  public static createTimingBreakdown(totalMs: number): HttpTimingBreakdown {
    const dns = Math.max(1, Math.round(totalMs * 0.08));
    const connect = Math.max(2, Math.round(totalMs * 0.12));
    const ssl = Math.max(2, Math.round(totalMs * 0.15));
    const ttfb = Math.max(5, Math.round(totalMs * 0.50));
    const download = Math.max(1, totalMs - dns - connect - ssl - ttfb);
    return {
      dns,
      connect,
      ssl,
      ttfb,
      download,
      total: Math.round(totalMs * 10) / 10,
    };
  }

  public static async executeRealRequest(
    method: HttpMethod,
    url: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<HttpLogEntry> {
    const startTime = performance.now();
    const parsedUrl = new URL(url);
    const host = parsedUrl.host;
    const path = parsedUrl.pathname + parsedUrl.search;

    const queryParams: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'NetSpy-Tauri-HTTP-Inspector/1.0',
      'Accept': '*/*',
      'X-Request-Id': `req-${Date.now()}`,
      ...headers,
    };

    const reqSize = (body ? new Blob([body]).size : 0) + JSON.stringify(requestHeaders).length;

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        mode: 'cors',
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body) {
        fetchOptions.body = body;
      }

      const res = await fetch(url, fetchOptions);
      const endTime = performance.now();
      const durationMs = Math.max(12, Math.round((endTime - startTime) * 10) / 10);

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const responseContentType = res.headers.get('content-type') || 'text/plain';
      let responseBodyText = '';
      try {
        responseBodyText = await res.text();
      } catch (err) {
        responseBodyText = '[Unable to decode binary stream payload]';
      }

      const resSize = new Blob([responseBodyText]).size + JSON.stringify(responseHeaders).length;

      const entry: HttpLogEntry = {
        id: TrafficService.generateId(),
        timestamp: Date.now(),
        method,
        url,
        host,
        path,
        protocol: parsedUrl.protocol.toUpperCase().replace(':', ''),
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : 'Response'),
        requestSize: reqSize,
        responseSize: resSize,
        durationMs,
        contentType: responseContentType,
        contentCategory: TrafficService.determineContentCategory(responseContentType),
        requestHeaders,
        requestBody: body,
        responseHeaders,
        responseBody: responseBodyText,
        timing: TrafficService.createTimingBreakdown(durationMs),
        isIntercepted: true,
        ipAddress: '127.0.0.1',
      };

      return entry;
    } catch (err: any) {
      const endTime = performance.now();
      const durationMs = Math.round((endTime - startTime) * 10) / 10;

      const entry: HttpLogEntry = {
        id: TrafficService.generateId(),
        timestamp: Date.now(),
        method,
        url,
        host,
        path,
        protocol: parsedUrl.protocol.toUpperCase().replace(':', ''),
        status: 0,
        statusText: 'ERR_CONNECTION_REFUSED / CORS_BLOCKED',
        requestSize: reqSize,
        responseSize: 0,
        durationMs,
        contentType: 'text/plain',
        contentCategory: 'other',
        requestHeaders,
        requestBody: body,
        responseHeaders: {},
        responseBody: `Error: ${err.message || 'Request failed to reach destination or was blocked by CORS policy.'}`,
        timing: TrafficService.createTimingBreakdown(durationMs),
        isIntercepted: true,
        ipAddress: '127.0.0.1',
      };

      return entry;
    }
  }

  public static getRealisticMockScenarios(): HttpLogEntry[] {
    const now = Date.now();

    const mockTemplates: Array<Omit<HttpLogEntry, 'id' | 'timestamp'>> = [
      {
        method: 'POST',
        url: 'https://api.acme-cloud.io/v2/auth/token',
        host: 'api.acme-cloud.io',
        path: '/v2/auth/token',
        protocol: 'HTTPS',
        status: 200,
        statusText: 'OK',
        requestSize: 342,
        responseSize: 1048,
        durationMs: 78.4,
        contentType: 'application/json; charset=utf-8',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'api.acme-cloud.io',
          'Content-Type': 'application/json',
          'User-Agent': 'AcmeDesktopClient/3.4.1 (Linux x86_64; Tauri)',
          'X-Device-Fingerprint': 'a98f7bc2e-9912',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        requestBody: JSON.stringify(
          {
            grant_type: 'password',
            client_id: 'app_desktop_prod_992',
            username: 'dev_julio@workspace.internal',
            scope: 'openid profile email api:write',
          },
          null,
          2
        ),
        responseHeaders: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '994',
          'X-Response-Time': '42ms',
          'Server': 'cloudflare',
        },
        responseBody: JSON.stringify(
          {
            token_type: 'Bearer',
            expires_in: 86400,
            access_token: 'demo_oauth_token_mock_12345',
            refresh_token: 'demo_refresh_token_mock_67890',
            user: {
              id: 'usr_88921',
              name: 'Julio Dev',
              email: 'dev_julio@workspace.internal',
              role: 'lead_architect',
              teams: ['frontend-core', 'infrastructure-devops'],
            },
          },
          null,
          2
        ),
        timing: { dns: 6, connect: 12, ssl: 18, ttfb: 38, download: 4.4, total: 78.4 },
        tags: ['auth', 'jwt', 'security'],
        ipAddress: '104.21.55.19',
      },
      {
        method: 'GET',
        url: 'https://api.acme-cloud.io/v2/users/me/workspace?expand=repositories,integrations',
        host: 'api.acme-cloud.io',
        path: '/v2/users/me/workspace?expand=repositories,integrations',
        protocol: 'HTTPS',
        status: 200,
        statusText: 'OK',
        requestSize: 220,
        responseSize: 3410,
        durationMs: 142.0,
        contentType: 'application/json; charset=utf-8',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'api.acme-cloud.io',
          'Authorization': 'Bearer demo_mock_token_sample',
          'Accept': 'application/json',
          'X-Request-Trace': 'trace-98319-df92',
        },
        responseHeaders: {
          'Content-Type': 'application/json; charset=utf-8',
          'ETag': 'W/"99bfa4-399182"',
          'X-Cache': 'MISS',
          'Server': 'envoy/1.28.0',
        },
        responseBody: JSON.stringify(
          {
            workspace: {
              id: 'ws_prod_01',
              title: 'Tauri & React Interceptor Core',
              active_nodes: 14,
              storage_engine: 'SQLite3_Local_WASM',
              repositories: [
                { id: 'repo_1', name: 'http-interceptor-tauri', branch: 'main', dirty: false },
                { id: 'repo_2', name: 'microservice-proxy-mesh', branch: 'feat/rust-bridge', dirty: true },
              ],
              integrations: {
                sqlite_version: '3.45.1',
                proxy_listener: '127.0.0.1:8899',
                har_export_enabled: true,
              },
            },
          },
          null,
          2
        ),
        timing: { dns: 4, connect: 15, ssl: 20, ttfb: 92, download: 11, total: 142.0 },
        tags: ['workspace', 'config'],
        ipAddress: '104.21.55.19',
      },
      {
        method: 'POST',
        url: 'https://payment.stripe.com/v1/payment_intents',
        host: 'payment.stripe.com',
        path: '/v1/payment_intents',
        protocol: 'HTTPS',
        status: 201,
        statusText: 'Created',
        requestSize: 450,
        responseSize: 1820,
        durationMs: 312.5,
        contentType: 'application/json; charset=utf-8',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'payment.stripe.com',
          'Authorization': 'Bearer demo_payment_token_mock',
          'Content-Type': 'application/json',
          'Stripe-Version': '2024-04-10',
          'Idempotency-Key': 'idemp_998124_uuid',
        },
        requestBody: JSON.stringify(
          {
            amount: 4900,
            currency: 'usd',
            description: 'Tauri Desktop Pro Developer License (Perpetual)',
            payment_method_types: ['card', 'pix'],
            receipt_email: 'juliojc12@gmail.com',
            metadata: {
              product_id: 'netspy_pro_desktop',
              platform: 'linux_x86_64',
            },
          },
          null,
          2
        ),
        responseHeaders: {
          'Content-Type': 'application/json; charset=utf-8',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Request-Id': 'req_stripe_9921b7782194',
        },
        responseBody: JSON.stringify(
          {
            id: 'intent_mock_771829',
            object: 'payment_intent',
            amount: 4900,
            currency: 'usd',
            status: 'succeeded',
            client_token: 'token_mock_client_89218',
            created: Math.floor(Date.now() / 1000),
            charges: {
              data: [{ id: 'ch_3MtwLwLkdIw', paid: true, outcome: { network_status: 'approved_by_network' } }],
            },
          },
          null,
          2
        ),
        timing: { dns: 12, connect: 35, ssl: 48, ttfb: 202, download: 15.5, total: 312.5 },
        tags: ['stripe', 'payments', 'webhook'],
        ipAddress: '54.187.159.182',
      },
      {
        method: 'POST',
        url: 'https://graphql.acme.io/v1/query',
        host: 'graphql.acme.io',
        path: '/v1/query',
        protocol: 'HTTPS',
        status: 400,
        statusText: 'Bad Request',
        requestSize: 520,
        responseSize: 680,
        durationMs: 95.2,
        contentType: 'application/json; charset=utf-8',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'graphql.acme.io',
          'Content-Type': 'application/json',
          'X-Apollo-Operation-Name': 'GetAuditLogs',
        },
        requestBody: JSON.stringify(
          {
            operationName: 'GetAuditLogs',
            query: `query GetAuditLogs($limit: Int!, $filter: String!) {
  auditLogs(limit: $limit, filter: $filter) {
    id
    event
    severity
    timestamp
    malformedFieldSyntaxMissing
  }
}`,
            variables: { limit: 50, filter: 'HTTP_INTERCEPT_ERRORS' },
          },
          null,
          2
        ),
        responseHeaders: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-GraphQL-Cost': '14',
        },
        responseBody: JSON.stringify(
          {
            errors: [
              {
                message: 'Cannot query field "malformedFieldSyntaxMissing" on type "AuditLog".',
                locations: [{ line: 7, column: 5 }],
                extensions: { code: 'GRAPHQL_VALIDATION_FAILED', status: 400 },
              },
            ],
            data: null,
          },
          null,
          2
        ),
        timing: { dns: 5, connect: 14, ssl: 18, ttfb: 52, download: 6.2, total: 95.2 },
        tags: ['graphql', 'syntax-error'],
        ipAddress: '34.120.91.42',
      },
      {
        method: 'GET',
        url: 'https://cdn.static-assets.net/images/dashboard-hero-2026.png',
        host: 'cdn.static-assets.net',
        path: '/images/dashboard-hero-2026.png',
        protocol: 'HTTPS',
        status: 200,
        statusText: 'OK',
        requestSize: 180,
        responseSize: 48920,
        durationMs: 44.8,
        contentType: 'image/png',
        contentCategory: 'image',
        requestHeaders: {
          'Host': 'cdn.static-assets.net',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'http://localhost:3000/',
        },
        responseHeaders: {
          'Content-Type': 'image/png',
          'Content-Length': '48920',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'CF-Cache-Status': 'HIT',
          'Server': 'cloudflare',
        },
        responseBody: '[Binary PNG Image Data: 48.9 KB - 1920x1080 RGBA]',
        timing: { dns: 2, connect: 6, ssl: 10, ttfb: 18, download: 8.8, total: 44.8 },
        tags: ['cdn', 'media', 'cache-hit'],
        ipAddress: '172.67.189.44',
      },
      {
        method: 'DELETE',
        url: 'https://api.acme-cloud.io/v2/sessions/sess_9941a8e2?force=true',
        host: 'api.acme-cloud.io',
        path: '/v2/sessions/sess_9941a8e2?force=true',
        protocol: 'HTTPS',
        status: 204,
        statusText: 'No Content',
        requestSize: 160,
        responseSize: 0,
        durationMs: 38.6,
        contentType: 'text/plain',
        contentCategory: 'text',
        requestHeaders: {
          'Host': 'api.acme-cloud.io',
          'Authorization': 'Bearer demo_mock_token_sample',
        },
        responseHeaders: {
          'X-Deleted-At': new Date().toISOString(),
        },
        responseBody: '',
        timing: { dns: 2, connect: 8, ssl: 11, ttfb: 16, download: 1.6, total: 38.6 },
        tags: ['session', 'cleanup'],
        ipAddress: '104.21.55.19',
      },
      {
        method: 'PUT',
        url: 'https://api.telemetry.io/v1/ingest/metrics',
        host: 'api.telemetry.io',
        path: '/v1/ingest/metrics',
        protocol: 'HTTPS',
        status: 502,
        statusText: 'Bad Gateway',
        requestSize: 840,
        responseSize: 310,
        durationMs: 512.0,
        contentType: 'application/json',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'api.telemetry.io',
          'Content-Type': 'application/json',
          'X-Metric-Batch': 'batch-0089',
        },
        requestBody: JSON.stringify(
          {
            metrics: [
              { name: 'tauri.ipc.latency_ms', value: 0.42, tags: { os: 'linux', arch: 'x86_64' } },
              { name: 'sqlite.wal.checkpoint_ms', value: 1.89, tags: { page_size: 4096 } },
              { name: 'http.intercept.throughput_rps', value: 1420 },
            ],
          },
          null,
          2
        ),
        responseHeaders: {
          'Content-Type': 'application/json',
          'Retry-After': '30',
          'Server': 'nginx/1.24.0',
        },
        responseBody: JSON.stringify(
          {
            error: 'Upstream connection timeout to telemetry-collector-cluster-03.',
            timestamp: new Date().toISOString(),
            status_code: 502,
          },
          null,
          2
        ),
        timing: { dns: 14, connect: 40, ssl: 50, ttfb: 400, download: 8.0, total: 512.0 },
        tags: ['telemetry', 'gateway-error', '5xx'],
        ipAddress: '198.51.100.77',
      },
      {
        method: 'PATCH',
        url: 'https://api.acme-cloud.io/v2/developer/settings',
        host: 'api.acme-cloud.io',
        path: '/v2/developer/settings',
        protocol: 'HTTPS',
        status: 200,
        statusText: 'OK',
        requestSize: 280,
        responseSize: 420,
        durationMs: 64.2,
        contentType: 'application/json',
        contentCategory: 'json',
        requestHeaders: {
          'Host': 'api.acme-cloud.io',
          'Authorization': 'Bearer demo_mock_token_sample',
          'Content-Type': 'application/json',
        },
        requestBody: JSON.stringify(
          {
            theme_preference: 'dracula',
            os_shell: 'linux_gnome',
            auto_capture: true,
            sqlite_persistence_enabled: true,
          },
          null,
          2
        ),
        responseHeaders: {
          'Content-Type': 'application/json',
        },
        responseBody: JSON.stringify(
          {
            updated: true,
            version: '1.4.2',
            applied_at: new Date().toISOString(),
          },
          null,
          2
        ),
        timing: { dns: 3, connect: 9, ssl: 14, ttfb: 34, download: 4.2, total: 64.2 },
        tags: ['settings', 'preferences'],
        ipAddress: '104.21.55.19',
      },
    ];

    return mockTemplates.map((tpl, idx) => ({
      ...tpl,
      id: `req_mock_${idx + 1}_${Date.now()}`,
      timestamp: now - (mockTemplates.length - idx) * 3500,
    }));
  }

  public static createRandomLiveTraffic(): HttpLogEntry {
    const scenarios = TrafficService.getRealisticMockScenarios();
    const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];
    const durationVariance = Math.max(10, chosen.durationMs + (Math.random() * 80 - 40));

    return {
      ...chosen,
      id: TrafficService.generateId(),
      timestamp: Date.now(),
      durationMs: Math.round(durationVariance * 10) / 10,
      timing: TrafficService.createTimingBreakdown(durationVariance),
    };
  }
}
