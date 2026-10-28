"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type CaseWorkSummary,
  type Contact,
  type Hearing,
  type WorkTask,
  formatMoney,
  formatWorkDate,
  workApi,
} from "../../lib/trabajoApi";

type Tab =
  | "trabajo"
  | "audiencia"
  | "personas"
  | "comunicaciones"
  | "dinero"
  | "escritos"
  | "portal"
  | "revision";
type CaseDocument = {
  id: number;
  nombre?: string;
  nombre_archivo?: string;
  visible_portal?: boolean;
  fecha?: string;
};
const tabs: { id: Tab; label: string }[] = [
  { id: "trabajo", label: "Trabajo" },
  { id: "audiencia", label: "Audiencias" },
  { id: "personas", label: "Personas" },
  { id: "comunicaciones", label: "Comunicaciones" },
  { id: "dinero", label: "Honorarios y tiempo" },
  { id: "escritos", label: "Escritos" },
  { id: "portal", label: "Portal cliente" },
  { id: "revision", label: "Revision" },
];

export default function CentroGestionCaso({
  caseId,
  caseName,
}: {
  caseId: string;
  caseName: string;
}) {
  const [tab, setTab] = useState<Tab>("trabajo");
  const [data, setData] = useState<CaseWorkSummary | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const [summary, docs] = await Promise.all([
        workApi<CaseWorkSummary>(`/trabajo/casos/${caseId}/resumen`),
        workApi<{ documentos: CaseDocument[] }>(`/casos/${caseId}/documentos`),
      ]);
      setData(summary);
      setDocuments(docs.documentos || []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo cargar la gestion.",
      );
    }
  }, [caseId]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = useCallback(
    async (action: () => Promise<unknown>, message: string) => {
      try {
        setError("");
        await action();
        setNotice(message);
        await load();
        setTimeout(() => setNotice(""), 3000);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "No se pudo guardar.",
        );
      }
    },
    [load],
  );
  return (
    <main className="min-w-0 overflow-y-auto bg-[#F4F7F5] px-5 py-6 text-[#0F2044]">
      <div className="mx-auto max-w-[1450px]">
        <Link
          href={`/casos/${caseId}`}
          className="text-sm font-semibold text-[#546FC0]"
        >
          ← Volver al expediente
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-5">
          <h1 className="text-3xl font-semibold">{caseName}</h1>
          {data && (
            <div className="flex gap-2 text-xs font-bold">
              <Badge>
                {
                  data.tasks.filter(
                    (item) =>
                      !["completada", "cancelada"].includes(item.estado),
                  ).length
                }{" "}
                tareas
              </Badge>
              <Badge>{data.review_snapshot.tareas_vencidas} vencidas</Badge>
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto rounded-[18px] border-2 border-[#88A9C8] bg-white p-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? "bg-[#0F2044] text-white" : "text-[#0F2044] hover:bg-[#EEF3F8]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="ok">{notice}</Alert>}
        {!data ? (
          <p className="mt-8">Cargando gestion…</p>
        ) : (
          <div className="mt-5">
            {tab === "trabajo" && (
              <WorkTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "audiencia" && (
              <HearingTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "personas" && (
              <PeopleTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "comunicaciones" && (
              <CommunicationsTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "dinero" && (
              <MoneyTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "escritos" && (
              <WritingTab data={data} caseId={caseId} run={run} />
            )}
            {tab === "portal" && (
              <PortalTab
                data={data}
                documents={documents}
                caseId={caseId}
                run={run}
              />
            )}
            {tab === "revision" && (
              <ReviewTab data={data} caseId={caseId} run={run} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function WorkTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media",
    responsable_user_id: "",
    fecha_limite: "",
  });
  const [template, setTemplate] = useState("");
  const [custom, setCustom] = useState({
    nombre: "",
    etapa: "general",
    items: "",
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Panel title="Nueva tarea">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                workApi("/trabajo/tareas", {
                  method: "POST",
                  body: JSON.stringify({
                    ...form,
                    causa_id: Number(caseId),
                    fecha_limite: form.fecha_limite || null,
                  }),
                }),
              "Tarea creada.",
            );
            setForm({ ...form, titulo: "", descripcion: "" });
          }}
        >
          <Input
            label="Titulo"
            required
            value={form.titulo}
            onChange={(value) => setForm({ ...form, titulo: value })}
          />
          <Input
            label="Descripcion"
            value={form.descripcion}
            onChange={(value) => setForm({ ...form, descripcion: value })}
          />
          <Select
            label="Responsable"
            value={form.responsable_user_id}
            onChange={(value) =>
              setForm({ ...form, responsable_user_id: value })
            }
            options={[
              { value: "", label: "Sin asignar" },
              ...data.members.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Prioridad"
              value={form.prioridad}
              onChange={(value) => setForm({ ...form, prioridad: value })}
              options={priorityOptions}
            />
            <Input
              label="Limite"
              type="datetime-local"
              value={form.fecha_limite}
              onChange={(value) => setForm({ ...form, fecha_limite: value })}
            />
          </div>
          <Submit>Crear tarea</Submit>
        </form>
        <div className="my-5 border-t" />
        <h3 className="mb-3 font-semibold">Aplicar checklist</h3>
        <Select
          label="Plantilla"
          value={template}
          onChange={setTemplate}
          options={[
            { value: "", label: "Seleccionar" },
            ...data.checklist_templates.map((item) => ({
              value: String(item.id),
              label: item.nombre,
            })),
          ]}
        />
        <button
          disabled={!template}
          onClick={() =>
            void run(
              () =>
                workApi(`/trabajo/casos/${caseId}/checklists/aplicar`, {
                  method: "POST",
                  body: JSON.stringify({ plantilla_id: template }),
                }),
              "Checklist aplicado.",
            )
          }
          className="mt-3 w-full rounded-xl border border-[#546FC0] px-4 py-3 text-sm font-semibold text-[#546FC0] disabled:opacity-40"
        >
          Aplicar al expediente
        </button>
        <details className="mt-4 border-t pt-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Crear plantilla propia
          </summary>
          <div className="mt-3 space-y-2">
            <Input
              label="Nombre"
              value={custom.nombre}
              onChange={(v) => setCustom({ ...custom, nombre: v })}
            />
            <Input
              label="Etapa"
              value={custom.etapa}
              onChange={(v) => setCustom({ ...custom, etapa: v })}
            />
            <Text
              label="Un item por linea"
              value={custom.items}
              onChange={(v) => setCustom({ ...custom, items: v })}
            />
            <button
              onClick={() =>
                void run(
                  () =>
                    workApi("/trabajo/checklists", {
                      method: "POST",
                      body: JSON.stringify({
                        nombre: custom.nombre,
                        etapa: custom.etapa,
                        items: custom.items
                          .split("\n")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      }),
                    }),
                  "Plantilla creada.",
                )
              }
              type="button"
              className="w-full rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Guardar plantilla
            </button>
          </div>
        </details>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {data.tasks.map((task) => (
          <TaskCard key={task.id} task={task} run={run} />
        ))}
        {!data.tasks.length && <Empty text="Todavia no hay tareas." />}
      </div>
    </div>
  );
}

function TaskCard({ task, run }: { task: WorkTask; run: Runner }) {
  const completed = task.items?.filter((i) => i.completado).length || 0;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<
    {
      id: number;
      contenido: string;
      autor_nombre?: string;
      created_at: string;
    }[]
  >([]);
  const [open, setOpen] = useState(false);
  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next) {
      const body = await workApi<{ comments: typeof comments }>(
        `/trabajo/tareas/${task.id}/comentarios`,
      );
      setComments(body.comments);
    }
  }
  return (
    <Panel title={task.titulo} action={<Priority value={task.prioridad} />}>
      <p className="text-sm text-[#0F2044]/65">
        {task.descripcion || "Sin descripcion"}
      </p>
      <p className="mt-2 text-xs font-semibold">
        {task.responsable_nombre || "Sin asignar"} ·{" "}
        {formatWorkDate(task.fecha_limite)}
      </p>
      {!!task.items?.length && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold">
            Checklist {completed}/{task.items.length}
          </p>
          {task.items.map((item) => (
            <label key={item.id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.completado}
                onChange={() =>
                  void run(
                    () =>
                      workApi(`/trabajo/tareas/items/${item.id}`, {
                        method: "PUT",
                        body: JSON.stringify({ completado: !item.completado }),
                      }),
                    "Checklist actualizado.",
                  )
                }
              />
              <span
                className={item.completado ? "line-through opacity-50" : ""}
              >
                {item.texto}
              </span>
            </label>
          ))}
        </div>
      )}
      <select
        value={task.estado}
        onChange={(e) =>
          void run(
            () =>
              workApi(`/trabajo/tareas/${task.id}`, {
                method: "PUT",
                body: JSON.stringify({ estado: e.target.value }),
              }),
            "Estado actualizado.",
          )
        }
        className="input mt-4"
      >
        <option value="pendiente">Pendiente</option>
        <option value="en_curso">En curso</option>
        <option value="bloqueada">Bloqueada</option>
        <option value="completada">Completada</option>
        <option value="cancelada">Cancelada</option>
      </select>
      <div className="mt-3 flex gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(task.visible_portal)}
            onChange={(e) =>
              void run(
                () =>
                  workApi(`/trabajo/tareas/${task.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ visible_portal: e.target.checked }),
                  }),
                "Visibilidad actualizada.",
              )
            }
          />{" "}
          Visible al cliente
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(task.requiere_confirmacion)}
            onChange={(e) =>
              void run(
                () =>
                  workApi(`/trabajo/tareas/${task.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      requiere_confirmacion: e.target.checked,
                    }),
                  }),
                "Confirmacion actualizada.",
              )
            }
          />{" "}
          Requiere confirmacion
        </label>
      </div>
      <button
        onClick={() => void toggleComments()}
        className="mt-3 text-xs font-bold text-[#546FC0]"
      >
        {task.comentarios_count || 0} comentarios
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl bg-[#F4F7F5] p-3">
          {comments.map((item) => (
            <p key={item.id} className="text-xs">
              <strong>{item.autor_nombre || "Usuario"}:</strong>{" "}
              {item.contenido}
            </p>
          ))}
          <div className="flex gap-2">
            <input
              className="input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario interno"
            />
            <button
              onClick={() =>
                void run(async () => {
                  await workApi(`/trabajo/tareas/${task.id}/comentarios`, {
                    method: "POST",
                    body: JSON.stringify({ contenido: comment }),
                  });
                  setComment("");
                }, "Comentario agregado.")
              }
              className="rounded-lg bg-[#0F2044] px-3 text-xs text-white"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function HearingTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const empty = {
    titulo: "",
    fecha: "",
    lugar: "",
    participantes: "",
    objetivo: "",
    argumentos: "",
    preguntas: "",
    objeciones: "",
    notas: "",
    resultado: "",
    proximas_acciones: "",
    estado: "preparacion",
  };
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<Hearing | null>(null);
  const active = selected || form;
  const set = (key: string, value: string) =>
    selected
      ? setSelected({ ...selected, [key]: value })
      : setForm({ ...form, [key]: value });
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Audiencias">
        <div className="space-y-2">
          <button
            onClick={() => {
              setSelected(null);
              setForm(empty);
            }}
            className="w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white"
          >
            Nueva audiencia
          </button>
          {data.audiences.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full rounded-xl border-2 p-3 text-left ${selected?.id === item.id ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 bg-white"}`}
            >
              <strong className="block text-sm">{item.titulo}</strong>
              <span className="text-xs text-[#0F2044]/55">
                {formatWorkDate(item.fecha)} · {item.estado}
              </span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={selected ? "Ficha de audiencia" : "Nueva audiencia"}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const path = selected
              ? `/trabajo/casos/${caseId}/audiencias/${selected.id}`
              : `/trabajo/casos/${caseId}/audiencias`;
            void run(
              () =>
                workApi(path, {
                  method: selected ? "PUT" : "POST",
                  body: JSON.stringify(active),
                }),
              selected ? "Audiencia actualizada." : "Audiencia creada.",
            );
            if (!selected) setForm(empty);
          }}
        >
          <Input
            label="Titulo"
            required
            value={active.titulo}
            onChange={(v) => set("titulo", v)}
          />
          <Input
            label="Fecha y hora"
            type="datetime-local"
            value={toLocalInput(active.fecha)}
            onChange={(v) => set("fecha", v)}
          />
          <Input
            label="Lugar"
            value={active.lugar || ""}
            onChange={(v) => set("lugar", v)}
          />
          <Input
            label="Participantes"
            value={active.participantes || ""}
            onChange={(v) => set("participantes", v)}
          />
          <Text
            label="Objetivo"
            value={active.objetivo || ""}
            onChange={(v) => set("objetivo", v)}
          />
          <Text
            label="Argumentos"
            value={active.argumentos || ""}
            onChange={(v) => set("argumentos", v)}
          />
          <Text
            label="Preguntas preparadas"
            value={active.preguntas || ""}
            onChange={(v) => set("preguntas", v)}
          />
          <Text
            label="Objeciones previstas"
            value={active.objeciones || ""}
            onChange={(v) => set("objeciones", v)}
          />
          <Text
            label="Notas"
            value={active.notas || ""}
            onChange={(v) => set("notas", v)}
          />
          <Text
            label="Resultado"
            value={active.resultado || ""}
            onChange={(v) => set("resultado", v)}
          />
          <Text
            label="Proximas acciones"
            value={active.proximas_acciones || ""}
            onChange={(v) => set("proximas_acciones", v)}
          />
          <Select
            label="Estado"
            value={active.estado}
            onChange={(v) => set("estado", v)}
            options={[
              { value: "preparacion", label: "Preparacion" },
              { value: "lista", label: "Lista" },
              { value: "realizada", label: "Realizada" },
              { value: "cancelada", label: "Cancelada" },
            ]}
          />
          <div className="md:col-span-2">
            <Submit>{selected ? "Guardar ficha" : "Crear audiencia"}</Submit>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function PeopleTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [form, setForm] = useState({
    nombre: "",
    tipo: "cliente",
    documento: "",
    email: "",
    telefono: "",
    organizacion_nombre: "",
    rol: "cliente",
    es_cliente: true,
  });
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Contact[]>([]);
  async function search() {
    try {
      const body = await workApi<{ matches: Contact[] }>(
        `/trabajo/conflictos?q=${encodeURIComponent(query)}`,
      );
      setMatches(body.matches);
    } catch {
      setMatches([]);
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Panel title="Nuevo contacto">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  workApi("/trabajo/contactos", {
                    method: "POST",
                    body: JSON.stringify({ ...form, causa_id: Number(caseId) }),
                  }),
                "Contacto vinculado.",
              );
              setForm({
                ...form,
                nombre: "",
                documento: "",
                email: "",
                telefono: "",
              });
            }}
          >
            <Input
              label="Nombre o razon social"
              required
              value={form.nombre}
              onChange={(v) => setForm({ ...form, nombre: v })}
            />
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={(v) => setForm({ ...form, tipo: v })}
              options={contactTypes}
            />
            <Input
              label="DNI / CUIT"
              value={form.documento}
              onChange={(v) => setForm({ ...form, documento: v })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Input
              label="Telefono"
              value={form.telefono}
              onChange={(v) => setForm({ ...form, telefono: v })}
            />
            <Input
              label="Organizacion"
              value={form.organizacion_nombre}
              onChange={(v) => setForm({ ...form, organizacion_nombre: v })}
            />
            <Submit>Guardar contacto</Submit>
          </form>
        </Panel>
        <Panel title="Control de conflictos">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Nombre, DNI o empresa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => void search()}
              className="rounded-xl bg-[#0F2044] px-4 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </div>
          {matches.map((item) => (
            <p
              key={`${item.id}-${item.rol}`}
              className="mt-2 rounded-lg bg-[#EEF3F8] p-2 text-xs"
            >
              <strong>{item.nombre}</strong> · {item.tipo}
              {item.rol ? ` · ${item.rol}` : ""}
            </p>
          ))}
        </Panel>
      </div>
      <Panel title="Personas vinculadas">
        {data.contacts.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.contacts.map((item) => (
              <article
                key={`${item.id}-${item.rol}`}
                className="rounded-xl border p-4"
              >
                <strong>{item.nombre}</strong>
                <p className="mt-1 text-xs uppercase text-[#546FC0]">
                  {item.tipo} · {item.rol || "vinculado"}
                </p>
                <p className="mt-2 text-sm text-[#0F2044]/60">
                  {[
                    item.documento,
                    item.email,
                    item.telefono,
                    item.organizacion_nombre,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos de contacto"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No hay contactos vinculados." />
        )}
      </Panel>
    </div>
  );
}

function CommunicationsTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [form, setForm] = useState({
    tipo: "llamada",
    asunto: "",
    resumen: "",
    compromisos: "",
    proximo_contacto: "",
    contacto_id: "",
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Panel title="Registrar comunicacion">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                workApi(`/trabajo/casos/${caseId}/comunicaciones`, {
                  method: "POST",
                  body: JSON.stringify({
                    ...form,
                    contacto_id: form.contacto_id
                      ? Number(form.contacto_id)
                      : null,
                    proximo_contacto: form.proximo_contacto || null,
                  }),
                }),
              "Comunicacion registrada.",
            );
            setForm({ ...form, asunto: "", resumen: "", compromisos: "" });
          }}
        >
          <Select
            label="Tipo"
            value={form.tipo}
            onChange={(v) => setForm({ ...form, tipo: v })}
            options={[
              "llamada",
              "correo",
              "reunion",
              "mensaje",
              "notificacion",
              "nota",
            ].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Contacto"
            value={form.contacto_id}
            onChange={(v) => setForm({ ...form, contacto_id: v })}
            options={[
              { value: "", label: "Sin contacto" },
              ...data.contacts.map((item) => ({
                value: String(item.id),
                label: item.nombre,
              })),
            ]}
          />
          <Input
            label="Asunto"
            required
            value={form.asunto}
            onChange={(v) => setForm({ ...form, asunto: v })}
          />
          <Text
            label="Resumen"
            value={form.resumen}
            onChange={(v) => setForm({ ...form, resumen: v })}
          />
          <Text
            label="Compromisos"
            value={form.compromisos}
            onChange={(v) => setForm({ ...form, compromisos: v })}
          />
          <Input
            label="Proximo contacto"
            type="datetime-local"
            value={form.proximo_contacto}
            onChange={(v) => setForm({ ...form, proximo_contacto: v })}
          />
          <Submit>Registrar</Submit>
        </form>
      </Panel>
      <Panel title="Comunicaciones">
        <div className="space-y-3">
          {data.communications.map((item) => (
            <article
              key={item.id}
              className="relative border-l-2 border-[#88A9C8] py-1 pl-5"
            >
              <span className="absolute -left-2 top-2 h-3 w-3 rounded-full bg-[#546FC0]" />
              <p className="text-xs font-bold uppercase text-[#546FC0]">
                {item.tipo} · {formatWorkDate(item.fecha)}
              </p>
              <h3 className="font-semibold">{item.asunto}</h3>
              <p className="mt-1 text-sm text-[#0F2044]/65">
                {item.resumen || "Sin resumen"}
              </p>
              {item.compromisos && (
                <p className="mt-2 rounded-lg bg-[#EEF3F8] p-2 text-xs">
                  <strong>Compromisos:</strong> {item.compromisos}
                </p>
              )}
            </article>
          ))}
          {!data.communications.length && (
            <Empty text="No hay comunicaciones registradas." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function MoneyTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [movement, setMovement] = useState({
    tipo: "honorario",
    concepto: "",
    monto: "",
    moneda: "ARS",
    fecha: new Date().toISOString().slice(0, 10),
    estado: "pendiente",
    notas: "",
  });
  const [time, setTime] = useState({
    descripcion: "",
    minutos: "",
    fecha: new Date().toISOString().slice(0, 10),
    facturable: true,
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric
          label="Honorarios"
          value={formatMoney(data.finance.honorarios)}
        />
        <Metric label="Pagos" value={formatMoney(data.finance.pagos)} />
        <Metric label="Gastos" value={formatMoney(data.finance.gastos)} />
        <Metric
          label="Tiempo"
          value={`${Math.floor(data.finance.minutos / 60)} h ${data.finance.minutos % 60} min`}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Nuevo movimiento">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  workApi(`/trabajo/casos/${caseId}/movimientos`, {
                    method: "POST",
                    body: JSON.stringify({
                      ...movement,
                      monto: Number(movement.monto),
                    }),
                  }),
                "Movimiento registrado.",
              );
              setMovement({ ...movement, concepto: "", monto: "" });
            }}
          >
            <Select
              label="Tipo"
              value={movement.tipo}
              onChange={(v) => setMovement({ ...movement, tipo: v })}
              options={[
                { value: "honorario", label: "Honorario acordado" },
                { value: "pago", label: "Pago recibido" },
                { value: "gasto", label: "Gasto" },
              ]}
            />
            <Input
              label="Concepto"
              required
              value={movement.concepto}
              onChange={(v) => setMovement({ ...movement, concepto: v })}
            />
            <Input
              label="Monto"
              required
              type="number"
              value={movement.monto}
              onChange={(v) => setMovement({ ...movement, monto: v })}
            />
            <Input
              label="Fecha"
              type="date"
              value={movement.fecha}
              onChange={(v) => setMovement({ ...movement, fecha: v })}
            />
            <Submit>Guardar movimiento</Submit>
          </form>
        </Panel>
        <Panel title="Registrar tiempo">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  workApi(`/trabajo/casos/${caseId}/tiempos`, {
                    method: "POST",
                    body: JSON.stringify({
                      ...time,
                      minutos: Number(time.minutos),
                    }),
                  }),
                "Tiempo registrado.",
              );
              setTime({ ...time, descripcion: "", minutos: "" });
            }}
          >
            <Input
              label="Trabajo realizado"
              required
              value={time.descripcion}
              onChange={(v) => setTime({ ...time, descripcion: v })}
            />
            <Input
              label="Minutos"
              required
              type="number"
              value={time.minutos}
              onChange={(v) => setTime({ ...time, minutos: v })}
            />
            <Input
              label="Fecha"
              type="date"
              value={time.fecha}
              onChange={(v) => setTime({ ...time, fecha: v })}
            />
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={time.facturable}
                onChange={(e) =>
                  setTime({ ...time, facturable: e.target.checked })
                }
              />{" "}
              Facturable
            </label>
            <Submit>Registrar tiempo</Submit>
          </form>
        </Panel>
      </div>
      <Panel title="Estado de cuenta">
        <div className="divide-y">
          {data.movements.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span>
                <strong>{item.concepto}</strong>
                <small className="block text-[#0F2044]/55">
                  {item.tipo} · {item.fecha} · {item.estado}
                </small>
              </span>
              <strong>{formatMoney(item.monto, item.moneda)}</strong>
            </div>
          ))}
          {!data.movements.length && <Empty text="Sin movimientos." />}
        </div>
      </Panel>
    </div>
  );
}

function WritingTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [templateForm, setTemplateForm] = useState({
    nombre: "",
    categoria: "general",
    contenido:
      "Señor/a Juez/a:\n\n{{abogado}}, en representacion de {{cliente}}, en los autos “{{caratula}}”, expediente {{numero_expediente}}, se presenta y dice:\n\n{{objeto}}\n",
  });
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [variables, setVariables] = useState({
    abogado: "",
    cliente: "",
    objeto: "",
  });
  const [selected, setSelected] = useState<number | null>(null);
  const writing = data.writings.find((item) => item.id === selected);
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Panel title="Nueva plantilla">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  workApi("/trabajo/plantillas-escritos", {
                    method: "POST",
                    body: JSON.stringify(templateForm),
                  }),
                "Plantilla creada.",
              );
              setTemplateForm({ ...templateForm, nombre: "" });
            }}
          >
            <Input
              label="Nombre"
              required
              value={templateForm.nombre}
              onChange={(v) => setTemplateForm({ ...templateForm, nombre: v })}
            />
            <Text
              label="Contenido"
              rows={8}
              value={templateForm.contenido}
              onChange={(v) =>
                setTemplateForm({ ...templateForm, contenido: v })
              }
            />
            <Submit>Guardar plantilla</Submit>
          </form>
        </Panel>
        <Panel title="Generar escrito">
          <Select
            label="Plantilla"
            value={templateId}
            onChange={setTemplateId}
            options={[
              { value: "", label: "Seleccionar" },
              ...data.writing_templates.map((item) => ({
                value: String(item.id),
                label: item.nombre,
              })),
            ]}
          />
          <Input label="Titulo" value={title} onChange={setTitle} />
          <div className="mt-3 space-y-3">
            <Input
              label="Abogado"
              value={variables.abogado}
              onChange={(v) => setVariables({ ...variables, abogado: v })}
            />
            <Input
              label="Cliente"
              value={variables.cliente}
              onChange={(v) => setVariables({ ...variables, cliente: v })}
            />
            <Text
              label="Objeto"
              value={variables.objeto}
              onChange={(v) => setVariables({ ...variables, objeto: v })}
            />
          </div>
          <button
            disabled={!templateId}
            onClick={() =>
              void run(
                () =>
                  workApi(`/trabajo/casos/${caseId}/escritos`, {
                    method: "POST",
                    body: JSON.stringify({
                      plantilla_id: Number(templateId),
                      titulo: title || undefined,
                      variables,
                    }),
                  }),
                "Escrito generado.",
              )
            }
            className="mt-3 w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Generar borrador
          </button>
        </Panel>
      </div>
      <Panel title="Escritos">
        {writing ? (
          <WritingEditor
            writing={writing}
            caseId={caseId}
            run={run}
            close={() => setSelected(null)}
          />
        ) : (
          <div className="space-y-3">
            {data.writings.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className="flex w-full items-center justify-between rounded-xl border-2 border-[#88A9C8]/45 p-4 text-left"
              >
                <span>
                  <strong>{item.titulo}</strong>
                  <small className="block text-[#0F2044]/55">
                    Version {item.version} · {item.estado}
                  </small>
                </span>
                <span>Editar →</span>
              </button>
            ))}
            {!data.writings.length && (
              <Empty text="No hay escritos generados." />
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function WritingEditor({
  writing,
  caseId,
  run,
  close,
}: {
  writing: CaseWorkSummary["writings"][number];
  caseId: string;
  run: Runner;
  close: () => void;
}) {
  const [content, setContent] = useState(writing.contenido);
  const [status, setStatus] = useState(writing.estado);
  function downloadWord() {
    const safe = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    const html = `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;line-height:1.6">${safe}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${writing.titulo.replace(/[^a-z0-9_-]+/gi, "-")}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function print() {
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(
      `<html><head><title>${writing.titulo}</title><style>body{font-family:serif;line-height:1.6;max-width:800px;margin:60px auto;white-space:pre-wrap}</style></head><body>${content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`,
    );
    popup.document.close();
    popup.print();
  }
  return (
    <div>
      <button
        onClick={close}
        className="mb-3 text-sm font-semibold text-[#546FC0]"
      >
        ← Lista
      </button>
      <Text
        label={writing.titulo}
        rows={20}
        value={content}
        onChange={setContent}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="input max-w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="borrador">Borrador</option>
          <option value="revisado">Revisado</option>
          <option value="presentado">Presentado</option>
          <option value="archivado">Archivado</option>
        </select>
        <button
          onClick={() =>
            void run(
              () =>
                workApi(`/trabajo/casos/${caseId}/escritos/${writing.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ contenido: content, estado: status }),
                }),
              "Escrito actualizado.",
            )
          }
          className="rounded-xl bg-[#0F2044] px-5 py-2 text-sm font-semibold text-white"
        >
          Guardar nueva version
        </button>
        <button
          onClick={downloadWord}
          className="rounded-xl border px-5 py-2 text-sm font-semibold"
        >
          Descargar Word
        </button>
        <button
          onClick={print}
          className="rounded-xl border px-5 py-2 text-sm font-semibold"
        >
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

