"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import { fetchCases, type CaseListItem } from "../../lib/legalmindApi";
import { formatWorkDate, type Member, type WorkTask, workApi } from "../../lib/trabajoApi";

const columns = [
  { id: "pendiente", label: "Pendientes", color: "border-amber-300" },
  { id: "en_curso", label: "En curso", color: "border-blue-300" },
  { id: "bloqueada", label: "Bloqueadas", color: "border-red-300" },
  { id: "completada", label: "Completadas", color: "border-emerald-300" },
];

export default function PaginaTrabajo() {
  const [tasks,setTasks]=useState<WorkTask[]>([]); const [members,setMembers]=useState<Member[]>([]); const [cases,setCases]=useState<CaseListItem[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [mine,setMine]=useState(false); const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({titulo:"",descripcion:"",causa_id:"",responsable_user_id:"",prioridad:"media",fecha_limite:""});
  const load=useCallback(async()=>{try{setError("");const [taskBody,memberBody,legalCases]=await Promise.all([
    workApi<{tasks:WorkTask[]}>(`/trabajo/tareas?${mine?"mias=true&":""}pendientes=false`),workApi<{members:Member[]}>("/trabajo/miembros"),fetchCases(),
  ]);setTasks(taskBody.tasks);setMembers(memberBody.members);setCases(legalCases);}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo cargar el trabajo.");}finally{setLoading(false);}},[mine]);
  useEffect(()=>{void load();},[load]);
  const pending=useMemo(()=>tasks.filter(task=>!["completada","cancelada"].includes(task.estado)).length,[tasks]);
  async function createTask(event:React.FormEvent){event.preventDefault();try{await workApi("/trabajo/tareas",{method:"POST",body:JSON.stringify({...form,causa_id:form.causa_id?Number(form.causa_id):null,fecha_limite:form.fecha_limite||null})});setForm({titulo:"",descripcion:"",causa_id:"",responsable_user_id:"",prioridad:"media",fecha_limite:""});setShowForm(false);await load();}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo crear la tarea.");}}
  async function changeStatus(task:WorkTask,estado:string){try{await workApi(`/trabajo/tareas/${task.id}`,{method:"PUT",body:JSON.stringify({estado})});await load();}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo actualizar.");}}
  async function toggleItem(itemId:number,completado:boolean){await workApi(`/trabajo/tareas/items/${itemId}`,{method:"PUT",body:JSON.stringify({completado})});await load();}
  return <MarcoAplicacion activeSection="Trabajo">
    <div className="mx-auto max-w-[1500px] px-5 py-7 text-[#0F2044]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#546FC0]">Mesa de trabajo juridica</p><h1 className="mt-1 text-3xl font-semibold">Trabajo del estudio</h1><p className="mt-2 text-sm text-[#0F2044]/65">{pending} tareas activas · responsables, vencimientos y checklists en un solo lugar.</p></div>
        <div className="flex gap-2"><button onClick={()=>setMine(value=>!value)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${mine?"bg-[#0F2044] text-white":"bg-white"}`}>{mine?"Viendo mis tareas":"Todas las tareas"}</button><button onClick={()=>setShowForm(value=>!value)} className="rounded-full bg-[#546FC0] px-5 py-2 text-sm font-semibold text-white">Nueva tarea</button></div>
      </div>
      {error&&<p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {showForm&&<form onSubmit={createTask} className="mt-5 grid gap-3 rounded-2xl border border-[#88A9C8] bg-white p-5 md:grid-cols-3">
        <Field label="Titulo"><input required value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} className="input" /></Field>
        <Field label="Expediente"><select value={form.causa_id} onChange={e=>setForm({...form,causa_id:e.target.value})} className="input"><option value="">Trabajo general</option>{cases.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Responsable"><select value={form.responsable_user_id} onChange={e=>setForm({...form,responsable_user_id:e.target.value})} className="input"><option value="">Sin asignar</option>{members.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Prioridad"><select value={form.prioridad} onChange={e=>setForm({...form,prioridad:e.target.value})} className="input"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
        <Field label="Fecha limite"><input type="datetime-local" value={form.fecha_limite} onChange={e=>setForm({...form,fecha_limite:e.target.value})} className="input" /></Field>
        <Field label="Descripcion"><input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} className="input" /></Field>
        <div className="md:col-span-3 flex justify-end"><button className="rounded-xl bg-[#0F2044] px-6 py-3 font-semibold text-white">Guardar tarea</button></div>
      </form>}
      {loading?<p className="mt-8">Cargando trabajo…</p>:<div className="mt-6 grid items-start gap-4 xl:grid-cols-4">{columns.map(column=><section key={column.id} className={`rounded-2xl border-t-4 ${column.color} bg-[#F4F7F5] p-3`}>
        <div className="flex items-center justify-between px-1 py-2"><h2 className="font-semibold">{column.label}</h2><span className="rounded-full bg-white px-2 py-1 text-xs font-bold">{tasks.filter(task=>task.estado===column.id).length}</span></div>
        <div className="space-y-3">{tasks.filter(task=>task.estado===column.id).map(task=><article key={task.id} className="rounded-xl border border-[#D4DEDF] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-5">{task.titulo}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${task.prioridad==="urgente"?"bg-red-100 text-red-700":task.prioridad==="alta"?"bg-amber-100 text-amber-700":"bg-slate-100"}`}>{task.prioridad}</span></div>
          {task.caratula&&<p className="mt-2 truncate text-xs font-semibold text-[#546FC0]">{task.caratula}</p>}
          {task.descripcion&&<p className="mt-2 line-clamp-2 text-sm text-[#0F2044]/65">{task.descripcion}</p>}
          <p className="mt-3 text-xs text-[#0F2044]/55">{task.responsable_nombre||"Sin asignar"} · {formatWorkDate(task.fecha_limite)}</p>
          {task.items?.length>0&&<div className="mt-3 space-y-1 border-t pt-3">{task.items.map(item=><label key={item.id} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={item.completado} onChange={()=>void toggleItem(item.id,!item.completado)} /><span className={item.completado?"line-through opacity-50":""}>{item.texto}</span></label>)}</div>}
          <select aria-label="Cambiar estado" value={task.estado} onChange={e=>void changeStatus(task,e.target.value)} className="mt-3 w-full rounded-lg border bg-[#F8FAF9] px-2 py-2 text-xs font-semibold"><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="bloqueada">Bloqueada</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option></select>
        </article>)}{!tasks.some(task=>task.estado===column.id)&&<p className="rounded-xl border border-dashed bg-white p-4 text-center text-xs text-[#0F2044]/45">Sin tareas</p>}</div>
      </section>)}</div>}
    </div>
  </MarcoAplicacion>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-bold uppercase tracking-wide text-[#0F2044]/65"><span className="mb-1 block">{label}</span>{children}</label>;}
