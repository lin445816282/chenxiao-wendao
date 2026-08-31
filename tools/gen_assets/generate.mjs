#!/usr/bin/env node
// 《尘霄问道》豆包素材批量生成脚本（Seedream 5.0 Pro）
// 用法见 README.md，或 node generate.mjs --help

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const USAGE = `用法:
  node generate.mjs --key <ARK_API_KEY>                     # 生成全部（文案+图片）
  node generate.mjs --key <ARK_API_KEY> --type text         # 只生成文案
  node generate.mjs --key <ARK_API_KEY> --type image        # 只生成图片
  node generate.mjs --key <ARK_API_KEY> --id hero_male,pets # 只生成指定 id
  node generate.mjs --key <ARK_API_KEY> --dry-run           # 只打印将执行的项

API Key 也可用环境变量 ARK_API_KEY 提供（优先顺序：--key > 环境变量 > config.api_key）。
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--key') args.key = argv[++i];
    else if (a === '--type') args.type = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function save(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

async function genText(config, key, it) {
  const body = {
    model: config.text_model,
    messages: [{ role: 'user', content: it.prompt }],
    temperature: 0.7,
  };
  const res = await fetch(`${config.base_url}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('响应无内容: ' + JSON.stringify(data).slice(0, 400));
  return content;
}

// 按 Seedream 文档拼装正向提示词：全局风格前缀 + (角色后缀) + 主体描述
function buildPositive(manifest, it) {
  const parts = [manifest.style_prefix];
  if (it.character) parts.push(manifest.character_suffix);
  parts.push(it.prompt);
  return parts.join(',');
}

async function genImage(config, key, it, manifest) {
  const body = {
    model: config.image_model,
    prompt: buildPositive(manifest, it),
    negative_prompt: manifest.negative_prompt || '',
    size: it.size || config.default_size,
    steps: config.steps ?? 30,
    cfg_scale: config.cfg_scale ?? 7.5,
    response_format: 'b64_json',
  };
  // seed：固定随机种子可复现同一张图，做系列角色统一画风
  const seed = it.seed ?? config.seed ?? null;
  if (seed != null) body.seed = seed;
  if (config.watermark != null) body.watermark = config.watermark;

  const res = await fetch(`${config.base_url}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('响应无 b64_json: ' + JSON.stringify(data).slice(0, 400));
  return Buffer.from(b64, 'base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const config = JSON.parse(await readFile(resolve(__dirname, 'config.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(__dirname, 'prompts.json'), 'utf8'));

  const key = args.key || process.env[config.api_key_env] || config.api_key || '';
  if (!key) {
    console.error(`[错误] 未提供 API Key。请用 --key <key> 或设置环境变量 ${config.api_key_env}`);
    process.exit(1);
  }

  let items = manifest.items;
  if (args.type && args.type !== 'all') items = items.filter((it) => it.type === args.type);
  if (args.id) {
    const ids = new Set(args.id.split(',').map((s) => s.trim()));
    items = items.filter((it) => ids.has(it.id));
  }
  if (items.length === 0) {
    console.error('[错误] 没有匹配的生成项，请检查 --type / --id 参数。');
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(`[dry-run] 将执行 ${items.length} 项:`);
    items.forEach((it, i) => {
      const meta = it.type === 'image' ? ` ${it.size}` : '';
      console.log(`  ${i + 1}. [${it.type}] ${it.id}${meta} -> ${it.output}`);
    });
    return;
  }

  const ok = [];
  const fail = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      if (it.type === 'text') {
        const content = await genText(config, key, it);
        await save(resolve(__dirname, it.output), content);
      } else if (it.type === 'image') {
        const buf = await genImage(config, key, it, manifest);
        await save(resolve(__dirname, it.output), buf);
      } else {
        throw new Error(`未知类型 ${it.type}`);
      }
      console.log(`[${i + 1}/${items.length}] ${it.id} 完成 -> ${it.output}`);
      ok.push(it.id);
      await sleep(300); // 简单限速，避免触发并发限制
    } catch (e) {
      fail.push({ id: it.id, err: e.message });
      console.error(`[${i + 1}/${items.length}] ${it.id} 失败: ${e.message}`);
    }
  }

  console.log(`\n完成：成功 ${ok.length}，失败 ${fail.length}`);
  if (fail.length) fail.forEach((f) => console.error(`  ✗ ${f.id}: ${f.err}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
