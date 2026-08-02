/**
 * 版本提取架构基准测试工具
 *
 * 用法：
 *   npx tsx scripts/bench-extract.ts                     # 用内置测试集
 *   npx tsx scripts/bench-extract.ts --cases cases.json  # 用自定义测试集
 *   npx tsx scripts/bench-extract.ts --probe <url>       # 单 URL 探查（无期望值）
 *
 * 测试集 JSON 结构：
 *   [{ "name": "nodejs", "url": "https://nodejs.org/en/download/", "expected": "v26", "currentDbVersion": "v25" }]
 *   - expected: 期望版本（支持前缀匹配，如 "v26" 匹配 "v26.5.1"）；空串 = 期望提取不到
 *   - currentDbVersion: 可选，用于交叉校验决策测试
 *
 * 输出：每例结果 + 汇总指标（准确率 / 各置信度表现 / 误报 / 自动写入正确性）
 */
import { createRequire } from 'module';
import { extractVersionFromHtml, shouldTrustExtraction, compareVersions } from '../lib/version-extract';

const require = createRequire(import.meta.url);
const crawler = require('../scripts/crawler.js');

interface TestCase {
  name: string;
  url: string;
  expected: string; // 前缀匹配；'' = 期望无版本
  currentDbVersion?: string;
}

const BUILTIN_CASES: TestCase[] = [
  { name: 'nodejs', url: 'https://nodejs.org/en/download/', expected: 'v26', currentDbVersion: 'v25' },
  { name: 'python', url: 'https://www.python.org/downloads/', expected: 'v3.1', currentDbVersion: 'v3.13' },
  { name: 'wordpress', url: 'https://wordpress.org/download/', expected: 'v7', currentDbVersion: 'v6.5' },
  { name: 'golang', url: 'https://go.dev/dl/', expected: 'v1.2', currentDbVersion: 'v1.25' },
  { name: 'nginx', url: 'https://nginx.org/en/download.html', expected: 'v1.2', currentDbVersion: 'v1.28' },
  { name: 'blender', url: 'https://www.blender.org/download/', expected: 'v5', currentDbVersion: 'v4' },
  { name: 'gimp', url: 'https://www.gimp.org/downloads/', expected: 'v3', currentDbVersion: 'v2' },
  { name: '7zip', url: 'https://www.7-zip.org/', expected: '', currentDbVersion: 'v25' },
  { name: 'redis', url: 'https://redis.io/', expected: '', currentDbVersion: 'v7' },
  { name: 'git', url: 'https://git-scm.com/downloads', expected: '', currentDbVersion: 'v2' },
];

function matchesPrefix(actual: string, expectedPrefix: string): boolean {
  const norm = (s: string) => s.replace(/^v/i, '');
  const a = norm(actual);
  const e = norm(expectedPrefix);
  return a === e || a.startsWith(e + '.');
}

function parseArgs(argv: string[]) {
  const args: { cases?: string; probe?: string } = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--cases') args.cases = argv[i + 1];
    if (argv[i] === '--probe') args.probe = argv[i + 1];
  }
  return args;
}

