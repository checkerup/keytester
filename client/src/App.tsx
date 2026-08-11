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
  model?: string;
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
  const [parseModel, setParseModel] = useState('laguna-s-2.1-free');
  const [parseBaseURL, setParseBaseURL] = useState('https://opencode.ai/zen/v1');
  const [parseApiKey, setParseApiKey] = useState('');
  const [tab, setTab] = useState<'chat' | 'keys' | 'agents' | 'providers'>('chat');
  const [useZen, setUseZen] = useState(false);
  const [zenModel, setZenModel] = useState('deepseek-v4-flash-free');
  const wsRef = useRef<WebSocket | null>(null);
  const streamContentRef = useRef('');

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
  const updateKey = async (id: string, updates: Partial<ApiKey>) => {
    await fetch(`/api/keys/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setKeys(keys.map(k => k.id === id ? { ...k, ...updates } : k));
  };
  const deleteKey = async (id: string) => {
    await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    setKeys(keys.filter(k => k.id !== id));
    if (selectedKeyId === id) setSelectedKeyId(null);
  };
  const saveAgents = async (newAgents: Agent[]) => { setAgents(newAgents); await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agents: newAgents }) }); };
  const saveProviders = async (newProviders: Provider[]) => { setProviders(newProviders); await fetch('/api/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providers: newProviders }) }); };

  const S = {
    container: { display: 'flex', height: '100vh', background: '#0d1117' as const },
    sidebar: { width: '320px', borderRight: '1px solid #30363d' as const, display: 'flex', flexDirection: 'column' as const },
    sidebarHeader: { padding: '16px', borderBottom: '1px solid #30363d' as const, fontWeight: 700 as const, fontSize: '16px' as const },
    keyItem: { padding: '10px 16px', cursor: 'pointer' as const, borderBottom: '1px solid #21262d' as const },
    keyItemSelected: { background: '#1f6feb22' as const, borderLeft: '3px solid #58a6ff' as const },
    keyStatus: { fontSize: '11px' as const, color: '#8b949e' as const, marginTop: '4px' as const },
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const },
    tabs: { display: 'flex', borderBottom: '1px solid #30363d' as const, background: '#161b22' as const },
    tab: { padding: '12px 20px', cursor: 'pointer' as const, borderRight: '1px solid #30363d' as const, fontSize: '14px' as const },
    tabActive: { background: '#0d1117' as const, color: '#58a6ff' as const, borderBottom: '2px solid #58a6ff' as const },
    content: { flex: 1, overflow: 'auto' as const, padding: '20px' as const },
    chatArea: { flex: 1, overflow: 'auto' as const, padding: '20px' as const, display: 'flex' as const, flexDirection: 'column' as const, gap: '12px' as const },
    msg: { maxWidth: '70%', padding: '10px 14px', borderRadius: '8px' as const, fontSize: '14px' as const, lineHeight: 1.5 as const, whiteSpace: 'pre-wrap' as const },
    msgUser: { background: '#1f6feb' as const, alignSelf: 'flex-end' as const },
    msgAssistant: { background: '#21262d' as const, alignSelf: 'flex-start' as const },
    chatInput: { display: 'flex' as const, padding: '12px' as const, borderTop: '1px solid #30363d' as const, background: '#161b22' as const },
    input: { flex: 1, background: '#0d1117' as const, border: '1px solid #30363d' as const, borderRadius: '6px' as const, color: '#c9d1d9' as const, padding: '10px 14px' as const, fontSize: '14px' as const, outline: 'none' as const },
    btn: { background: '#238636' as const, color: '#fff' as const, border: 'none' as const, borderRadius: '6px' as const, padding: '10px 18px' as const, cursor: 'pointer' as const, fontSize: '14px' as const, fontWeight: 600 as const },
    btnSecondary: { background: '#21262d' as const, color: '#c9d1d9' as const, border: '1px solid #30363d' as const, borderRadius: '6px' as const, padding: '10px 18px' as const, cursor: 'pointer' as const, fontSize: '14px' as const },
    badge: { display: 'inline-block' as const, padding: '2px 8px' as const, borderRadius: '4px' as const, fontSize: '11px' as const, marginLeft: '8px' as const },
    badgeWorking: { background: '#23863633' as const, color: '#3fb950' as const },
    badgeFailed: { background: '#da363333' as const, color: '#f85149' as const },
    badgeUntested: { background: '#30363d' as const, color: '#8b949e' as const },
    textarea: { width: '100%' as const, background: '#0d1117' as const, border: '1px solid #30363d' as const, borderRadius: '6px' as const, color: '#c9d1d9' as const, padding: '10px' as const, fontSize: '14px' as const, fontFamily: 'monospace' as const, outline: 'none' as const, resize: 'vertical' as const },
    field: { marginBottom: '12px' as const },
    label: { display: 'block' as const, fontSize: '12px' as const, color: '#8b949e' as const, marginBottom: '4px' as const },
    keyName: { fontSize: '14px' as const, fontWeight: 500 as const },
    keyMeta: { fontSize: '11px' as const, color: '#8b949e' as const, marginTop: '2px' as const },
    empty: { padding: '40px', textAlign: 'center' as const, color: '#8b949e' as const },
    parseResult: { marginTop: '12px' as const, padding: '12px' as const, background: '#161b22' as const, borderRadius: '6px' as const, border: '1px solid #30363d' as const },
  };

  return (
    <div style={S.container}>
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>API Keys ({keys.length})</div>
        {keys.length === 0 && <div style={S.empty}>No keys yet. Use Keys tab to add.</div>}
        {keys.map(k => (
          <div key={k.id} style={{ ...S.keyItem, ...(selectedKeyId === k.id ? S.keyItemSelected : {}) }} onClick={() => { setSelectedKeyId(k.id); setChatMessages([]); }}>
            <div style={S.keyName}>{k.name || k.key.slice(0, 20) + '...'}</div>
            <div style={S.keyMeta}>{k.provider || k.baseURL}</div>
            <div style={S.keyStatus}>
              {k.models?.length || 0} models
              <span style={{ ...S.badge, ...(k.status === 'working' ? S.badgeWorking : k.status === 'failed' ? S.badgeFailed : S.badgeUntested) }}>{k.status || 'untested'}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={S.main}>
        <div style={S.tabs}>
          {(['chat', 'keys', 'agents', 'providers'] as const).map(t => (
            <div key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>{t}</div>
          ))}
        </div>
        {tab === 'chat' && (
          <>
            <div style={{ padding: '8px 12px', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: useZen ? '#3fb950' : '#8b949e' }}>
                <input type="checkbox" checked={useZen} onChange={(e) => {
                  setUseZen(e.target.checked);
                  if (e.target.checked) fetch('/api/opencode/start', { method: 'POST' }).then(() => fetch('/api/opencode/status').then(r => r.json()));
                }} style={{ cursor: 'pointer' }} />
                Use OpenCode Zen (free models)
              </label>
              {useZen && (
                <select value={zenModel} onChange={e => setZenModel(e.target.value)} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#c9d1d9', padding: '4px 8px', fontSize: '13px', outline: 'none' }}>
                  <option value="deepseek-v4-flash-free">DeepSeek V4 Flash Free</option>
                  <option value="big-pickle">Big Pickle</option>
                  <option value="mimo-v2.5-free">MiMo V2.5 Free</option>
                  <option value="laguna-s-2.1-free">Laguna S 2.1 Free</option>
                  <option value="ling-3.0-tiny-free">Ling 3.0 Tiny Free</option>
                  <option value="longcat-2.0-free">LongCat 2.0 Free</option>
                  <option value="north-mini-code-free">North Mini Code Free</option>
                  <option value="nemotron-3-ultra-free">Nemotron 3 Ultra Free</option>
                </select>
              )}
            </div>
            <div style={S.chatArea}>
              {chatMessages.length === 0 && <div style={S.empty}>{useZen ? `Chat with Zen: ${zenModel}` : (selectedKey ? `Chat with ${selectedKey.name}` : 'Select a key to start')}</div>}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ ...S.msg, ...(msg.role === 'user' ? S.msgUser : S.msgAssistant) }}>{msg.content}</div>
              ))}
            </div>
            <div style={S.chatInput}>
              <input style={S.input} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat())} placeholder={useZen ? 'Type message (Zen mode)...' : (selectedKey ? 'Type message...' : 'Select a key first')} disabled={streaming || (!useZen && !selectedKey)} />
              <button style={S.btn} onClick={sendChat} disabled={streaming || (!useZen && !selectedKey)}>{streaming ? '...' : 'Send'}</button>
            </div>
          </>
        )}
        {tab === 'keys' && (
          <div style={S.content}>
            <h2 style={{ marginBottom: '16px' }}>Parse Keys from Text</h2>
            <div style={S.field}>
              <label style={S.label}>Paste message with keys and endpoints:</label>
              <textarea style={{ ...S.textarea, height: '120px' }} value={parseInput} onChange={e => setParseInput(e.target.value)} placeholder="sk-xxx&#10;https://api.example.com/v1&#10;..." />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input style={S.input} placeholder="Parse model" value={parseModel} onChange={e => setParseModel(e.target.value)} />
              <input style={S.input} placeholder="Parse baseURL" value={parseBaseURL} onChange={e => setParseBaseURL(e.target.value)} />
              <input style={S.input} placeholder="Parse API key (optional)" value={parseApiKey} onChange={e => setParseApiKey(e.target.value)} />
              <button style={S.btn} onClick={doParse}>Parse</button>
            </div>
            {parseResult && (
              <div style={S.parseResult}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Parsed result:</div>
                <pre style={{ fontSize: '13px', overflow: 'auto', maxHeight: '200px' }}>{JSON.stringify(parseResult.parsed, null, 2)}</pre>
                {parseResult.parsed?.map((k: any, i: number) => (
                  <button key={i} style={{ ...S.btnSecondary, marginTop: '8px' }} onClick={() => addKey({ name: k.provider || `Key ${keys.length + 1}`, key: k.key, baseURL: k.baseURL, provider: k.provider, models: k.models || [] })}>Add: {k.key.slice(0, 20)}... ({k.baseURL})</button>
                ))}
              </div>
            )}
            <h2 style={{ margin: '24px 0 16px' }}>Add Key Manually</h2>
            <ManualKeyForm onAdd={addKey} />
          </div>
        )}
        {tab === 'agents' && <AgentsTab agents={agents} onSave={saveAgents} />}
        {tab === 'providers' && <ProvidersTab providers={providers} onSave={saveProviders} />}
      </div>
    </div>
  );
}

function ManualKeyForm({ onAdd }: { onAdd: (k: Partial<ApiKey>) => void }) {
  const [name, setName] = useState(''); const [key, setKey] = useState(''); const [baseURL, setBaseURL] = useState(''); const [models, setModels] = useState(''); const [customPrompt, setCustomPrompt] = useState('');
  const s = { field: { marginBottom: '12px' }, label: { display: 'block', fontSize: '12px', color: '#8b949e', marginBottom: '4px' }, input: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', padding: '10px', fontSize: '14px', outline: 'none' }, textarea: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', padding: '10px', fontSize: '14px', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }, btn: { background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 } };
  return (
    <div>
      <div style={s.field}><label style={s.label}>Name</label><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="My API Key" /></div>
      <div style={s.field}><label style={s.label}>API Key</label><input style={s.input} value={key} onChange={e => setKey(e.target.value)} placeholder="sk-..." /></div>
      <div style={s.field}><label style={s.label}>Base URL</label><input style={s.input} value={baseURL} onChange={e => setBaseURL(e.target.value)} placeholder="https://api.example.com/v1" /></div>
      <div style={s.field}><label style={s.label}>Models (comma separated)</label><input style={s.input} value={models} onChange={e => setModels(e.target.value)} placeholder="gpt-4o, claude-3-5-sonnet" /></div>
      <div style={s.field}><label style={s.label}>Custom System Prompt (optional)</label><textarea style={{ ...s.textarea, height: '80px' }} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="You are a..." /></div>
      <button style={s.btn} onClick={() => { onAdd({ name: name || `Key ${Date.now()}`, key, baseURL, models: models.split(',').map(m => m.trim()).filter(Boolean), customPrompt: customPrompt || undefined }); setName(''); setKey(''); setBaseURL(''); setModels(''); setCustomPrompt(''); }}>Add Key</button>
    </div>
  );
}

function AgentsTab({ agents, onSave }: { agents: Agent[]; onSave: (a: Agent[]) => void }) {
  const [local, setLocal] = useState(agents);
  const s = { agentCard: { background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', marginBottom: '12px' }, input: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', padding: '8px', fontSize: '14px', outline: 'none', marginBottom: '8px' }, textarea: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', padding: '8px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', minHeight: '80px' }, btn: { background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', marginRight: '8px' }, btnDel: { background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' } };
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '16px' }}>Agents (System Prompts)</h2>
      {local.map((agent, i) => (
        <div key={agent.id} style={s.agentCard}>
          <input style={s.input} value={agent.name} onChange={e => { const n = [...local]; n[i] = { ...n[i], name: e.target.value }; setLocal(n); }} placeholder="Agent name" />
          <textarea style={s.textarea} value={agent.systemPrompt} onChange={e => { const n = [...local]; n[i] = { ...n[i], systemPrompt: e.target.value }; setLocal(n); }} placeholder="System prompt..." />
          <div style={{ marginTop: '8px' }}>
            <button style={s.btn} onClick={() => onSave(local)}>Save</button>
            <button style={s.btnDel} onClick={() => { const n = local.filter((_, idx) => idx !== i); setLocal(n); onSave(n); }}>Delete</button>
          </div>
        </div>
      ))}
      <button style={s.btn} onClick={() => setLocal([...local, { id: `agent-${Date.now()}`, name: 'New Agent', systemPrompt: '' }])}>+ Add Agent</button>
    </div>
  );
}

function ProvidersTab({ providers, onSave }: { providers: Provider[]; onSave: (p: Provider[]) => void }) {
  const [local, setLocal] = useState(providers);
  const s = { card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', marginBottom: '12px' }, input: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', padding: '8px', fontSize: '14px', outline: 'none', marginBottom: '8px' }, btn: { background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', marginRight: '8px' }, btnDel: { background: '#da3633', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }, label: { display: 'block', fontSize: '12px', color: '#8b949e', marginBottom: '4px' } };
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '16px' }}>Custom Providers</h2>
      {local.map((p, i) => (
        <div key={p.id} style={s.card}>
          <label style={s.label}>Name</label><input style={s.input} value={p.name} onChange={e => { const n = [...local]; n[i] = { ...n[i], name: e.target.value }; setLocal(n); }} />
          <label style={s.label}>Base URL</label><input style={s.input} value={p.baseURL} onChange={e => { const n = [...local]; n[i] = { ...n[i], baseURL: e.target.value }; setLocal(n); }} />
          <label style={s.label}>API Key</label><input style={s.input} value={p.apiKey} onChange={e => { const n = [...local]; n[i] = { ...n[i], apiKey: e.target.value }; setLocal(n); }} />
          <label style={s.label}>Models (comma separated)</label><input style={s.input} value={(p.models || []).join(', ')} onChange={e => { const n = [...local]; n[i] = { ...n[i], models: e.target.value.split(',').map(m => m.trim()).filter(Boolean) }; setLocal(n); }} />
          <div style={{ marginTop: '8px' }}>
            <button style={s.btn} onClick={() => onSave(local)}>Save</button>
            <button style={s.btnDel} onClick={() => { const n = local.filter((_, idx) => idx !== i); setLocal(n); onSave(n); }}>Delete</button>
          </div>
        </div>
      ))}
      <button style={s.btn} onClick={() => setLocal([...local, { id: `prov-${Date.now()}`, name: 'New Provider', baseURL: '', apiKey: '', models: [] }])}>+ Add Provider</button>
    </div>
  );
}