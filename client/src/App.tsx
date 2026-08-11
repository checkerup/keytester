import { useState, useEffect, useRef, useCallback } from 'react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  baseURL: string;
  provider?: string;
  models?: string[];
  customPrompt?: string;
  status?: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
}

interface Provider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
}

interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const C = {
  bg: '#0a0e14',
  surface: '#15171c',
  surface2: '#1c1f26',
  border: '#2a2d35',
  text: '#e6e6e6',
  textDim: '#8b8b8b',
  accent: '#7c3aed',
  accent2: '#06b6d4',
  success: '#10b981',
  danger: '#ef4444',
  warn: '#f59e0b',
};

export default function App() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [parseInput, setParseInput] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [parseModel] = useState('deepseek-v4-flash-free');
  const [parseBaseURL] = useState('https://opencode.ai/zen/v1');
  const [parseApiKey] = useState('');
  const [tab, setTab] = useState<'chat' | 'keys' | 'agents' | 'providers'>('chat');
  const [useZen, setUseZen] = useState(true);
  const [zenModel, setZenModel] = useState('deepseek-v4-flash-free');
  const wsRef = useRef<WebSocket | null>(null);
  const streamContentRef = useRef('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedKey = keys.find(k => k.id === selectedKeyId);

  const fetchData = useCallback(async () => {
    try {
      const [kRes, aRes, pRes] = await Promise.all([
        fetch('/api/keys').then(r => r.json()),
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/providers').then(r => r.json()),
      ]);
      setKeys(kRes.keys || []);
      setAgents(aRes.agents || []);
      setProviders(pRes.providers || []);
    } catch (e) { console.error('Fetch error:', e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!selectedKeyId && keys.length > 0) setSelectedKeyId(keys[0].id); }, [keys, selectedKeyId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || streaming) return;
    if (!useZen && !selectedKey) return;
    const userMsg: ChatMsg = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setStreaming(true);
    streamContentRef.current = '';

    if (useZen) {
      try {
        const res = await fetch('/api/opencode/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: zenModel, message: chatInput }),
        });
        const data = await res.json();
        if (data.error) setChatMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error}` }]);
        else setChatMessages([...newMessages, { role: 'assistant', content: data.content }]);
      } catch (e: any) { setChatMessages([...newMessages, { role: 'assistant', content: `Error: ${e.message}` }]); }
      setStreaming(false);
      return;
    }

    const ws = new WebSocket(`ws://${location.host}/ws/chat`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.content) { streamContentRef.current += data.content; setChatMessages([...newMessages, { role: 'assistant', content: streamContentRef.current }]); }
      if (data.done) { setStreaming(false); ws.close(); }
      if (data.error) { setChatMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error}` }]); setStreaming(false); ws.close(); }
    };
    ws.onclose = () => setStreaming(false);
    ws.onerror = () => setStreaming(false);
    ws.onopen = () => {
      const model = selectedKey!.models?.[0] || 'kimi-k3';
      ws.send(JSON.stringify({ key: selectedKey!.key, baseURL: selectedKey!.baseURL, model, messages: newMessages, customPrompt: selectedKey!.customPrompt }));
    };
  };

  const doParse = async () => {
    if (!parseInput.trim()) return;
    try {
      const res = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: parseInput, parseModel, parseBaseURL, parseApiKey }) });
      const data = await res.json(); setParseResult(data);
    } catch (e) { console.error('Parse error:', e); }
  };

  const addKey = async (keyData: Partial<ApiKey>) => {
    const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(keyData) });
    const data = await res.json(); setKeys([...keys, data]); setSelectedKeyId(data.id);
  };
  const deleteKey = async (id: string) => { await fetch(`/api/keys/${id}`, { method: 'DELETE' }); setKeys(keys.filter(k => k.id !== id)); if (selectedKeyId === id) setSelectedKeyId(null); };
  const saveAgents = async (a: Agent[]) => { setAgents(a); await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agents: a }) }); };
  const saveProviders = async (p: Provider[]) => { setProviders(p); await fetch('/api/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providers: p }) }); };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700 }}>K</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>KeyTester</div>
            <div style={{ fontSize: '11px', color: C.textDim }}>{keys.length} keys</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {keys.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textDim, fontSize: '13px' }}>No keys yet.<br/>Add via Keys tab</div>}
          {keys.map(k => (
            <div key={k.id} onClick={() => { setSelectedKeyId(k.id); setChatMessages([]); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.surface2}`, background: selectedKeyId === k.id ? C.surface2 : 'transparent', borderLeft: selectedKeyId === k.id ? `3px solid ${C.accent}` : '3px solid transparent', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{k.name || k.key.slice(0, 20) + '...'}</div>
              <div style={{ fontSize: '11px', color: C.textDim, marginTop: '2px' }}>{k.provider || k.baseURL}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: C.textDim }}>{k.models?.length || 0} models</span>
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: k.status === 'working' ? `${C.success}22` : k.status === 'failed' ? `${C.danger}22` : `${C.border}`, color: k.status === 'working' ? C.success : k.status === 'failed' ? C.danger : C.textDim }}>{k.status || 'untested'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          {(['chat', 'keys', 'agents', 'providers'] as const).map(t => (
            <div key={t} onClick={() => setTab(t)} style={{ padding: '14px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: tab === t ? C.accent2 : C.textDim, borderBottom: tab === t ? `2px solid ${C.accent2}` : '2px solid transparent', transition: 'all 0.15s' }}>{t}</div>
          ))}
        </div>

        {/* Chat */}
        {tab === 'chat' && (
          <>
            {/* Zen toggle */}
            <div style={{ padding: '10px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: useZen ? C.success : C.textDim }}>
                <div onClick={() => setUseZen(!useZen)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: useZen ? C.success : C.border, position: 'relative', transition: '0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: useZen ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }} />
                </div>
                Zen Free Models
              </label>
              {useZen && (
                <select value={zenModel} onChange={e => setZenModel(e.target.value)} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, padding: '6px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                  <optgroup label="Free Models">
                    <option value="deepseek-v4-flash-free">DeepSeek V4 Flash Free</option>
                    <option value="big-pickle">Big Pickle</option>
                    <option value="mimo-v2.5-free">MiMo V2.5 Free</option>
                    <option value="laguna-s-2.1-free">Laguna S 2.1 Free</option>
                    <option value="ling-3.0-tiny-free">Ling 3.0 Tiny Free</option>
                    <option value="longcat-2.0-free">LongCat 2.0 Free</option>
                    <option value="north-mini-code-free">North Mini Code Free</option>
                    <option value="nemotron-3-ultra-free">Nemotron 3 Ultra Free</option>
                  </optgroup>
                  <optgroup label="Zen Models">
                    <option value="kimi-k3">Kimi K3</option>
                    <option value="glm-5.2">GLM 5.2</option>
                    <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                    <option value="qwen3.7-max">Qwen 3.7 Max</option>
                    <option value="grok-4.5">Grok 4.5</option>
                  </optgroup>
                </select>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatMessages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: C.textDim }}>
                  <div style={{ fontSize: '48px' }}>💬</div>
                  <div style={{ fontSize: '15px' }}>{useZen ? `Chat with ${zenModel}` : (selectedKey ? `Chat with ${selectedKey.name}` : 'Select a key to start')}</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: msg.role === 'user' ? C.accent : C.surface2, color: msg.role === 'user' ? '#fff' : C.text }}>{msg.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '16px 20px', background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', gap: '10px' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat())} placeholder={useZen ? `Message ${zenModel}...` : (selectedKey ? 'Type message...' : 'Select a key first')} disabled={streaming || (!useZen && !selectedKey)} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, padding: '12px 16px', fontSize: '14px', outline: 'none' }} />
              <button onClick={sendChat} disabled={streaming || (!useZen && !selectedKey)} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: (streaming || (!useZen && !selectedKey)) ? 0.5 : 1 }}>{streaming ? '⏳' : '➤'}</button>
            </div>
          </>
        )}

        {/* Keys */}
        {tab === 'keys' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Parse Keys from Text</h2>
            <textarea value={parseInput} onChange={e => setParseInput(e.target.value)} placeholder="Paste key + endpoint here..." style={{ width: '100%', minHeight: '100px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, padding: '12px', fontSize: '14px', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
            <button onClick={doParse} style={{ marginTop: '12px', background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>Parse</button>
            {parseResult?.parsed?.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {parseResult.parsed.map((k: any, i: number) => (
                  <button key={i} onClick={() => addKey({ name: k.provider || `Key ${keys.length + 1}`, key: k.key, baseURL: k.baseURL, provider: k.provider, models: k.models || [] })} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, padding: '12px 16px', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>Add: {k.key.slice(0, 25)}... ({k.baseURL})</button>
                ))}
              </div>
            )}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '32px', marginBottom: '16px' }}>Add Key Manually</h2>
            <ManualKeyForm onAdd={addKey} />
          </div>
        )}

        {/* Agents */}
        {tab === 'agents' && <AgentsTab agents={agents} onSave={saveAgents} />}
        {/* Providers */}
        {tab === 'providers' && <ProvidersTab providers={providers} onSave={saveProviders} />}
      </div>
    </div>
  );
}

function ManualKeyForm({ onAdd }: { onAdd: (k: Partial<ApiKey>) => void }) {
  const [name, setName] = useState(''); const [key, setKey] = useState(''); const [baseURL, setBaseURL] = useState(''); const [models, setModels] = useState(''); const [customPrompt, setCustomPrompt] = useState('');
  const i = { width: '100%', background: '#1c1f26', border: '1px solid #2a2d35', borderRadius: '10px', color: '#e6e6e6', padding: '10px 14px', fontSize: '14px', outline: 'none', marginBottom: '10px' };
  return (
    <div>
      <input style={i} value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
      <input style={i} value={key} onChange={e => setKey(e.target.value)} placeholder="API Key" />
      <input style={i} value={baseURL} onChange={e => setBaseURL(e.target.value)} placeholder="Base URL" />
      <input style={i} value={models} onChange={e => setModels(e.target.value)} placeholder="Models (comma separated)" />
      <textarea style={{ ...i, minHeight: '60px', resize: 'vertical', fontFamily: 'monospace' }} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Custom system prompt (optional)" />
      <button onClick={() => { onAdd({ name: name || `Key ${Date.now()}`, key, baseURL, models: models.split(',').map(m => m.trim()).filter(Boolean), customPrompt: customPrompt || undefined }); setName(''); setKey(''); setBaseURL(''); setModels(''); setCustomPrompt(''); }} style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>Add Key</button>
    </div>
  );
}

function AgentsTab({ agents, onSave }: { agents: Agent[]; onSave: (a: Agent[]) => void }) {
  const [local, setLocal] = useState(agents);
  const i = { width: '100%', background: '#1c1f26', border: '1px solid #2a2d35', borderRadius: '10px', color: '#e6e6e6', padding: '10px 14px', fontSize: '14px', outline: 'none', marginBottom: '8px' } as const;
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Agents</h2>
      {local.map((a, idx) => (
        <div key={a.id} style={{ background: '#15171c', border: '1px solid #2a2d35', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <input style={i} value={a.name} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], name: e.target.value }; setLocal(n); }} placeholder="Agent name" />
          <textarea style={{ ...i, minHeight: '80px', resize: 'vertical', fontFamily: 'monospace' }} value={a.systemPrompt} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], systemPrompt: e.target.value }; setLocal(n); }} placeholder="System prompt" />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={() => onSave(local)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Save</button>
            <button onClick={() => { const n = local.filter((_, i2) => i2 !== idx); setLocal(n); onSave(n); }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={() => setLocal([...local, { id: `agent-${Date.now()}`, name: 'New Agent', systemPrompt: '' }])} style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Add Agent</button>
    </div>
  );
}

