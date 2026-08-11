# KeyTester

LLM API Key Tester with chat UI — 在聊天模式下测试 LLM API 密钥。

## 功能

- **LLM 密钥解析器**：粘贴包含密钥和端点的消息 — LLM 自动检测密钥、URL 和提供商
- **聊天测试**：通过带流式传输的聊天实时测试密钥
- **自定义提示词**：将系统提示词绑定到单个密钥（类似 Opencode）
- **代理管理**：通过 UI 或 `AGENTS.md` 编辑提示词
- **自定义提供商**：添加您自己的端点
- **OpenCode Zen**：通过本地代理使用免费模型
- **配置存储**：密钥、代理和提供商保存在 JSON 文件中

## 安装

```bash
cd keytester
npm install
```

## 运行

```bash
# 开发模式（服务器 + 客户端）
npm run dev

# 开发模式 + OpenCode Zen 代理（免费模型）
npm run dev:zen

# 生产构建
npm run build
npm start

# 生产模式 + Zen 代理
npm run start:zen
```

服务器：`http://localhost:31337`
界面：`http://localhost:5174`

## OpenCode Zen — 免费模型

KeyTester 可以通过本地代理使用 OpenCode Zen 的免费模型。

### 可用的免费模型：
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `big-pickle` — Big Pickle（隐形模型）
- `mimo-v2.5-free` — MiMo V2.5
- `laguna-s-2.1-free` — Laguna S 2.1
- `ling-3.0-tiny-free` — Ling 3.0 Tiny
- `longcat-2.0-free` — LongCat 2.0
- `north-mini-code-free` — North Mini Code
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

### 工作原理：
1. KeyTester 启动 `opencode-cli serve` 作为本地代理
2. 请求通过 `opencode run` 代理到免费模型
3. 激活方式：运行 `npm run dev:zen` 或在 UI 中勾选 "Use OpenCode Zen"

### 要求：
- 已安装 OpenCode CLI（`opencode-cli`）
- 已认证的 OpenCode Zen 账户（`opencode auth login -p opencode`）
- 环境变量 `OPENCODE_CLI` — opencode-cli.exe 路径
- 环境变量 `OPENCODE_SERVER_PASSWORD` — 代理密码

## 配置

- `config/keys.json` — 密钥列表
- `config/agents.json` — 系统提示词
- `config/providers.json` — 自定义提供商
- `.env.example` — 环境变量示例

## 技术栈

- **后端**：TypeScript + Fastify + WebSocket
- **前端**：React + Vite
- **解析 LLM**：Blackbox（免费模型）

## 许可证

MIT