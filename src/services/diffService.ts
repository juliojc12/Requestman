export type DiffLineType = 'equal' | 'add' | 'delete' | 'modify';

export interface DiffWordHighlight {
  text: string;
  type: 'equal' | 'add' | 'delete';
}

export interface DiffSideLine {
  lineNum?: number;
  text: string;
  type: DiffLineType;
  tokens?: DiffWordHighlight[];
}

export interface AlignedDiffRow {
  id: number;
  type: DiffLineType;
  left?: DiffSideLine;
  right?: DiffSideLine;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
  isIdentical: boolean;
}

export interface JsonKeyDifference {
  path: string;
  type: 'changed' | 'added' | 'removed';
  leftValue?: any;
  rightValue?: any;
}

export class DiffService {
  /**
   * Parses and pretty-prints JSON with deterministically sorted keys
   * so key order differences don't clutter the payload diff.
   */
  public static canonicalizeJson(input?: string): { formatted: string; isValidJson: boolean; parsed?: any } {
    if (!input || !input.trim()) {
      return { formatted: '', isValidJson: false };
    }
    try {
      const parsed = JSON.parse(input);
      const sortedObj = this.sortKeysRecursively(parsed);
      return {
        formatted: JSON.stringify(sortedObj, null, 2),
        isValidJson: true,
        parsed: sortedObj,
      };
    } catch {
      return {
        formatted: input,
        isValidJson: false,
      };
    }
  }

