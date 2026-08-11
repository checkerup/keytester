import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', 'config');
const CONFIG_FILE = join(CONFIG_DIR, 'keys.json');
const AGENTS_FILE = join(CONFIG_DIR, 'agents.json');
const PROVIDERS_FILE = join(CONFIG_DIR, 'providers.json');

if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });

function loadJSON<T>(path: string, fallback: T): T {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) { console.error(`Error loading ${path}:`, e); }
  return fallback;
}

function saveJSON(path: string, data: any) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

if (!existsSync(CONFIG_FILE)) saveJSON(CONFIG_FILE, { keys: [] });
if (!existsSync(AGENTS_FILE)) saveJSON(AGENTS_FILE, {
  agents: [
    { id: 'default', name: 'Default Agent', systemPrompt: 'You are a helpful assistant. Answer concisely.' },
    { id: 'coder', name: 'Code Reviewer', systemPrompt: 'You are an expert code reviewer. Analyze code and suggest improvements.' },
    { id: 'translator', name: 'Translator', systemPrompt: 'You are a professional translator. Translate text accurately.' },
  ]
});
if (!existsSync(PROVIDERS_FILE)) saveJSON(PROVIDERS_FILE, {
  providers: [
    { id: 'zen', name: 'OpenCode Zen (Free)', baseURL: 'https://opencode.ai/zen/v1', apiKey: '', models: ['deepseek-v4-flash-free', 'big-pickle', 'mimo-v2.5-free', 'laguna-s-2.1-free', 'ling-3.0-tiny-free', 'longcat-2.0-free', 'north-mini-code-free', 'nemotron-3-ultra-free', 'kimi-k3', 'glm-5.2', 'deepseek-v4-pro', 'qwen3.7-max', 'grok-4.5'] },
    { id: 'omniroute', name: 'Omniroute (Local)', baseURL: process.env.OMNIROUTE_URL || 'http://localhost:20128/v1', apiKey: process.env.OMNIROUTE_KEY || '', models: ['dashscope/glm-5.2', 'dashscope/kimi/kimi-k3', 'dashscope/deepseek-v4-pro'] },
    { id: 'blackbox', name: 'Blackbox (Free)', baseURL: 'https://api.blackbox.ai/v1', apiKey: process.env.BLACKBOX_KEY || '', models: ['blackboxai/mistral/mistral-medium-3.5', 'blackboxai/meta/llama-3.1-70b'] },
    { id: 'xkiro', name: 'XKiro (Free)', baseURL: 'https://api.xkiro.com/v1', apiKey: process.env.XKIRO_KEY || '', models: ['deepseek/deepseek-v4-pro', 'mistralai/mistral-large-2512'] },
  ]
});

let keysData = loadJSON<{ keys: any[] }>(CONFIG_FILE, { keys: [] });
let agentsData = loadJSON<{ agents: any[] }>(AGENTS_FILE, { agents: [] });
let providersData = loadJSON<{ providers: any[] }>(PROVIDERS_FILE, { providers: [] });

// ===== OpenCode Zen Proxy =====
const OPENCODE_CLI = process.env.OPENCODE_CLI || 'C:\\Users\\iamon\\AppData\\Local\\opencode\\opencode-cli.exe';
const OPENCODE_PROXY_PORT = parseInt(process.env.OPENCODE_PROXY_PORT || '13438');
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || 'keytester';

let opencodeProxyProcess: any = null;
let opencodeProxyReady = false;

async function startOpencodeProxy() {
  if (!existsSync(OPENCODE_CLI)) { console.log('OpenCode CLI not found at', OPENCODE_CLI); return false; }
  console.log('Starting OpenCode proxy on port', OPENCODE_PROXY_PORT);
  opencodeProxyProcess = spawn(OPENCODE_CLI, ['serve', '--port', String(OPENCODE_PROXY_PORT)], {
    env: { ...process.env, OPENCODE_SERVER_PASSWORD: OPENCODE_PASSWORD },
    stdio: 'pipe', detached: false,
  });
  const opencodePid = opencodeProxyProcess.pid;
  console.log('OpenCode proxy PID:', opencodePid);
  opencodeProxyProcess.on('error', (err: Error) => { console.error('Proxy error:', err); opencodeProxyReady = false; });
  const cleanup = () => { if (opencodeProxyProcess && !opencodeProxyProcess.killed) { try { opencodeProxyProcess.kill('SIGTERM'); } catch {} } };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  await new Promise(r => setTimeout(r, 4000));
  try {
    const auth = Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString('base64');
    const r = await fetch(`http://localhost:${OPENCODE_PROXY_PORT}/session`, { headers: { Authorization: `Basic ${auth}` } });
    if (r.ok) { opencodeProxyReady = true; console.log('OpenCode proxy ready'); return true; }
  } catch (e) { console.error('Proxy not ready:', e); }
  return false;
}

async function opencodeRun(model: string, message: string, customPrompt?: string): Promise<string> {
  const args = ['run', '--attach', `http://localhost:${OPENCODE_PROXY_PORT}`, '--password', OPENCODE_PASSWORD, '-m', `opencode/${model}`, '--format', 'json'];
  const fullMessage = customPrompt ? `${customPrompt}\n\n---\n\n${message}` : message;
  args.push(fullMessage);
  return new Promise((resolve, reject) => {
    const child = spawn(OPENCODE_CLI, args, { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('close', () => {
      const lines = stdout.split('\n').filter(l => l.trim());
      let content = '';
      for (const line of lines) {
        try { const evt = JSON.parse(line); if (evt.type === 'message.delta' && evt.content) content += evt.content; if (evt.type === 'message.assistant' && evt.content) content = evt.content; } catch {}
      }
      if (!content && stderr) reject(new Error(stderr)); else resolve(content || '(no response)');
    });
    child.on('error', (err: Error) => reject(err));
  });
}

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: '*' });
await fastify.register(websocket);

