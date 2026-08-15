'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type Department = { id: string; name: string };
type Activity = { id: string; name: string; code: string; status: string; targetPerHour: string | null; department: Department | null };

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [targetPerHour, setTargetPerHour] = useState('');
  const [editing, setEditing] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = () => {
    const token = localStorage.getItem('flowops_access_token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  };
  async function load() {
    const authorization = headers();
    if (!authorization) return router.replace('/');
    const [activitiesResponse, departmentsResponse] = await Promise.all([
      fetch(`${API}/activities`, { headers: authorization }), fetch(`${API}/departments`, { headers: authorization }),
    ]);
    if (!activitiesResponse.ok || !departmentsResponse.ok) { localStorage.clear(); return router.replace('/'); }
    setActivities(await activitiesResponse.json());
    setDepartments(await departmentsResponse.json());
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  function reset() { setEditing(null); setName(''); setCode(''); setDepartmentId(''); setTargetPerHour(''); setError(''); }
  function edit(activity: Activity) { setEditing(activity); setName(activity.name); setCode(activity.code); setDepartmentId(activity.department?.id ?? ''); setTargetPerHour(activity.targetPerHour ?? ''); setError(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); const authorization = headers(); if (!authorization) return router.replace('/');
    setSaving(true); setError('');
    const body = editing ? { name, departmentId: departmentId || null, ...(targetPerHour ? { targetPerHour: Number(targetPerHour) } : {}) } : { name, code, ...(departmentId ? { departmentId } : {}), ...(targetPerHour ? { targetPerHour: Number(targetPerHour) } : {}) };
    const response = await fetch(editing ? `${API}/activities/${editing.id}` : `${API}/activities`, { method: editing ? 'PATCH' : 'POST', headers: { ...authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (!response.ok) { setError(`Não foi possível ${editing ? 'atualizar' : 'cadastrar'} a atividade.`); return; }
    reset(); await load();
  }
  async function toggle(activity: Activity) {
    const authorization = headers(); if (!authorization) return router.replace('/');
    const response = await fetch(`${API}/activities/${activity.id}`, { method: 'PATCH', headers: { ...authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ active: activity.status !== 'ACTIVE' }) });
    if (!response.ok) { setError('Não foi possível alterar o status da atividade.'); return; }
    await load();
  }
  function logout() { localStorage.clear(); router.replace('/'); }
  if (loading) return <main className="container">Carregando atividades...</main>;
  return <main className="container">
    <div className="header"><div><div className="logo">FlowOps</div><div className="muted">Gestão de atividades operacionais</div></div><div className="header-actions"><Link className="btn btn-secondary" href="/dashboard">Dashboard</Link><Link className="btn btn-secondary" href="/employees">Colaboradores</Link><Link className="btn btn-secondary" href="/departments">Departamentos</Link><Link className="btn btn-secondary" href="/shifts">Turnos</Link><button className="btn" onClick={logout}>Sair</button></div></div>
    <section className="card" style={{ marginBottom:16 }}><h2>{editing ? 'Editar atividade' : 'Nova atividade'}</h2><form className="activity-form" onSubmit={submit}>
      <div className="field"><label>Código</label><input required disabled={Boolean(editing)} minLength={2} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SEPARACAO" /></div>
      <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Separação de pedidos" /></div>
      <div className="field"><label>Departamento</label><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}><option value="">Sem departamento</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
      <div className="field"><label>Meta por hora</label><input type="number" min="0" step="0.1" value={targetPerHour} onChange={(e) => setTargetPerHour(e.target.value)} placeholder="Ex.: 50" /></div>
      <div className="form-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}</button>{editing && <button className="btn btn-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
    </form>{error && <div className="error">{error}</div>}</section>
    <section className="card"><h2>Atividades cadastradas</h2>{activities.length === 0 ? <p className="muted">Nenhuma atividade cadastrada.</p> : <div className="table-wrap"><table><thead><tr><th>Código</th><th>Atividade</th><th>Departamento</th><th>Meta/h</th><th>Status</th><th>Ações</th></tr></thead><tbody>{activities.map((activity) => <tr key={activity.id}><td>{activity.code}</td><td><strong>{activity.name}</strong></td><td>{activity.department?.name ?? '—'}</td><td>{activity.targetPerHour ?? '—'}</td><td><span className={activity.status === 'ACTIVE' ? 'status' : 'status status-muted'}>{activity.status}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(activity)}>Editar</button><button className="btn btn-danger" onClick={() => toggle(activity)}>{activity.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>}</section>
  </main>;
}
