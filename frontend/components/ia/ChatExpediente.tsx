"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NavegacionAreasCaso from "../casos/NavegacionAreasCaso";

type Citation = {
  citation_id: string;
  document_name: string;
  document_url?: string | null;
  location_label: string;
  score: number;
  source_type: string;
  text: string;
};
type Message = {
  id: number;
  role: "usuario" | "asistente";
  content: string;
  citations?: Citation[];
  metadata?: { suggested_questions?: string[]; limitations?: string[]; evidence?: { status?: string } };
  tool_id?: string | null;
  created_at?: string;
};
type Conversation = {
  id: number;
  title: string;
  messages_count?: number;
  last_message?: string | null;
  updated_at?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const tools = [
  { id: "", label: "Responder pregunta" },
  { id: "resumen_expediente", label: "Resumir expediente" },
  { id: "cronologia", label: "Ordenar fechas" },
  { id: "teoria_del_caso", label: "Teoría del caso" },
];
const examples = [
  "¿Cuál es el estado actual del expediente?",
  "¿Qué hechos están respaldados por los documentos?",
  "¿Qué fechas o vencimientos requieren atención?",
];

async function apiRequest(path: string, options?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, { credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudo completar la operación.");
  return body;
}

export default function ChatExpediente({ caseId, caseName }: { caseId: string; caseName: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [toolId, setToolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void apiRequest(`/api/ia/cases/${caseId}/chats`).then(async (body) => {
      const next = body.conversations || [];
      if (!active) return;
      setConversations(next);
      if (next[0]) {
        const detail = await apiRequest(`/api/ia/cases/${caseId}/chats/${next[0].id}`);
        if (active) { setConversationId(next[0].id); setMessages(detail.conversation.messages || []); }
      }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo abrir el chat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [caseId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function openConversation(id: number) {
    setConversationId(id); setError("");
    try {
      const body = await apiRequest(`/api/ia/cases/${caseId}/chats/${id}`);
      setMessages(body.conversation.messages || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir la conversación."); }
  }

  function newConversation() { setConversationId(null); setMessages([]); setContent(""); setToolId(""); setError(""); }

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const body = await apiRequest(`/api/ia/cases/${caseId}/chats`, { method: "POST", body: JSON.stringify({}) });
    const created = body.conversation as Conversation;
    setConversationId(created.id);
    setConversations((current) => [created, ...current]);
    return created.id;
  }

  async function sendMessage(value = content) {
    const clean = value.trim();
    if (!clean || sending) return;
    setSending(true); setError(""); setContent("");
    const temporaryId = -Date.now();
    setMessages((current) => [...current, { id: temporaryId, role: "usuario", content: clean }]);
    try {
      const id = await ensureConversation();
      const body = await apiRequest(`/api/ia/cases/${caseId}/chats/${id}/messages`, {
        method: "POST", body: JSON.stringify({ content: clean, tool_id: toolId || null }),
      });
      setMessages((current) => [...current.filter((item) => item.id !== temporaryId), body.user_message, body.assistant_message]);
      setConversations((current) => current.map((item) => item.id === id
        ? { ...item, title: body.title, messages_count: (item.messages_count || 0) + 2, last_message: body.assistant_message.content }
        : item).sort((left, right) => left.id === id ? -1 : right.id === id ? 1 : 0));
      setToolId("");
    } catch (cause) {
      setMessages((current) => current.filter((item) => item.id !== temporaryId));
      setContent(clean);
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.");
    } finally { setSending(false); }
  }

  return (
    <section className="case-chat flex h-full min-h-0 flex-col bg-[#F4F7F5] text-[#0F2044]">
      <header className="chat-header border-b-2 border-[#88A9C8] bg-white px-6 py-4">
        <NavegacionAreasCaso activeArea="Chat" caseSlug={caseId} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#546FC0]">Copiloto del expediente</p>
            <h1 className="mt-1 text-2xl font-semibold">{caseName}</h1></div>
          <p className="max-w-xl text-sm text-[#0F2044]/65">Responde con información del expediente y muestra las fuentes utilizadas. Las conclusiones requieren revisión profesional.</p>
        </div>
      </header>

      <div className="chat-layout grid min-h-0 flex-1 @min-[1024px]:grid-cols-[285px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-r border-[#88A9C8]/55 bg-white p-4">
          <button type="button" onClick={newConversation} className="w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1C3768]">+ Nueva conversación</button>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[.12em] text-[#0F2044]/45">Historial</p>
          <div className="space-y-2">
            {loading ? <p className="text-sm text-[#0F2044]/55">Cargando…</p> : conversations.map((item) => (
              <button type="button" key={item.id} onClick={() => void openConversation(item.id)}
                className={`w-full rounded-xl border p-3 text-left ${conversationId === item.id ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 hover:bg-[#F4F7F5]"}`}>
                <strong className="line-clamp-2 block text-sm">{item.title}</strong>
                <span className="mt-1 block text-xs text-[#0F2044]/50">{item.messages_count || 0} mensajes</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {!messages.length && !loading ? (
              <div className="mx-auto mt-8 max-w-3xl rounded-[23px] border-2 border-[#88A9C8] bg-white p-7">
                <h2 className="text-xl font-semibold">Consultá este expediente</h2>
                <p className="mt-2 text-sm text-[#0F2044]/65">Podés continuar la conversación, pedir una herramienta o abrir las fuentes de cada respuesta.</p>
                <div className="mt-5 grid gap-3 @min-[640px]:grid-cols-3">{examples.map((example) => (
                  <button type="button" key={example} onClick={() => void sendMessage(example)} className="rounded-xl border border-[#88A9C8] bg-[#F4F7F5] p-3 text-left text-sm font-medium hover:border-[#546FC0]">{example}</button>
                ))}</div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-5">{messages.map((message) => (
                <ChatMessage key={message.id} message={message} onSuggestion={(suggestion) => void sendMessage(suggestion)} />
              ))}{sending && <div className="w-fit rounded-2xl border border-[#88A9C8]/55 bg-white px-4 py-3 text-sm text-[#0F2044]/60">Revisando el expediente…</div>}<div ref={endRef} /></div>
            )}
          </div>

          <div className="border-t border-[#88A9C8]/55 bg-white px-4 py-4 sm:px-8">
            <div className="mx-auto max-w-4xl">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="mb-3 flex flex-wrap gap-2">{tools.map((tool) => (
                <button type="button" key={tool.id} onClick={() => setToolId(tool.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toolId === tool.id ? "border-[#0F2044] bg-[#0F2044] text-white" : "border-[#88A9C8] bg-[#F4F7F5]"}`}>{tool.label}</button>
              ))}</div>
              <div className="flex items-end gap-3 rounded-2xl border-2 border-[#88A9C8] bg-[#F4F7F5] p-2 focus-within:border-[#546FC0]">
                <textarea rows={2} maxLength={4000} value={content} onChange={(event) => setContent(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
                  placeholder="Preguntá sobre hechos, documentos, personas, fechas o estrategia…" className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
                <button type="button" disabled={!content.trim() || sending} onClick={() => void sendMessage()} className="rounded-xl bg-[#0F2044] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Enviar</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function ChatMessage({ message, onSuggestion }: { message: Message; onSuggestion: (value: string) => void }) {
  const assistant = message.role === "asistente";
  return <article className={assistant ? "mr-auto max-w-[92%]" : "ml-auto max-w-[82%]"}>
    <div className={`rounded-2xl px-4 py-3 ${assistant ? "border border-[#88A9C8]/60 bg-white" : "bg-[#0F2044] text-white"}`}>
      {assistant && <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#546FC0]">
        {message.tool_id && <span>Herramienta aplicada</span>}
        {message.metadata?.evidence?.status && message.metadata.evidence.status !== "no_requerido" && <span>Respaldo: {message.metadata.evidence.status}</span>}
      </div>}
      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
    </div>
    {assistant && Boolean(message.citations?.length) && <details className="mt-2 rounded-xl border border-[#88A9C8]/50 bg-white px-3 py-2">
      <summary className="cursor-pointer text-xs font-bold text-[#546FC0]">Fuentes consultadas ({message.citations?.length})</summary>
      <div className="mt-2 space-y-2">{message.citations?.map((citation, index) => (
        <div key={citation.citation_id} className="rounded-lg bg-[#F4F7F5] p-3 text-xs">
          <div className="flex items-start justify-between gap-3"><strong>[{index + 1}] {citation.document_name}</strong><span>{citation.location_label}</span></div>
          <p className="mt-1 line-clamp-3 text-[#0F2044]/65">{citation.text}</p>
          {citation.document_url && <Link href={citation.document_url} className="mt-2 inline-block font-semibold text-[#546FC0]">Abrir fuente →</Link>}
        </div>
      ))}</div>
    </details>}
    {assistant && Boolean(message.metadata?.suggested_questions?.length) && <div className="mt-2 flex flex-wrap gap-2">{message.metadata?.suggested_questions?.map((question) => (
      <button type="button" key={question} onClick={() => onSuggestion(question)} className="rounded-full border border-[#88A9C8] bg-white px-3 py-1.5 text-xs font-medium hover:border-[#546FC0]">{question}</button>
    ))}</div>}
  </article>;
}
