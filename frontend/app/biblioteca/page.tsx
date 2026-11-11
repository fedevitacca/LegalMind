"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import { libraryApi, type LibraryResource, type LibraryResourceInput, type LibraryResourceType } from "../../lib/bibliotecaApi";

const types: { id: LibraryResourceType; label: string }[] = [
  { id: "ley", label: "Ley" }, { id: "fallo", label: "Fallo" },
  { id: "doctrina", label: "Doctrina" }, { id: "modelo", label: "Modelo" },
  { id: "enlace", label: "Enlace" }, { id: "nota", label: "Nota" },
];
const emptyForm: LibraryResourceInput = { titulo: "", tipo: "nota", jurisdiccion: "", referencia: "", url: "", notas: "", etiquetas: [], destacado: false };

export default function BibliotecaPage() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [featured, setFeatured] = useState(false);
  const [form, setForm] = useState<LibraryResourceInput>(emptyForm);
  const [tags, setTags] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setResources((await libraryApi.list({ query, type, featured })).resources); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cargar la biblioteca."); }
    finally { setLoading(false); }
  }, [query, type, featured]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await libraryApi.create({ ...form, etiquetas: tags.split(",").map((item) => item.trim()).filter(Boolean) });
      setForm(emptyForm); setTags(""); setShowForm(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar el recurso."); }
    finally { setBusy(false); }
  }

  async function toggleFeatured(resource: LibraryResource) {
    try { const { resource: updated } = await libraryApi.update(resource.id, { destacado: !resource.destacado });
      setResources((current) => current.map((item) => item.id === resource.id ? updated : item).sort((a, b) => Number(b.destacado) - Number(a.destacado))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo actualizar el recurso."); }
  }

  async function remove(resource: LibraryResource) {
    if (!window.confirm(`¿Eliminar “${resource.titulo}”?`)) return;
    try { await libraryApi.remove(resource.id); setResources((current) => current.filter((item) => item.id !== resource.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo eliminar el recurso."); }
  }

  return <MarcoAplicacion activeSection="Biblioteca">
    <section className="h-full overflow-y-auto bg-[#F4F7F5] p-5 text-[#0F2044] sm:p-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[23px] border-2 border-[#88A9C8] bg-white p-5">
          <div><h1 className="text-[28px] font-semibold">Biblioteca jurídica</h1><p className="mt-1 text-sm text-[#0F2044]/60">Material reutilizable del estudio.</p></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="rounded-xl bg-[#0F2044] px-5 py-3 text-sm font-semibold text-white">{showForm ? "Cerrar" : "+ Agregar recurso"}</button>
        </header>

        {showForm && <form onSubmit={create} className="mt-4 grid gap-4 rounded-[23px] border-2 border-[#88A9C8] bg-white p-5 md:grid-cols-2">
          <Field label="Título"><input required maxLength={240} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input" /></Field>
          <Field label="Tipo"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as LibraryResourceType })} className="input">{types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Jurisdicción"><input value={form.jurisdiccion || ""} onChange={(e) => setForm({ ...form, jurisdiccion: e.target.value })} className="input" placeholder="Nacional, CABA, Buenos Aires..." /></Field>
          <Field label="Referencia"><input value={form.referencia || ""} onChange={(e) => setForm({ ...form, referencia: e.target.value })} className="input" placeholder="Ley, expediente o cita" /></Field>
          <Field label="Enlace"><input type="url" value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" placeholder="https://..." /></Field>
          <Field label="Etiquetas"><input value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="penal, prueba, audiencia" /></Field>
          <label className="md:col-span-2"><span className="label">Notas</span><textarea rows={3} value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input resize-y" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} /> Destacar recurso</label>
          <div className="flex justify-end"><button disabled={busy} className="rounded-xl bg-[#0F2044] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando..." : "Guardar"}</button></div>
        </form>}

        <div className="mt-4 grid gap-3 rounded-[18px] border border-[#88A9C8] bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input" placeholder="Buscar por título, referencia o etiqueta" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="input"><option value="">Todos los tipos</option>{types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          <label className="flex items-center gap-2 px-2 text-sm font-semibold"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Solo destacados</label>
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {loading ? <p className="rounded-2xl border border-[#88A9C8] bg-white p-5">Cargando...</p> : resources.length ? resources.map((resource) => (
            <article key={resource.id} className="rounded-[20px] border border-[#88A9C8] bg-white p-5 shadow-[0_6px_18px_rgba(15,32,68,.05)]">
              <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#EEF3F8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#546FC0]">{labelForType(resource.tipo)}</span><h2 className="mt-3 text-lg font-semibold">{resource.titulo}</h2></div>
                <button type="button" aria-label={resource.destacado ? "Quitar destacado" : "Destacar"} onClick={() => void toggleFeatured(resource)} className={`text-2xl ${resource.destacado ? "text-amber-500" : "text-[#88A9C8]"}`}>★</button></div>
              {(resource.jurisdiccion || resource.referencia) && <p className="mt-2 text-sm text-[#0F2044]/65">{[resource.jurisdiccion, resource.referencia].filter(Boolean).join(" · ")}</p>}
              {resource.notas && <p className="mt-3 line-clamp-3 text-sm leading-6">{resource.notas}</p>}
              {!!resource.etiquetas?.length && <div className="mt-3 flex flex-wrap gap-2">{resource.etiquetas.map((tag) => <span key={tag} className="rounded-full border border-[#88A9C8]/60 px-2 py-1 text-xs">#{tag}</span>)}</div>}
              <div className="mt-4 flex items-center justify-between border-t border-[#88A9C8]/35 pt-3 text-sm">{resource.url ? <a href={resource.url} target="_blank" rel="noreferrer" className="font-semibold text-[#546FC0]">Abrir fuente →</a> : <span />}
                <button type="button" onClick={() => void remove(resource)} className="text-xs font-semibold text-red-700">Eliminar</button></div>
            </article>
          )) : <div className="rounded-[20px] border-2 border-dashed border-[#88A9C8] bg-white p-8 text-center lg:col-span-2"><h2 className="font-semibold">Todavía no hay recursos</h2><p className="mt-1 text-sm text-[#0F2044]/60">Agregá una ley, fallo, modelo o nota de consulta.</p></div>}
        </div>
      </div>
    </section>
  </MarcoAplicacion>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="label">{label}</span>{children}</label>; }
function labelForType(type: LibraryResourceType) { return types.find((item) => item.id === type)?.label || type; }
