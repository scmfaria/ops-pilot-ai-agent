import { useEffect, useRef, useState } from "react";
import "./App.css";
import { getApiUrl, saveApiUrl, validateApiUrl } from "./api-config";
import { sendChat, type ChatError } from "./chat-api";
import type { ChatResponse, TraceEvent } from "./chat-contract";
import { applyTheme, getInitialTheme, saveTheme, type ThemeMode } from "./theme";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse & { status: number };
};

function TracePanel({ trace, onClose }: { trace: TraceEvent[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="trace-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="dialog-header">
        <div><span className="eyebrow">Execução do agente</span><h2>Raciocínio</h2></div>
        <button type="button" className="icon-button" aria-label="Fechar raciocínio" onClick={onClose}>×</button>
      </div>
      {trace.length === 0 ? (
        <div className="empty-state"><strong>Sem eventos de raciocínio</strong><p>Esta resposta não retornou um trace tipado.</p></div>
      ) : (
        <ol className="trace-list">
          {[...trace].sort((a, b) => a.step - b.step).map((event, index) => (
            <li key={`${event.step}-${index}`} className={`trace-event trace-${event.type}`}>
              <span className="trace-step">{event.step}</span>
              <div>
                <strong>{event.type}</strong>
                {event.type === "action" ? <><code>{event.tool}</code><pre>{JSON.stringify(event.args, null, 2)}</pre></> :
                  event.type === "plan" ? <ul>{event.plan.map((item, i) => <li key={i}>{item}</li>)}</ul> :
                  <p>{"content" in event ? event.content : ""}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </dialog>
  );
}

function ApprovalCard({ response, onDecision }: { response: ChatResponse & { status: number }; onDecision: (decision: "approved" | "denied") => void }) {
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);
  const decide = (value: "approved" | "denied") => { setDecision(value); onDecision(value); };
  if (decision) {
    return <div className="decision-result" role="status">{decision === "approved" ? "Aprovação registrada" : "Negação registrada"}</div>;
  }
  return (
    <section className="approval-card" aria-label="Ação aguardando aprovação">
      <div><span className="status-pill">Pendente</span><h3>{response.proposal?.title ?? "Ação recomendada"}</h3><p>{response.proposal?.description ?? response.answer}</p></div>
      <div className="approval-actions">
        <button type="button" className="button-danger" onClick={() => decide("denied")}>Negar</button>
        <button type="button" className="button-primary" onClick={() => decide("approved")}>Aprovar</button>
      </div>
    </section>
  );
}

function SettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (url: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(getApiUrl());
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  const save = () => {
    const validation = validateApiUrl(url);
    if (validation) { setError(validation); return; }
    saveApiUrl(url);
    saveTheme(theme);
    applyTheme(theme);
    onSaved(url);
  };
  return (
    <dialog ref={dialogRef} className="settings-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="dialog-header">
        <div><span className="eyebrow">Integração</span><h2>Configurações</h2></div>
        <button type="button" className="icon-button" aria-label="Fechar configurações" onClick={onClose}>×</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); save(); }}>
        <label htmlFor="api-url">URL da API</label>
        <input id="api-url" value={url} onChange={(event) => { setUrl(event.target.value); setError(null); }} aria-describedby={error ? "api-url-error" : undefined} />
        {error && <p id="api-url-error" className="field-error" role="alert">{error}</p>}
        <fieldset><legend>Tema</legend>
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <label key={mode} className="radio-label"><input type="radio" name="theme" checked={theme === mode} onChange={() => setTheme(mode)} />{mode === "system" ? "Sistema" : mode === "dark" ? "Escuro" : "Claro"}</label>
          ))}
        </fieldset>
        <div className="dialog-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Salvar</button></div>
      </form>
    </dialog>
  );
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(getApiUrl);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [strategy, setStrategy] = useState("react");
  const [reflect, setReflect] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState<TraceEvent[] | null>(null);
  const [theme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const submit = async (messageText = draft) => {
    const text = messageText.trim();
    if (!text || loading) return;
    setDraft(text);
    setError(null);
    setLoading(true);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    try {
      const response = await sendChat(apiUrl, { message: text, strategy, reflect, conversationId });
      setConversationId(response.conversationId);
      setDraft("");
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: response.answer, response }]);
    } catch (caught) {
      setError(caught as ChatError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="war-room">
      <header className="topbar">
        <div><span className="eyebrow">OpsPilot</span><h1>War Room</h1></div>
        <div className="header-actions">
          <span className="api-status"><span aria-hidden="true" />API configurada</span>
          <button type="button" className="icon-button" aria-label="Abrir configurações" onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </header>

      <section className="chat-shell" aria-label="Conversa da War Room">
        <div className="chat-context">
          <label htmlFor="strategy">Estratégia</label>
          <select id="strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)}><option value="react">ReAct</option><option value="plan-and-execute">Plan-and-Execute</option></select>
          <label className="checkbox-label"><input type="checkbox" checked={reflect} onChange={(event) => setReflect(event.target.checked)} />Ativar reflexão</label>
        </div>

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state"><span className="empty-mark" aria-hidden="true">OP</span><h2>Nenhuma conversa ativa</h2><p>Envie uma pergunta para iniciar a análise de incidentes.</p><button type="button" className="button-secondary" onClick={() => setDraft("Liste os alertas disparados")}>Usar exemplo</button></div>
          ) : messages.map((message) => (
            <article key={message.id} className={`message message-${message.role}`}>
              <div className="message-meta"><strong>{message.role === "user" ? "Operador" : "OpsPilot"}</strong>{message.response && <span>{message.response.status === 202 ? "Aguardando decisão" : `${message.response.metrics.llmCalls} LLM · ${message.response.metrics.latencyMs} ms`}</span>}</div>
              <p>{message.content}</p>
              {message.response?.trace && message.response.trace.length > 0 && <button type="button" className="trace-button" onClick={() => setTraceOpen(message.response!.trace)}>Ver raciocínio</button>}
              {message.response && (message.response.status === 202 || message.response.pendingApproval) && <ApprovalCard response={message.response} onDecision={() => undefined} />}
            </article>
          ))}
        </div>

        {error && <div className="error-banner" role="alert"><div><strong>Não foi possível concluir a solicitação</strong><p>{error.message}</p></div><button type="button" className="button-secondary" onClick={() => void submit(draft)}>Tentar novamente</button></div>}

        <form className="composer" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label htmlFor="chat-message">Mensagem</label>
          <div className="composer-row"><textarea id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Pergunte sobre alertas, incidentes ou runbooks…" rows={2} /><button type="submit" className="button-primary send-button" disabled={loading || !draft.trim()}>{loading ? "Analisando…" : "Enviar"}</button></div>
          {loading && <span className="sr-only" role="status">O agente está processando a mensagem.</span>}
        </form>
      </section>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSaved={(url) => { setApiUrl(url); setSettingsOpen(false); }} />}
      {traceOpen && <TracePanel trace={traceOpen} onClose={() => setTraceOpen(null)} />}
    </main>
  );
}
