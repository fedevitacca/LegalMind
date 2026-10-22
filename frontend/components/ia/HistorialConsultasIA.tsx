"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavegacionAreasCaso from "../casos/NavegacionAreasCaso";
import {
  downloadPlainTextReport,
  printPlainTextReport,
} from "../../lib/legalReport";

type Citation = {
  citation_id?: string;
  document_name: string;
  chunk_index: number;
  page?: number | null;
  location_label?: string;
  document_url?: string | null;
  text: string;
  score: number;
};
type ResultSection = { titulo: string; contenido: string };
type QueryItem = {
  id: number;
  user_id?: string;
  tool_id: string;
  title: string;
  query?: string;
  result: {
    resumen?: string;
    conclusion?: string;
    puntos_clave?: string[];
    desarrollo?: ResultSection[];
    acciones_sugeridas?: string[];
    limitaciones?: string[];
  };
  citations?: Citation[];
  created_at: string;
};

const apiUrl =
  process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
const labels: Record<string, string> = {
  resumen_expediente: "Resumen",
  comparar_documentos: "Comparación documental",
  comparar_jurisprudencia: "Jurisprudencia",
  cronologia: "Cronología",
  consulta_rag: "Consulta documental",
  teoria_del_caso: "Teoría del caso",
  preparar_audiencia: "Preparación de audiencia",
};

