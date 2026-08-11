# KeyTester

LLM API Key Tester with chat UI — тестирование API-ключей для LLM в режиме чата.

## Возможности

- **LLM-парсер ключей**: вставьте сообщение с ключом и эндпоинтом — LLM автоматически определит ключ, URL и провайдера
- **Чат-тестирование**: проверяйте ключи в реальном времени через чат со стримингом
- **Кастом промпты**: привязывайте системные промпты к отдельным ключам (как в Opencode)
- **Управление агентами**: редактируйте промпты через UI или `AGENTS.md`
- **Кастом провайдеры**: добавляйте свои эндпоинты
- **OpenCode Zen**: бесплатные модели через локальный прокси
- **Хранение конфигурации**: ключи, агенты и провайдеры сохраняются в JSON-файлах

## Установка

```bash
cd keytester
npm install
```

## Запуск

```bash
# Development (server + client)
npm run dev

# Development с OpenCode Zen прокси (бесплатные модели)
npm run dev:zen

# Production build
npm run build
npm start

# Production с Zen прокси
npm run start:zen
```

Сервер: `http://localhost:31337`
UI: `http://localhost:5174`

## OpenCode Zen — бесплатные модели

KeyTester может использовать бесплатные модели из OpenCode Zen через локальный прокси.

### Доступные бесплатные модели:
- `deepseek-v4-flash-free` — DeepSeek V4 Flash
- `big-pickle` — Big Pickle (stealth model)
- `mimo-v2.5-free` — MiMo V2.5
- `laguna-s-2.1-free` — Laguna S 2.1
- `ling-3.0-tiny-free` — Ling 3.0 Tiny
- `longcat-2.0-free` — LongCat 2.0
- `north-mini-code-free` — North Mini Code
- `nemotron-3-ultra-free` — Nemotron 3 Ultra

### Как это работает:
1. KeyTester запускает `opencode-cli serve` как локальный прокси
2. Запросы проксируются через `opencode run` с бесплатными моделями
3. Для активации: запустите `npm run dev:zen` или включите чекбокс "Use OpenCode Zen" в UI

### Требования:
- Установленный OpenCode CLI (`opencode-cli`)
- Авторизованный OpenCode Zen аккаунт (`opencode auth login -p opencode`)
- Env var `OPENCODE_CLI` — путь к opencode-cli.exe
- Env var `OPENCODE_SERVER_PASSWORD` — пароль для прокси

## Конфигурация

- `config/keys.json` — список ключей
- `config/agents.json` — системные промпты
- `config/providers.json` — кастомные провайдеры
- `.env.example` — пример переменных окружения

## Стек

- **Backend**: TypeScript + Fastify + WebSocket
- **Frontend**: React + Vite
- **LLM для парсинга**: Blackbox (бесплатные модели)

## Лицензия

MIT