// ===== Routes =====
fastify.get('/api/keys', async () => keysData);
fastify.post('/api/keys', async (request) => {
  const body = request.body as any;
  const newKey = { id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...body, status: 'untested', createdAt: new Date().toISOString() };
  keysData.keys.push(newKey); saveJSON(CONFIG_FILE, keysData); return newKey;
});
fastify.put('/api/keys/:id', async (request) => {
  const { id } = request.params as any; const body = request.body as any;
  const idx = keysData.keys.findIndex((k: any) => k.id === id); if (idx === -1) return { error: 'Not found' };
  keysData.keys[idx] = { ...keysData.keys[idx], ...body }; saveJSON(CONFIG_FILE, keysData); return keysData.keys[idx];
});
fastify.delete('/api/keys/:id', async (request) => {
  const { id } = request.params as any;
  keysData.keys = keysData.keys.filter((k: any) => k.id !== id); saveJSON(CONFIG_FILE, keysData); return { ok: true };
});

fastify.post('/api/parse', async (request) => {
  const { text, parseModel, parseBaseURL, parseApiKey } = request.body as any;
  const openaiUrl = parseBaseURL || 'https://opencode.ai/zen/v1';
  const apiKey = parseApiKey || '';
  const model = parseModel || 'deepseek-v4-flash-free';
  try {
    const response = await fetch(`${openaiUrl}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Extract API keys and endpoints from the user message. Return JSON array of objects with fields: key, baseURL, provider, models. If endpoint not found, use empty string. If models not found, use empty array.' }, { role: 'user', content: text }], max_tokens: 1000, temperature: 0 }),
    });
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '[]';
    let parsed; try { parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); } catch { parsed = []; }
    return { parsed, raw: content };
  } catch (e: any) { return { error: e.message, parsed: [] }; }
});

fastify.get('/api/agents', async () => agentsData);
fastify.put('/api/agents', async (request) => { agentsData = request.body as any; saveJSON(AGENTS_FILE, agentsData); return { ok: true }; });
fastify.get('/api/providers', async () => providersData);
fastify.put('/api/providers', async (request) => { providersData = request.body as any; saveJSON(PROVIDERS_FILE, providersData); return { ok: true }; });
fastify.get('/api/models/:providerId', async (request) => {
  const { providerId } = request.params as any;
  const provider = providersData.providers.find((p: any) => p.id === providerId);
  if (!provider) return { error: 'Provider not found' };
  try {
    const response = await fetch(`${provider.baseURL}/models`, { headers: { Authorization: `Bearer ${provider.apiKey}` } });
    const data = await response.json() as any;
    return { models: (data.data || []).map((m: any) => m.id) };
  } catch (e: any) { return { error: e.message }; }
});

// OpenCode Zen endpoints (free, no key needed)
fastify.get('/api/opencode/status', async () => ({ available: true, port: 0, cli: null, direct: true }));
fastify.post('/api/opencode/start', async () => ({ started: true, ready: true }));
fastify.post('/api/opencode/chat', async (request) => {
  const { model, message, customPrompt } = request.body as any;
  try {
    const messages = customPrompt
      ? [{ role: 'system', content: customPrompt }, { role: 'user', content: message }]
      : [{ role: 'user', content: message }];
    const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: 1000 }),
    });
    const data = await response.json() as any;
    if (data.error) return { error: data.error.message || 'Unknown error' };
    return { content: data.choices?.[0]?.message?.content || '(no response)', model };
  } catch (e: any) { return { error: e.message }; }
});
fastify.get('/api/opencode/models', async () => ({ models: ['deepseek-v4-flash-free', 'big-pickle', 'mimo-v2.5-free', 'laguna-s-2.1-free', 'ling-3.0-tiny-free', 'longcat-2.0-free', 'north-mini-code-free', 'nemotron-3-ultra-free', 'kimi-k3', 'glm-5.2', 'deepseek-v4-pro', 'qwen3.7-max', 'grok-4.5'] }));

// WebSocket chat
fastify.register(async (app) => {
  app.get('/ws/chat', { websocket: true }, (socket, req) => {
    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { key, baseURL, model, messages, customPrompt, temperature, maxTokens } = msg;
        const finalMessages = [...messages];
        if (customPrompt) finalMessages.unshift({ role: 'system', content: customPrompt });
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: finalMessages, temperature: temperature ?? 0.7, max_tokens: maxTokens ?? 1000, stream: true }),
        });
        if (!response.ok) { socket.send(JSON.stringify({ error: `HTTP ${response.status}: ${await response.text()}` })); socket.close(); return; }
        const reader = response.body?.getReader();
        if (!reader) { socket.send(JSON.stringify({ error: 'No response body' })); socket.close(); return; }
        const decoder = new TextDecoder(); let buffer = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') { socket.send(JSON.stringify({ done: true })); socket.close(); return; }
              try { const parsed = JSON.parse(data); const content = parsed.choices?.[0]?.delta?.content || ''; if (content) socket.send(JSON.stringify({ content })); } catch {}
            }
          }
        }
        socket.send(JSON.stringify({ done: true })); socket.close();
      } catch (e: any) { socket.send(JSON.stringify({ error: e.message })); socket.close(); }
    });
  });
});

const PORT = parseInt(process.env.PORT || '31337');
const HOST = process.env.HOST || '0.0.0.0';
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`KeyTester server running on http://${HOST}:${PORT}`);
  if (process.env.USE_OPENCODE_PROXY === '1' || process.env.USE_OPENCODE_PROXY === 'true') { console.log('OpenCode Zen: free models available directly (no proxy needed)'); }
} catch (e) { console.error(e); process.exit(1); }