function ProvidersTab({ providers, onSave }: { providers: Provider[]; onSave: (p: Provider[]) => void }) {
  const [local, setLocal] = useState(providers);
  const i = { width: '100%', background: '#1c1f26', border: '1px solid #2a2d35', borderRadius: '10px', color: '#e6e6e6', padding: '10px 14px', fontSize: '14px', outline: 'none', marginBottom: '8px' } as const;
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Providers</h2>
      {local.map((p, idx) => (
        <div key={p.id} style={{ background: '#15171c', border: '1px solid #2a2d35', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <input style={i} value={p.name} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], name: e.target.value }; setLocal(n); }} placeholder="Name" />
          <input style={i} value={p.baseURL} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], baseURL: e.target.value }; setLocal(n); }} placeholder="Base URL" />
          <input style={i} value={p.apiKey} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], apiKey: e.target.value }; setLocal(n); }} placeholder="API Key" />
          <input style={i} value={(p.models || []).join(', ')} onChange={e => { const n = [...local]; n[idx] = { ...n[idx], models: e.target.value.split(',').map(m => m.trim()).filter(Boolean) }; setLocal(n); }} placeholder="Models" />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={() => onSave(local)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Save</button>
            <button onClick={() => { const n = local.filter((_, i2) => i2 !== idx); setLocal(n); onSave(n); }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
          </div>
        </div>
      ))}
      <button onClick={() => setLocal([...local, { id: `prov-${Date.now()}`, name: 'New Provider', baseURL: '', apiKey: '', models: [] }])} style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Add Provider</button>
    </div>
  );
}