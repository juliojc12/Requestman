import { HttpLogEntry } from '../types';

export class ExportService {
  public static exportToJson(logs: HttpLogEntry[]): void {
    const dataStr = JSON.stringify(logs, null, 2);
    ExportService.downloadFile(dataStr, `netspy-traffic-export-${new Date().toISOString().slice(0, 19)}.json`, 'application/json');
  }

  public static exportToHar(logs: HttpLogEntry[]): void {
    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'NetSpy HTTP Interceptor & Debugger (Tauri)',
          version: '1.0.0',
        },
        pages: [],
        entries: logs.map((log) => {
          const startTime = new Date(log.timestamp).toISOString();
          const queryParamsList = Object.entries(ExportService.extractQueryParams(log.url)).map(([name, value]) => ({
            name,
            value,
          }));

          const requestHeadersList = Object.entries(log.requestHeaders).map(([name, value]) => ({
            name,
            value,
          }));

          const responseHeadersList = Object.entries(log.responseHeaders).map(([name, value]) => ({
            name,
            value,
          }));

          return {
            startedDateTime: startTime,
            time: log.durationMs,
            request: {
              method: log.method,
              url: log.url,
              httpVersion: log.protocol || 'HTTP/1.1',
              cookies: [],
              headers: requestHeadersList,
              queryString: queryParamsList,
              headersSize: JSON.stringify(log.requestHeaders).length,
              bodySize: log.requestSize,
              postData: log.requestBody
                ? {
                    mimeType: log.contentType || 'application/json',
                    text: log.requestBody,
                  }
                : undefined,
            },
            response: {
              status: log.status,
              statusText: log.statusText,
              httpVersion: log.protocol || 'HTTP/1.1',
              cookies: [],
              headers: responseHeadersList,
              content: {
                size: log.responseSize,
                mimeType: log.contentType,
                text: log.responseBody,
              },
              redirectURL: '',
              headersSize: JSON.stringify(log.responseHeaders).length,
              bodySize: log.responseSize,
            },
            cache: {},
            timings: {
              blocked: -1,
              dns: log.timing.dns,
              connect: log.timing.connect,
              ssl: log.timing.ssl,
              send: 1,
              wait: log.timing.ttfb,
              receive: log.timing.download,
            },
            serverIPAddress: log.ipAddress || '127.0.0.1',
          };
        }),
      },
    };

    const dataStr = JSON.stringify(har, null, 2);
    ExportService.downloadFile(dataStr, `netspy-traffic-archive-${new Date().toISOString().slice(0, 19)}.har`, 'application/json');
  }

  public static exportToCsv(logs: HttpLogEntry[]): void {
    const headers = ['ID', 'Timestamp', 'Method', 'Status', 'Host', 'Path', 'Duration_ms', 'Req_Size_B', 'Res_Size_B', 'Content_Type'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.method,
      l.status,
      `"${l.host}"`,
      `"${l.path.replace(/"/g, '""')}"`,
      l.durationMs,
      l.requestSize,
      l.responseSize,
      `"${l.contentType}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    ExportService.downloadFile(csvContent, `netspy-traffic-summary-${new Date().toISOString().slice(0, 19)}.csv`, 'text/csv');
  }

  public static generateCurl(log: HttpLogEntry): string {
    let curl = `curl -X ${log.method} "${log.url}"`;

    for (const [key, value] of Object.entries(log.requestHeaders)) {
      curl += ` \\\n  -H "${key}: ${value.replace(/"/g, '\\"')}"`;
    }

    if (log.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(log.method)) {
      const sanitizedBody = log.requestBody.replace(/'/g, `'\\''`);
      curl += ` \\\n  --data '${sanitizedBody}'`;
    }

    return curl;
  }

  public static generateFetch(log: HttpLogEntry): string {
    const headersFormatted = JSON.stringify(log.requestHeaders, null, 2);
    let options: string = `{\n  method: '${log.method}',\n  headers: ${headersFormatted}`;

    if (log.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(log.method)) {
      options += `,\n  body: ${JSON.stringify(log.requestBody)}`;
    }
    options += `\n}`;

    return `fetch('${log.url}', ${options})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
  }

  public static generatePython(log: HttpLogEntry): string {
    const headersFormatted = JSON.stringify(log.requestHeaders, null, 4);
    let code = `import requests\n\nurl = "${log.url}"\nheaders = ${headersFormatted}\n`;

    if (log.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(log.method)) {
      try {
        JSON.parse(log.requestBody);
        code += `data = ${log.requestBody}\nresponse = requests.${log.method.toLowerCase()}(url, headers=headers, json=data)\n`;
      } catch {
        code += `data = """${log.requestBody}"""\nresponse = requests.${log.method.toLowerCase()}(url, headers=headers, data=data)\n`;
      }
    } else {
      code += `response = requests.${log.method.toLowerCase()}(url, headers=headers)\n`;
    }

    code += `print(response.status_code)\nprint(response.text)\n`;
    return code;
  }

  public static async parseImportedFile(file: File): Promise<HttpLogEntry[]> {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed as HttpLogEntry[];
    }

    // Check if it's a HAR file
    if (parsed.log && Array.isArray(parsed.log.entries)) {
      return parsed.log.entries.map((entry: any, index: number) => {
        const reqHeaders: Record<string, string> = {};
        if (entry.request.headers) {
          entry.request.headers.forEach((h: any) => {
            reqHeaders[h.name] = h.value;
          });
        }

        const resHeaders: Record<string, string> = {};
        if (entry.response.headers) {
          entry.response.headers.forEach((h: any) => {
            resHeaders[h.name] = h.value;
          });
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(entry.request.url);
        } catch {
          parsedUrl = new URL('http://unknown.host' + entry.request.url);
        }

        const duration = entry.time || 50;
        const contentType = entry.response.content?.mimeType || 'text/plain';

        return {
          id: `har_imp_${Date.now()}_${index}`,
          timestamp: new Date(entry.startedDateTime).getTime() || Date.now(),
          method: (entry.request.method?.toUpperCase() || 'GET') as any,
          url: entry.request.url,
          host: parsedUrl.host || 'unknown',
          path: parsedUrl.pathname + parsedUrl.search,
          protocol: entry.request.httpVersion || 'HTTP/1.1',
          status: entry.response.status || 200,
          statusText: entry.response.statusText || 'OK',
          requestSize: entry.request.bodySize > 0 ? entry.request.bodySize : 100,
          responseSize: entry.response.content?.size || 100,
          durationMs: Math.round(duration * 10) / 10,
          contentType,
          contentCategory: ExportService.determineCategory(contentType),
          requestHeaders: reqHeaders,
          requestBody: entry.request.postData?.text || undefined,
          responseHeaders: resHeaders,
          responseBody: entry.response.content?.text || undefined,
          timing: {
            dns: entry.timings?.dns > 0 ? entry.timings.dns : 2,
            connect: entry.timings?.connect > 0 ? entry.timings.connect : 5,
            ssl: entry.timings?.ssl > 0 ? entry.timings.ssl : 8,
            ttfb: entry.timings?.wait > 0 ? entry.timings.wait : 25,
            download: entry.timings?.receive > 0 ? entry.timings.receive : 10,
            total: duration,
          },
          ipAddress: entry.serverIPAddress || '127.0.0.1',
        };
      });
    }

    throw new Error('Unsupported log format. Must be JSON array or HAR 1.2 log file.');
  }

  private static extractQueryParams(urlStr: string): Record<string, string> {
    try {
      const url = new URL(urlStr);
      const res: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        res[k] = v;
      });
      return res;
    } catch {
      return {};
    }
  }

  private static determineCategory(contentType: string): any {
    const ct = contentType.toLowerCase();
    if (ct.includes('json')) return 'json';
    if (ct.includes('html')) return 'html';
    if (ct.includes('xml')) return 'xml';
    if (ct.includes('image/')) return 'image';
    if (ct.includes('javascript')) return 'javascript';
    if (ct.includes('css')) return 'css';
    return 'other';
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
