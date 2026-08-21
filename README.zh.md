[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) [![Русский](https://img.shields.io/badge/lang-Русский-red.svg)](README.ru.md) [![中文](https://img.shields.io/badge/lang-中文-green.svg)](README.zh.md)

# KeyTester

LLM API Key Tester with chat UI вЂ” ењЁиЃЉе¤©жЁЎејЏдё‹жµ‹иЇ• LLM API еЇ†й’ҐгЂ‚

## еЉџиѓЅ

- **LLM еЇ†й’Ґи§Јжћђе™Ё**пјљзІиґґеЊ…еђ«еЇ†й’Ґе’Њз«Їз‚№зљ„ж¶€жЃЇ вЂ” LLM и‡ЄеЉЁжЈЂжµ‹еЇ†й’ҐгЂЃURL е’ЊжЏђдѕ›е•†
- **иЃЉе¤©жµ‹иЇ•**пјљйЂљиї‡её¦жµЃејЏдј иѕ“зљ„иЃЉе¤©е®ћж—¶жµ‹иЇ•еЇ†й’Ґ
- **и‡Єе®љд№‰жЏђз¤єиЇЌ**пјље°†зі»з»џжЏђз¤єиЇЌз»‘е®ље€°еЌ•дёЄеЇ†й’Ґпј€з±»дјј Opencodeпј‰
- **д»Јзђ†з®Ўзђ†**пјљйЂљиї‡ UI ж€– `AGENTS.md` зј–иѕ‘жЏђз¤єиЇЌ
- **и‡Єе®љд№‰жЏђдѕ›е•†**пјљж·»еЉ ж‚Ёи‡Єе·±зљ„з«Їз‚№
- **OpenCode Zen**пјљйЂљиї‡жњ¬ењ°д»Јзђ†дЅїз”Ёе…Ќиґ№жЁЎећ‹
- **й…ЌзЅ®е­е‚Ё**пјљеЇ†й’ҐгЂЃд»Јзђ†е’ЊжЏђдѕ›е•†дїќе­ењЁ JSON ж–‡д»¶дё­

## е®‰иЈ…

```bash
cd keytester
npm install
```

## иїђиЎЊ

```bash
# ејЂеЏ‘жЁЎејЏпј€жњЌеЉЎе™Ё + е®ўж€·з«Їпј‰
npm run dev

# ејЂеЏ‘жЁЎејЏ + OpenCode Zen д»Јзђ†пј€е…Ќиґ№жЁЎећ‹пј‰
npm run dev:zen

# з”џдє§жћ„е»є
npm run build
npm start

# з”џдє§жЁЎејЏ + Zen д»Јзђ†
npm run start:zen
```

жњЌеЉЎе™Ёпјљ`http://localhost:31337`
з•Њйќўпјљ`http://localhost:5174`

## OpenCode Zen вЂ” е…Ќиґ№жЁЎећ‹

KeyTester еЏЇд»ҐйЂљиї‡жњ¬ењ°д»Јзђ†дЅїз”Ё OpenCode Zen зљ„е…Ќиґ№жЁЎећ‹гЂ‚

### еЏЇз”Ёзљ„е…Ќиґ№жЁЎећ‹пјљ
- `deepseek-v4-flash-free` вЂ” DeepSeek V4 Flash
- `big-pickle` вЂ” Big Pickleпј€йљђеЅўжЁЎећ‹пј‰
- `mimo-v2.5-free` вЂ” MiMo V2.5
- `laguna-s-2.1-free` вЂ” Laguna S 2.1
- `ling-3.0-tiny-free` вЂ” Ling 3.0 Tiny
- `longcat-2.0-free` вЂ” LongCat 2.0
- `north-mini-code-free` вЂ” North Mini Code
- `nemotron-3-ultra-free` вЂ” Nemotron 3 Ultra

### е·ҐдЅњеЋџзђ†пјљ
1. KeyTester еђЇеЉЁ `opencode-cli serve` дЅњдёєжњ¬ењ°д»Јзђ†
2. иЇ·ж±‚йЂљиї‡ `opencode run` д»Јзђ†е€°е…Ќиґ№жЁЎећ‹
3. жїЂжґ»ж–№ејЏпјљиїђиЎЊ `npm run dev:zen` ж€–ењЁ UI дё­е‹ѕйЂ‰ "Use OpenCode Zen"

### и¦Ѓж±‚пјљ
- е·Іе®‰иЈ… OpenCode CLIпј€`opencode-cli`пј‰
- е·Іи®¤иЇЃзљ„ OpenCode Zen иґ¦ж€·пј€`opencode auth login -p opencode`пј‰
- зЋЇеўѓеЏй‡Џ `OPENCODE_CLI` вЂ” opencode-cli.exe и·Їеѕ„
- зЋЇеўѓеЏй‡Џ `OPENCODE_SERVER_PASSWORD` вЂ” д»Јзђ†еЇ†з Ѓ

## й…ЌзЅ®

- `config/keys.json` вЂ” еЇ†й’Ґе€—иЎЁ
- `config/agents.json` вЂ” зі»з»џжЏђз¤єиЇЌ
- `config/providers.json` вЂ” и‡Єе®љд№‰жЏђдѕ›е•†
- `.env.example` вЂ” зЋЇеўѓеЏй‡Џз¤єдѕ‹

## жЉЂжњЇж €

- **еђЋз«Ї**пјљTypeScript + Fastify + WebSocket
- **е‰Ќз«Ї**пјљReact + Vite
- **и§Јжћђ LLM**пјљBlackboxпј€е…Ќиґ№жЁЎећ‹пј‰

## и®ёеЏЇиЇЃ

MIT