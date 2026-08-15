/**
 * GH Actions 微任务执行器（task-run.yml 入口）
 *
 * 用法：
 *   node scripts/run-task.js --task <taskId>
 *   node scripts/run-task.js --type <taskType> --target <target> --params '<json>' [--write-to-db]
 *
 * AI 任务通过 Claude Code Router (ccr) 执行，结果回传站点 API：
 *   POST {SITE_URL}/api/ops/task/{taskId}/result  (x-admin-key)
 *
 * 环境变量：
 *   SITE_URL        站点根地址
 *   ADMIN_API_KEY   站点写接口鉴权
 *   GITHUB_TOKEN    GitHub API（注入给 AI 子代理）
 *   DDGS_SEARCH_API 中文社区搜索
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.SITE_URL || 'https://zitons-logup-re.hf.space').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

function parseArgs(argv) {
  const args = { task: null, type: null, target: null, params: '{}', writeToDb: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--task') args.task = argv[i + 1];
    else if (argv[i] === '--type') args.type = argv[i + 1];
    else if (argv[i] === '--target') args.target = argv[i + 1];
    else if (argv[i] === '--params') args.params = argv[i + 1];
    else if (argv[i] === '--write-to-db') args.writeToDb = argv[i + 1] !== 'false';
  }
  return args;
}

async function fetchWithAuth(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (ADMIN_API_KEY) headers['x-admin-key'] = ADMIN_API_KEY;
  const resp = await fetch(url, { ...options, headers });
  return resp;
}

function buildPrompt(taskType, inputs) {
  const lines = [
    '你是 LogUp 微任务执行子代理。当前只执行一个任务，完成后输出严格 JSON（无 markdown 代码块包裹）。',
    '',
  ];
  const url = inputs.url || inputs.target || inputs.repo || inputs.name || inputs.project || '';

  if (taskType === 'write-regex') {
    lines.push(
      `任务：为页面生成 version_regex。目标 URL: ${url}`,
      '步骤：',
      '1. 用 chrome-devtools MCP 或 mcp-server-fetch 打开页面',
      '2. 定位版本号所在位置（DOM、网络请求、控制台、__NEXT_DATA__ 等）',
      '3. 编写含捕获组 1 的 JS 正则（如 v?(\\d+\\.\\d+\\.\\d+)），用页面 HTML 验证能匹配',
      '输出 JSON: {"url":"...","version":"提取到的版本号或null","regex":"含捕获组的正则","evidence":"在哪里找到版本号","status":"ok|no-version|blocked"}',
    );
  } else if (taskType === 'inspect-page') {
    lines.push(
      `任务：用 chrome-devtools 检查页面并提取最新版本号。目标 URL: ${url}`,
      '步骤：',
      '1. mcp__chrome-devtools__navigate_page 打开页面',
      '2. mcp__chrome-devtools__get_snapshot 看 DOM；必要时 list_network_requests 找版本接口、list_console_messages 看报错',
      '3. 提取版本号',
      '输出 JSON: {"url":"...","version":"版本号或null","source":"network|dom|console|js","evidence":"证据片段"}',
    );
  } else if (taskType === 'add-project') {
    lines.push(
      `任务：完整收录新项目。项目名: ${inputs.name || ''}  来源: ${inputs.url || ''}`,
      '步骤：',
      '1. 查重：GET {SITE_URL}/api/projects?name=关键词，已存在则跳过',
      '2. 获取版本信息（GitHub API 或抓页面），无确切版本号则放弃',
      '3. 撰写 summarize（5-20 字）、describe（中文）',
      `4. 用 DDGS_SEARCH_API 找至少 3 条非官方中文链接（禁止搜索页 URL、禁止猜测 URL）`,
      '5. 原子写入：POST /api/projects 然后立即 POST /api/versions（写请求携带 x-admin-key: $ADMIN_API_KEY）',
      `写库：${inputs.write_to_db !== false ? '是' : '否'}（若否只返回数据不写库）`,
      '输出 JSON: {"name":"...","id":编号或null,"version":"...","success":true/false,"links_count":数字,"error":null或"..."}',
    );
  } else {
    lines.push(
      `任务：处理微任务。类型: ${taskType}  目标: ${url || inputs.target || ''}`,
      '自行判断如何完成该任务，输出 JSON 结果。',
      '输出 JSON: {"success":true/false,"result":{...},"error":null或"..."}',
    );
  }

  lines.push(
    '',
    '环境：API=' + SITE_URL,
    'GITHUB_TOKEN 已注入（GitHub API 用 Authorization: Bearer $GITHUB_TOKEN）',
    'ADMIN_API_KEY 已注入（站点写请求携带 x-admin-key: $ADMIN_API_KEY）',
    'DDGS_SEARCH_API=' + (process.env.DDGS_SEARCH_API || ''),
    'chrome-devtools MCP 可用（mcp__chrome-devtools__*）',
    '最后一行必须是一个 JSON 对象，不要有其他解释。',
  );
  return lines.join('\n');
}

function extractJsonFromOutput(stdout) {
  // 从输出中找最后一个独立的 JSON 对象
  const lines = String(stdout).split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line);
      } catch { /* continue */ }
    }
    // stream-json 模式下 result 事件
    try {
      const obj = JSON.parse(line);
      if (obj && obj.type === 'result' && obj.result) return obj.result;
    } catch { /* not json */ }
  }
  // 整段正则提取
  try {
    const block = String(stdout).match(/\{[\s\S]*\}/);
    if (block) return JSON.parse(block[0]);
  } catch { /* ignore */ }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let taskType = args.type;
  let inputs = {};
  let taskId = args.task;
  let engine = 'ai';

  if (taskId) {
    // 从站点 API 读取任务定义与输入
    const resp = await fetchWithAuth(`${SITE_URL}/api/ops/task/${taskId}`);
    if (!resp.ok) {
      console.error(`[run-task] failed to fetch task ${taskId}: http ${resp.status}`);
      process.exit(1);
    }
    const data = await resp.json();
    const task = data.data;
    if (!task) {
      console.error(`[run-task] task ${taskId} not found`);
      process.exit(1);
    }
    taskType = task.type;
    inputs = task.inputs || {};
    engine = task.engine;
  } else {
    try {
      inputs = JSON.parse(args.params || '{}');
    } catch {
      inputs = {};
    }
    inputs = { ...inputs, target: args.target || inputs.target, write_to_db: args.writeToDb };
    if (!taskType) {
      console.error('[run-task] --type or --task is required');
      process.exit(1);
    }
  }

  console.log(`[run-task] type=${taskType} engine=${engine} taskId=${taskId || 'n/a'}`);
  if (!ADMIN_API_KEY) console.warn('[run-task] ADMIN_API_KEY not set — result 回传会 401');

  const prompt = buildPrompt(taskType, inputs);
  const promptFile = path.join('/tmp', `run-task-prompt-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, prompt, 'utf8');

  let stdout;
  try {
    stdout = execFileSync(
      'ccr',
      ['code', '-p', fs.readFileSync(promptFile, 'utf8'), '--dangerously-skip-permissions', '--output-format', 'stream-json'],
      { encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 50 * 1024 * 1024 }
    );
  } catch (e) {
    const err = e && e.message ? String(e.message) : 'ccr execution failed';
    const out = e && e.stdout ? String(e.stdout) : '';
    const result = extractJsonFromOutput(out);
    if (taskId) {
      await fetchWithAuth(`${SITE_URL}/api/ops/task/${taskId}/result`, {
        method: 'POST',
        body: JSON.stringify({ status: 'failed', error: result && result.error ? result.error : err }),
      }).catch(() => {});
    }
    console.error(`[run-task] ccr failed: ${err}`);
    process.exit(1);
  }

  const result = extractJsonFromOutput(stdout);
  if (!result) {
    console.error('[run-task] could not parse JSON from ccr output');
    console.error(String(stdout).slice(-2000));
    if (taskId) {
      await fetchWithAuth(`${SITE_URL}/api/ops/task/${taskId}/result`, {
        method: 'POST',
        body: JSON.stringify({ status: 'failed', error: 'ccr output was not valid JSON' }),
      }).catch(() => {});
    }
    process.exit(1);
  }

  console.log('[run-task] result:', JSON.stringify(result).slice(0, 800));

  // 回传结果
  if (taskId) {
    const status = result.success === false ? 'failed' : 'success';
    const resp = await fetchWithAuth(`${SITE_URL}/api/ops/task/${taskId}/result`, {
      method: 'POST',
      body: JSON.stringify({ status, result, error: result.error || null }),
    });
    if (!resp.ok) console.error(`[run-task] failed to report result: http ${resp.status}`);
    else console.log(`[run-task] result reported for ${taskId}`);
  } else {
    console.log(JSON.stringify(result));
  }
}

main().catch((e) => {
  console.error('[run-task] fatal:', e && e.message ? e.message : e);
  process.exit(1);
});
