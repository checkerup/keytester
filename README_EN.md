# KeyTester

LLM API Key Tester with chat UI — test LLM API keys in chat mode.

## Features

- **LLM Key Parser**: paste a message with key and endpoint — LLM auto-detects key, URL and provider
- **Chat Testing**: test keys in real-time via chat with streaming
- **Custom Prompts**: attach system prompts to individual keys (like in Opencode)
- **Agent Management**: edit prompts via UI or `AGENTS.md`
- **Custom Providers**: add your own endpoints
- **OpenCode Zen**: free models via local proxy
- **Config Storage**: keys, agents, providers saved in JSON files

## Installation

```bash
cd keytester
npm install
```

## Running

```bash
# Development (server + client)
npm run dev

# Development with OpenCode Zen proxy (free models)
npm run dev:zen

# Production build
npm run build
npm start

# Production with Zen proxy
npm run start:zen
```

Server: `http://localhost:31337`
UI: `http://localhost:5174`

## OpenCode Zen — Free Models

KeyTester can use free models from OpenCode Zen via local proxy.

### Available free models:
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `big-pickle` — Big Pickle (stealth model)
- `mimo-v2.5-free` — MiMo V2.5
- `laguna-s-2.1-free` — Laguna S 2.1
- `ling-3.0-tiny-free` — Ling 3.0 Tiny
- `longcat-2.0-free` — LongCat 2.0
- `north-mini-code-free` — North Mini Code
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

### How it works:
1. KeyTester starts `opencode-cli serve` as local proxy
2. Requests proxied via `opencode run` with free models
3. To activate: run `npm run dev:zen` or toggle "Use OpenCode Zen" in UI

### Requirements:
- Installed OpenCode CLI (`opencode-cli`)
- Authenticated OpenCode Zen account (`opencode auth login -p opencode`)
- Env var `OPENCODE_CLI` — path to opencode-cli.exe
- Env var `OPENCODE_SERVER_PASSWORD` — proxy password

## Configuration

- `config/keys.json` — keys list
- `config/agents.json` — system prompts
- `config/providers.json` — custom providers
- `.env.example` — environment variables example

## Stack

- **Backend**: TypeScript + Fastify + WebSocket
- **Frontend**: React + Vite
- **Parser LLM**: Blackbox (free models)

## License

MIT