async function loadCases(args: ReturnType<typeof parseArgs>): Promise<TestCase[]> {
  if (args.cases) {
    const fs = await import('fs');
    const raw = fs.readFileSync(args.cases, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('--cases 文件必须是数组');
    return arr as TestCase[];
  }
  return BUILTIN_CASES;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // 单 URL 探查模式
  if (args.probe) {
    const r = await crawler.fetchPage(args.probe, { retries: 2 });
    if (r.error || !r.text) {
      console.log(`❌ 抓取失败: ${r.error}`);
      return;
    }
    const e = extractVersionFromHtml(r.text);
    console.log(`URL: ${args.probe}`);
    console.log(`版本: ${e.version || '—'}  | 置信: ${e.confidence}  | 需AI: ${e.needsAiCheck}  | 来源: ${e.source}`);
    console.log(`建议正则: ${e.suggestedRegex}`);
    if (e.matchedContext) console.log(`上下文: ${e.matchedContext.slice(0, 120)}`);
    if (e.candidates?.length) {
      console.log('候选:');
      for (const c of e.candidates) console.log(`  ${c.version}  score=${c.score}  下载链接=${c.inDownloadUrl}  来源=${c.scope}`);
    }
    return;
  }

  const cases = await loadCases(args);
  console.log(`\n=== 版本提取架构基准测试 (${cases.length} 例) ===\n`);
  console.log('站点'.padEnd(12), '期望'.padEnd(10), '提取'.padEnd(16), '判定', '置信', '信任决策');
  console.log('-'.repeat(78));

  let pass = 0;
  let fail = 0;
  const byConfidence: Record<string, { pass: number; total: number }> = {};
  let falsePositive = 0; // 期望无版本但提取到了
  let missed = 0; // 期望有版本但没提取到
  let autoWriteCorrect = 0;
  let autoWriteWrong = 0;

  for (const c of cases) {
    const r = await crawler.fetchPage(c.url, { retries: 1, timeout: 12000 });
    if (r.error || !r.text) {
      console.log(c.name.padEnd(12), '❌ 抓取失败');
      fail += 1;
      continue;
    }
    const e = extractVersionFromHtml(r.text);
    const extracted = e.version;

    // 判定
    let verdict: 'PASS' | 'FAIL';
    if (c.expected === '') {
      verdict = extracted ? 'FAIL(误报)' : 'PASS';
      if (extracted) falsePositive += 1;
    } else {
      if (!extracted) {
        verdict = 'FAIL(漏)';
        missed += 1;
      } else if (matchesPrefix(extracted, c.expected)) {
        verdict = 'PASS';
      } else {
        verdict = 'FAIL(错)';
      }
    }
    if (verdict.startsWith('PASS')) pass += 1;
    else fail += 1;

    // 置信度分桶
    const bucket = byConfidence[e.confidence] || (byConfidence[e.confidence] = { pass: 0, total: 0 });
    bucket.total += 1;
    if (verdict.startsWith('PASS')) bucket.pass += 1;

    // 信任决策（有 currentDbVersion 时）
    let trustLabel = '—';
    if (c.currentDbVersion) {
      const t = shouldTrustExtraction(e, c.currentDbVersion);
      trustLabel = t.trust ? '写入' : '需复核';
      // 自动写入正确性：trust 时提取必须正确；不 trust 时提取错误=正确拦截
      const correct = extracted ? matchesPrefix(extracted, c.expected) || (c.expected === '' && !extracted) : c.expected === '';
      if (t.trust) {
        if (correct) autoWriteCorrect += 1;
        else autoWriteWrong += 1;
      }
    }

    const confIcon = { high: '🟢高', medium: '🟡中', low: '🔴低' }[e.confidence] || e.confidence;
    console.log(
      c.name.padEnd(12),
      (c.expected || '(无)').padEnd(10),
      (extracted || '—').padEnd(16),
      verdict,
      confIcon,
      trustLabel
    );
  }

  // 汇总
  const total = pass + fail;
  console.log('\n' + '='.repeat(60));
  console.log(`准确率: ${pass}/${total} = ${(pass / total * 100).toFixed(0)}%`);
  console.log(`  误报(期望无版本却提取): ${falsePositive}`);
  console.log(`  漏检(期望有版本却提取不到): ${missed}`);
  for (const [k, v] of Object.entries(byConfidence)) {
    console.log(`  置信度 ${k}: ${v.pass}/${v.total} = ${(v.pass / v.total * 100).toFixed(0)}%`);
  }
  if (autoWriteCorrect + autoWriteWrong > 0) {
    console.log(`自动写入正确性(有交叉校验的例): ${autoWriteCorrect} 正确 / ${autoWriteWrong} 错误`);
  }
  console.log('');
}

main().catch((e) => {
  console.error('基准测试失败:', e.message || e);
  process.exit(1);
});
