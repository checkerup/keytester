export interface ApiKey {
  id: string;
  name: string;
  key: string;
  baseURL: string;
  provider?: string;
  models?: string[];
  customPrompt?: string;
  status?: 'untested' | 'working' | 'failed';
  lastResponse?: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TestResult {
  model: string;
  status: number;
  content: string;
  error?: string;
  latencyMs: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  npm?: string;
}