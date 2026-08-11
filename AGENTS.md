# KeyTester Agents Configuration

## Default System Prompts

Agents are defined in `config/agents.json` and editable through the UI (Agents tab).

### Built-in Agents

1. **Default Agent** (`default`)
   - Prompt: `You are a helpful assistant. Answer concisely.`
   - Use for general testing

2. **Code Reviewer** (`coder`)
   - Prompt: `You are an expert code reviewer. Analyze code and suggest improvements.`
   - Use for testing code generation capabilities

3. **Translator** (`translator`)
   - Prompt: `You are a professional translator. Translate text accurately.`
   - Use for testing multilingual capabilities

## Custom Prompts per Key

Each key can have a `customPrompt` field that overrides the default agent prompt. Set this when adding a key manually or editing an existing key.

## Modifying Agents

### Via UI
Go to the **Agents** tab, edit the system prompt text, and click **Save**.

### Via AGENTS.md (this file)
This file documents the agents. To add new agents programmatically, edit `config/agents.json` directly.

### Via API
```
PUT /api/agents
Body: { "agents": [{ "id": "...", "name": "...", "systemPrompt": "..." }] }
```

## Lightweight Prompt Guidelines

- Keep prompts under 500 characters for fast testing
- Use simple, direct instructions
- Avoid XML tags (some models don't support them)
- Test with temperature 0 for consistent results