  private static sortKeysRecursively(val: any): any {
    if (val === null || typeof val !== 'object') {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.sortKeysRecursively(item));
    }
    const sorted: Record<string, any> = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
      sorted[key] = this.sortKeysRecursively(val[key]);
    }
    return sorted;
  }

  /**
   * Computes high-level subtle property differences across two JSON objects.
   */
  public static computeJsonDifferences(a: any, b: any, prefix = ''): JsonKeyDifference[] {
    const diffs: JsonKeyDifference[] = [];

    if (a === b) return diffs;

    const isAObj = a !== null && typeof a === 'object';
    const isBObj = b !== null && typeof b === 'object';

    if (!isAObj || !isBObj || Array.isArray(a) !== Array.isArray(b)) {
      diffs.push({
        path: prefix || 'root',
        type: 'changed',
        leftValue: a,
        rightValue: b,
      });
      return diffs;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const currentPath = prefix ? `${prefix}[${i}]` : `[${i}]`;
        if (i >= a.length) {
          diffs.push({
            path: currentPath,
            type: 'added',
            rightValue: b[i],
          });
        } else if (i >= b.length) {
          diffs.push({
            path: currentPath,
            type: 'removed',
            leftValue: a[i],
          });
        } else if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
          diffs.push(...this.computeJsonDifferences(a[i], b[i], currentPath));
        }
      }
      return diffs;
    }

    const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();

    for (const key of allKeys) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const inA = key in a;
      const inB = key in b;

      if (!inA && inB) {
        diffs.push({
          path: currentPath,
          type: 'added',
          rightValue: b[key],
        });
      } else if (inA && !inB) {
        diffs.push({
          path: currentPath,
          type: 'removed',
          leftValue: a[key],
        });
      } else {
        const valA = a[key];
        const valB = b[key];
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
            diffs.push(...this.computeJsonDifferences(valA, valB, currentPath));
          } else {
            diffs.push({
              path: currentPath,
              type: 'changed',
              leftValue: valA,
              rightValue: valB,
            });
          }
        }
      }
    }

    return diffs;
  }

  /**
   * Fast LCS (Longest Common Subsequence) line diff algorithm with
   * aligned side-by-side rows and word/character difference highlighting.
   */
  public static computeAlignedDiff(textA: string, textB: string): { rows: AlignedDiffRow[]; summary: DiffSummary } {
    const linesA = textA.length ? textA.split('\n') : [];
    const linesB = textB.length ? textB.split('\n') : [];

    // Myers / LCS Table with memory safety cap
    const m = linesA.length;
    const n = linesB.length;

    // Fast-path for identical content
    if (textA === textB) {
      const rows: AlignedDiffRow[] = linesA.map((line, idx) => ({
        id: idx + 1,
        type: 'equal',
        left: { lineNum: idx + 1, text: line, type: 'equal' },
        right: { lineNum: idx + 1, text: line, type: 'equal' },
      }));
      return {
        rows,
        summary: {
          additions: 0,
          deletions: 0,
          modifications: 0,
          unchanged: linesA.length,
          isIdentical: true,
        },
      };
    }

    // Safety boundary for very large files (cap diff matrix at 1000 lines per side)
    const safeLinesA = linesA.slice(0, 1000);
    const safeLinesB = linesB.slice(0, 1000);
    const rows = this.calculateLcsDiff(safeLinesA, safeLinesB);

    let additions = 0;
    let deletions = 0;
    let modifications = 0;
    let unchanged = 0;

    for (const r of rows) {
      if (r.type === 'add') additions++;
      else if (r.type === 'delete') deletions++;
      else if (r.type === 'modify') modifications++;
      else unchanged++;
    }

    return {
      rows,
      summary: {
        additions,
        deletions,
        modifications,
        unchanged,
        isIdentical: additions === 0 && deletions === 0 && modifications === 0,
      },
    };
  }

  private static calculateLcsDiff(a: string[], b: string[]): AlignedDiffRow[] {
    const m = a.length;
    const n = b.length;

    // Fill DP table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to collect raw operations
    interface RawOp {
      type: 'equal' | 'add' | 'delete';
      text: string;
      lineNumA?: number;
      lineNumB?: number;
    }

    const rawOps: RawOp[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        rawOps.push({
          type: 'equal',
          text: a[i - 1],
          lineNumA: i,
          lineNumB: j,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rawOps.push({
          type: 'add',
          text: b[j - 1],
          lineNumB: j,
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        rawOps.push({
          type: 'delete',
          text: a[i - 1],
          lineNumA: i,
        });
        i--;
      }
    }

    rawOps.reverse();

    // Group adjacent delete and add operations into paired 'modify' rows with token-level diff
    const alignedRows: AlignedDiffRow[] = [];
    let idx = 0;
    let rowId = 1;

    while (idx < rawOps.length) {
      const op = rawOps[idx];

      if (op.type === 'equal') {
        alignedRows.push({
          id: rowId++,
          type: 'equal',
          left: { lineNum: op.lineNumA, text: op.text, type: 'equal' },
          right: { lineNum: op.lineNumB, text: op.text, type: 'equal' },
        });
        idx++;
      } else if (op.type === 'delete') {
        // Look ahead for an adjacent 'add' to form a side-by-side modification
        const nextOp = rawOps[idx + 1];
        if (nextOp && nextOp.type === 'add') {
          // Tokenize the changes
          const { tokensA, tokensB } = this.computeWordDiff(op.text, nextOp.text);
          alignedRows.push({
            id: rowId++,
            type: 'modify',
            left: { lineNum: op.lineNumA, text: op.text, type: 'delete', tokens: tokensA },
            right: { lineNum: nextOp.lineNumB, text: nextOp.text, type: 'add', tokens: tokensB },
          });
          idx += 2;
        } else {
          alignedRows.push({
            id: rowId++,
            type: 'delete',
            left: { lineNum: op.lineNumA, text: op.text, type: 'delete' },
            right: undefined,
          });
          idx++;
        }
      } else if (op.type === 'add') {
        alignedRows.push({
          id: rowId++,
          type: 'add',
          left: undefined,
          right: { lineNum: op.lineNumB, text: op.text, type: 'add' },
        });
        idx++;
      }
    }

    return alignedRows;
  }

  /**
   * Computes token/character difference between two strings for intra-line highlighting.
   */
  private static computeWordDiff(strA: string, strB: string): { tokensA: DiffWordHighlight[]; tokensB: DiffWordHighlight[] } {
    // Find common prefix
    let prefixLen = 0;
    while (prefixLen < strA.length && prefixLen < strB.length && strA[prefixLen] === strB[prefixLen]) {
      prefixLen++;
    }

    // Find common suffix
    let suffixLen = 0;
    while (
      suffixLen < strA.length - prefixLen &&
      suffixLen < strB.length - prefixLen &&
      strA[strA.length - 1 - suffixLen] === strB[strB.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    const prefix = strA.slice(0, prefixLen);
    const suffix = suffixLen > 0 ? strA.slice(strA.length - suffixLen) : '';

    const midA = strA.slice(prefixLen, strA.length - suffixLen);
    const midB = strB.slice(prefixLen, strB.length - suffixLen);

    const tokensA: DiffWordHighlight[] = [];
    const tokensB: DiffWordHighlight[] = [];

    if (prefix) {
      tokensA.push({ text: prefix, type: 'equal' });
      tokensB.push({ text: prefix, type: 'equal' });
    }
    if (midA) {
      tokensA.push({ text: midA, type: 'delete' });
    }
    if (midB) {
      tokensB.push({ text: midB, type: 'add' });
    }
    if (suffix) {
      tokensA.push({ text: suffix, type: 'equal' });
      tokensB.push({ text: suffix, type: 'equal' });
    }

    return { tokensA, tokensB };
  }
}