export default function HistorialConsultasIA({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<QueryItem[]>([]);
  const [selected, setSelected] = useState<QueryItem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/api/ia/cases/${caseId}/queries`, {
      credentials: "include",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "No se pudo cargar el historial.");
        return body;
      })
      .then((body) => {
        setItems(body.queries || []);
        setSelected(body.queries?.[0]);
      })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  async function remove(id: number) {
    if (!window.confirm("¿Eliminar esta consulta guardada?")) return;
    const response = await fetch(
      `${apiUrl}/api/ia/cases/${caseId}/queries/${id}`,
      { method: "DELETE", credentials: "include" },
    );
    if (!response.ok) {
      setError("No se pudo eliminar el registro.");
      return;
    }
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setSelected((current) => (current?.id === id ? next[0] : current));
  }

  function download(item: QueryItem) {
    downloadPlainTextReport(item.title, formatStoredReport(item));
    setNotice("Registro descargado.");
  }

  function print(item: QueryItem) {
    try {
      printPlainTextReport(item.title, formatStoredReport(item));
      setNotice("Vista de impresión abierta.");
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : "No fue posible abrir la impresión.",
      );
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-[#F4F7F5] px-4 py-5 text-[#0F2044] sm:px-8">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <NavegacionAreasCaso activeArea="Consultas" caseSlug={caseId} />
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
          <h1 className="text-3xl font-semibold">Consultas guardadas</h1>
          <Link
            href={`/analisis?case_id=${caseId}`}
            className="rounded-xl bg-[#0F2044] px-5 py-3 text-sm font-semibold text-white"
          >
            Nuevo análisis
          </Link>
        </header>
        {error && (
          <p className="border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-8 text-center text-sm text-[#0F2044]/60">
            Cargando registros…
          </p>
        ) : !items.length ? (
          <div className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-10">
            <h2 className="text-lg font-semibold">No hay análisis guardados</h2>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-[23px] border-2 border-[#88A9C8] bg-white">
              {items.map((item) => (
                <button
                  onClick={() => {
                    setSelected(item);
                    setNotice("");
                  }}
                  key={item.id}
                  className={`block w-full border-b border-[#88A9C8]/35 px-4 py-4 text-left last:border-b-0 ${selected?.id === item.id ? "border-l-[3px] border-l-[#546FC0] bg-[#EEF3F8] pl-[13px]" : "hover:bg-[#F4F7F5]"}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#546FC0]">
                    {labels[item.tool_id] || item.tool_id}
                  </span>
                  <strong className="mt-1 block line-clamp-2 text-sm">
                    {item.title}
                  </strong>
                  <span className="mt-2 block text-xs text-[#747d7b]">
                    {new Date(item.created_at).toLocaleString("es-AR")}
                  </span>
                </button>
              ))}
            </aside>
            {selected && (
              <StoredReport
                item={selected}
                notice={notice}
                onDelete={() => void remove(selected.id)}
                onDownload={() => download(selected)}
                onPrint={() => print(selected)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function StoredReport({
  item,
  notice,
  onDelete,
  onDownload,
  onPrint,
}: {
  item: QueryItem;
  notice: string;
  onDelete: () => void;
  onDownload: () => void;
  onPrint: () => void;
}) {
  return (
    <article className="space-y-5 rounded-[23px] border-2 border-[#88A9C8] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e1e3e0] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[.08em] text-[#546FC0]">
            {labels[item.tool_id] || item.tool_id}
          </span>
          <h2 className="mt-1 text-2xl font-semibold">{item.title}</h2>
          <p className="mt-2 text-xs text-[#0F2044]/50">
            {new Date(item.created_at).toLocaleString("es-AR")}
          </p>
          {item.query && (
            <p className="mt-3 text-sm text-[#596473]">
              <strong>Consulta:</strong> {item.query}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onDownload}
            className="rounded-lg border border-[#88A9C8] px-3 py-2 text-xs font-semibold"
          >
            Descargar .txt
          </button>
          <button
            onClick={onPrint}
            className="rounded-lg bg-[#0F2044] px-3 py-2 text-xs font-semibold text-white"
          >
            Imprimir / PDF
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
      {notice && (
        <p aria-live="polite" className="text-xs text-[#3f6f6b]">
          {notice}
        </p>
      )}
      <div className="rounded-xl bg-[#F4F7F5] p-4">
        <p className="whitespace-pre-line leading-7 text-[#0F2044]/80">
          {item.result.conclusion ||
            item.result.resumen ||
            "Sin respuesta registrada."}
        </p>
      </div>
      {item.result.desarrollo?.length ? (
        <section>
          <h3 className="text-sm font-semibold text-[#283446]">
            Análisis desarrollado
          </h3>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {item.result.desarrollo.map((section, index) => (
              <div
                key={`${section.titulo}-${index}`}
                className="rounded-xl border border-[#88A9C8]/45 bg-white p-4"
              >
                <h4 className="text-sm font-semibold text-[#34413f]">
                  {section.titulo}
                </h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#596473]">
                  {section.contenido}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {item.result.puntos_clave?.length ? (
        <section className="border-t border-[#e1e3e0] pt-4">
          <h3 className="text-sm font-semibold text-[#283446]">Puntos clave</h3>
          <ul className="mt-3 space-y-2">
            {item.result.puntos_clave.map((point, index) => (
              <li
                key={index}
                className="flex gap-2 text-sm leading-6 text-[#596473]"
              >
                <strong className="text-[#546FC0]">{index + 1}.</strong>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {item.result.acciones_sugeridas?.length ||
      item.result.limitaciones?.length ? (
        <div className="grid gap-3 border-t border-[#e1e3e0] pt-4 xl:grid-cols-2">
          {item.result.acciones_sugeridas?.length ? (
            <StoredList
              title="Controles sugeridos"
              items={item.result.acciones_sugeridas}
            />
          ) : null}
          {item.result.limitaciones?.length ? (
            <StoredList
              title="Alcance y datos pendientes"
              items={item.result.limitaciones}
              muted
            />
          ) : null}
        </div>
      ) : null}
      {item.citations?.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-[#546FC0]">
            {item.tool_id === "consulta_rag"
              ? "Pasajes considerados"
              : "Ver fuentes"}{" "}
            ({item.citations.length})
          </summary>
          <div className="mt-3 divide-y divide-[#88A9C8]/35 rounded-xl border border-[#88A9C8]/45">
            {item.citations.map((citation, index) => (
              <details
                key={citation.citation_id || index}
                className="px-4 py-3"
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {item.tool_id === "consulta_rag"
                    ? `Pasaje ${index + 1}`
                    : `Fuente ${index + 1}`}{" "}
                  · {citation.document_name}
                  {citation.location_label ? (
                    <span className="ml-2 text-xs font-normal text-[#74807e]">
                      · {citation.location_label}
                    </span>
                  ) : null}
                </summary>
                <blockquote className="mt-3 border-l-2 border-[#88A9C8] pl-3 text-sm leading-6 text-[#0F2044]/65">
                  {citation.text}
                </blockquote>
                {citation.document_url && (
                  <a
                    className="mt-2 inline-block text-xs font-semibold text-[#546FC0]"
                    href={citation.document_url}
                  >
                    Abrir documento →
                  </a>
                )}
              </details>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function StoredList({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <section
      className={
        muted
          ? "rounded-xl border border-[#88A9C8]/45 bg-white p-4"
          : "rounded-xl border border-[#88A9C8]/45 bg-[#F4F7F5] p-4"
      }
    >
      <h3 className="text-sm font-semibold text-[#34413f]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex gap-2 text-sm leading-6 text-[#596473]"
          >
            <span className="text-[#546FC0]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatStoredReport(item: QueryItem) {
  const lines = [
    item.title,
    "",
    `Tipo: ${labels[item.tool_id] || item.tool_id}`,
    `Fecha: ${new Date(item.created_at).toLocaleString("es-AR")}`,
    item.query ? `Consulta: ${item.query}` : "",
    "",
    item.result.conclusion ||
      item.result.resumen ||
      "Sin respuesta registrada.",
    "",
  ];
  if (item.result.desarrollo?.length) {
    lines.push("ANÁLISIS DESARROLLADO");
    item.result.desarrollo.forEach((section) =>
      lines.push(section.titulo, section.contenido, ""),
    );
  }
  if (item.result.puntos_clave?.length)
    lines.push(
      ...item.result.puntos_clave.map(
        (point, index) => `${index + 1}. ${point}`,
      ),
      "",
    );
  if (item.result.acciones_sugeridas?.length)
    lines.push(
      "CONTROLES SUGERIDOS",
      ...item.result.acciones_sugeridas.map((entry) => `- ${entry}`),
      "",
    );
  if (item.result.limitaciones?.length)
    lines.push(
      "ALCANCE Y DATOS PENDIENTES",
      ...item.result.limitaciones.map((entry) => `- ${entry}`),
      "",
    );
  if (item.citations?.length) {
    lines.push("FUENTES");
    item.citations.forEach((citation, index) =>
      lines.push(
        `${index + 1}. ${citation.document_name}${citation.location_label ? ` · ${citation.location_label}` : ""}`,
        citation.text,
        "",
      ),
    );
  }
  lines.push("Documento de trabajo sujeto a revisión profesional.");
  return lines
    .filter((line, index) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .trim();
}