function PortalTab({
  data,
  documents,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  documents: CaseDocument[];
  caseId: string;
  run: Runner;
}) {
  const [label, setLabel] = useState("");
  const [contactId, setContactId] = useState("");
  const [expires, setExpires] = useState("");
  const [newLink, setNewLink] = useState("");
  const [message, setMessage] = useState<Record<number, string>>({});
  async function create() {
    try {
      const body = await workApi<{ access: { token: string } }>(
        `/trabajo/casos/${caseId}/portal`,
        {
          method: "POST",
          body: JSON.stringify({
            etiqueta: label,
            contacto_id: contactId ? Number(contactId) : null,
            expires_at: expires || null,
          }),
        },
      );
      const link = `${window.location.origin}/portal/${body.access.token}`;
      setNewLink(link);
      await navigator.clipboard?.writeText(link);
      setLabel("");
      await run(async () => undefined, "Acceso creado y enlace copiado.");
    } catch (reason) {
      throw reason;
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Panel title="Crear acceso para cliente">
          <Input
            label="Etiqueta"
            value={label}
            onChange={setLabel}
            placeholder="Ej. Acceso de Juan Perez"
          />
          <Select
            label="Cliente"
            value={contactId}
            onChange={setContactId}
            options={[
              { value: "", label: "Sin contacto asociado" },
              ...data.contacts.map((item) => ({
                value: String(item.id),
                label: item.nombre,
              })),
            ]}
          />
          <Input
            label="Vence (opcional)"
            type="datetime-local"
            value={expires}
            onChange={setExpires}
          />
          <button
            disabled={!label}
            onClick={() => void create()}
            className="mt-3 w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Crear enlace
          </button>
          {newLink && (
            <div className="mt-3 rounded-xl border-2 border-[#88A9C8] bg-[#EEF3F8] p-3 text-xs break-all">
              <strong>Enlace copiado:</strong>
              <br />
              {newLink}
            </div>
          )}
        </Panel>
        <Panel title="Accesos y mensajes">
          {data.portal_access.map((item) => (
            <div key={item.id} className="border-b py-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  <strong>{item.etiqueta}</strong>
                  <small className="block">
                    Ultimo acceso: {formatWorkDate(item.ultimo_acceso_at)}
                  </small>
                </span>
                {!item.revocado_at && (
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          workApi(
                            `/trabajo/casos/${caseId}/portal/${item.id}`,
                            { method: "DELETE" },
                          ),
                        "Acceso revocado.",
                      )
                    }
                    className="text-xs font-bold text-red-700"
                  >
                    Revocar
                  </button>
                )}
              </div>
              {item.mensajes?.slice(-3).map((entry) => (
                <p
                  key={entry.id}
                  className="mt-2 rounded-lg bg-[#F4F7F5] p-2 text-xs"
                >
                  <strong>{entry.autor_tipo}:</strong> {entry.contenido}
                </p>
              ))}
              {!item.revocado_at && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="input"
                    placeholder="Responder al cliente"
                    value={message[item.id] || ""}
                    onChange={(e) =>
                      setMessage({ ...message, [item.id]: e.target.value })
                    }
                  />
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          workApi(
                            `/trabajo/casos/${caseId}/portal/${item.id}/mensajes`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                contenido: message[item.id],
                              }),
                            },
                          ),
                        "Mensaje enviado.",
                      )
                    }
                    className="rounded-lg bg-[#0F2044] px-3 text-xs text-white"
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          ))}
          {!data.portal_access.length && (
            <Empty text="No hay accesos creados." />
          )}
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title="Documentos para el cliente">
          <div className="space-y-2">
            {documents.map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between rounded-xl border-2 border-[#88A9C8]/45 p-3 text-sm"
              >
                <span>{item.nombre || item.nombre_archivo}</span>
                <input
                  type="checkbox"
                  checked={Boolean(item.visible_portal)}
                  onChange={(e) =>
                    void run(
                      () =>
                        workApi(
                          `/trabajo/casos/${caseId}/documentos/${item.id}/portal`,
                          {
                            method: "PUT",
                            body: JSON.stringify({ visible: e.target.checked }),
                          },
                        ),
                      "Visibilidad actualizada.",
                    )
                  }
                />
              </label>
            ))}
            {!documents.length && <Empty text="No hay documentos." />}
          </div>
        </Panel>
        <Panel title="Archivos recibidos">
          {data.portal_uploads.map((item) => (
            <a
              key={item.id}
              href={`${process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000"}/api/trabajo/casos/${caseId}/portal-archivos/${item.id}`}
              className="block border-b py-3 text-sm"
            >
              <strong>{item.nombre_archivo}</strong>
              <small className="block">
                {item.etiqueta} · {formatWorkDate(item.created_at)}
              </small>
              {item.descripcion && <p>{item.descripcion}</p>}
            </a>
          ))}
          {!data.portal_uploads.length && (
            <Empty text="No hay archivos recibidos." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function ReviewTab({
  data,
  caseId,
  run,
}: {
  data: CaseWorkSummary;
  caseId: string;
  run: Runner;
}) {
  const [state, setState] = useState("observada");
  const [notes, setNotes] = useState("");
  const snapshot = data.review_snapshot;
  const checks = [
    {
      label: "Tareas pendientes",
      value: snapshot.tareas_pendientes,
      warn: snapshot.tareas_pendientes > 0,
    },
    {
      label: "Tareas vencidas",
      value: snapshot.tareas_vencidas,
      warn: snapshot.tareas_vencidas > 0,
    },
    {
      label: "Vencimientos atrasados",
      value: snapshot.fechas_vencidas,
      warn: snapshot.fechas_vencidas > 0,
    },
    {
      label: "Documentos",
      value: snapshot.documentos,
      warn: snapshot.documentos === 0,
    },
    {
      label: "Contactos",
      value: snapshot.contactos,
      warn: snapshot.contactos === 0,
    },
    { label: "Comunicaciones", value: snapshot.comunicaciones, warn: false },
    {
      label: "Audiencias en preparacion",
      value: snapshot.audiencias_en_preparacion,
      warn: snapshot.audiencias_en_preparacion > 0,
    },
    {
      label: "Accesos portal activos",
      value: snapshot.accesos_portal_activos,
      warn: false,
    },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <Panel title="Control del expediente">
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border-2 p-4 ${item.warn ? "border-[#546FC0] bg-[#EEF3F8]" : "border-[#88A9C8]/45 bg-white"}`}
            >
              <p className="text-xs font-bold uppercase">{item.label}</p>
              <strong className="mt-1 block text-2xl">{item.value}</strong>
            </div>
          ))}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel title="Registrar revision">
          <Select
            label="Resultado"
            value={state}
            onChange={setState}
            options={[
              { value: "aprobada", label: "Aprobada" },
              { value: "observada", label: "Observada" },
              { value: "requiere_accion", label: "Requiere accion" },
            ]}
          />
          <Text label="Observaciones" value={notes} onChange={setNotes} />
          <button
            onClick={() =>
              void run(
                () =>
                  workApi(`/trabajo/casos/${caseId}/revisiones`, {
                    method: "POST",
                    body: JSON.stringify({
                      estado: state,
                      observaciones: notes,
                    }),
                  }),
                "Revision registrada.",
              )
            }
            className="mt-3 w-full rounded-xl bg-[#0F2044] px-4 py-3 text-sm font-semibold text-white"
          >
            Cerrar revision
          </button>
        </Panel>
        <Panel title="Historial">
          {data.reviews.map((item) => (
            <div key={item.id} className="border-b py-3 text-sm">
              <strong>{item.estado.replace("_", " ")}</strong>
              <small className="block">
                {item.revisor_nombre || "Usuario"} ·{" "}
                {formatWorkDate(item.created_at)}
              </small>
              {item.observaciones && (
                <p className="mt-1 text-[#0F2044]/60">{item.observaciones}</p>
              )}
            </div>
          ))}
          {!data.reviews.length && <Empty text="Sin revisiones previas." />}
        </Panel>
      </div>
    </div>
  );
}

type Runner = (
  action: () => Promise<unknown>,
  message: string,
) => Promise<void>;
const priorityOptions = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];
const contactTypes = [
  "cliente",
  "testigo",
  "perito",
  "contraparte",
  "fiscal",
  "juzgado",
  "abogado",
  "familiar",
  "otro",
].map((value) => ({ value, label: value }));
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[23px] border-2 border-[#88A9C8] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-[#0F2044]/60">
      <span className="mb-1 block">{label}</span>
      <input
        className="input"
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Text({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-[#0F2044]/60">
      <span className="mb-1 block">{label}</span>
      <textarea
        className="input resize-y"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-[#0F2044]/60">
      <span className="mb-1 block">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((item) => (
          <option key={`${item.value}-${item.label}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-full rounded-xl bg-[#0F2044] px-5 py-3 text-sm font-semibold text-white">
      {children}
    </button>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border-2 border-dashed border-[#88A9C8] bg-[#F4F7F5] p-5 text-center text-sm text-[#0F2044]/55">
      {text}
    </p>
  );
}
function Alert({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm font-semibold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-[#88A9C8] bg-white text-[#0F2044]"}`}
    >
      {children}
    </p>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#88A9C8] bg-[#F4F7F5] px-3 py-2">
      {children}
    </span>
  );
}
function Priority({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${value === "urgente" ? "bg-red-100 text-red-700" : "bg-[#EEF3F8] text-[#0F2044]"}`}
    >
      {value}
    </span>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[#88A9C8] bg-white p-5">
      <p className="text-xs font-bold uppercase text-[#0F2044]/50">{label}</p>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}
function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
