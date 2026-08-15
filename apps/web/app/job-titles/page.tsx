'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type JobTitle = { id: string; name: string; active: boolean; _count: { employees: number } };

export default function JobTitlesPage() {
  const router = useRouter();
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<JobTitle | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function auth() { const token = localStorage.getItem('flowops_access_token'); return token ? { Authorization: `Bearer ${token}` } : null; }
  async function load() { const headers = auth(); if (!headers) return router.replace('/'); const response = await fetch(`${API}/job-titles`, { headers }); if (!response.ok) { setError('Seu perfil não tem acesso à gestão de cargos.'); setLoading(false); return; } setJobTitles(await response.json()); setLoading(false); }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); const headers = auth(); if (!headers) return router.replace('/'); setSaving(true); setError(''); const response = await fetch(editing ? `${API}/job-titles/${editing.id}` : `${API}/job-titles`, { method: editing ? 'PATCH' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setSaving(false); if (!response.ok) { setError('Não foi possível salvar o cargo. O nome precisa ser único.'); return; } setName(''); setEditing(null); await load(); }
  function edit(jobTitle: JobTitle) { setEditing(jobTitle); setName(jobTitle.name); setError(''); }
  async function toggle(jobTitle: JobTitle) { const headers = auth(); if (!headers) return router.replace('/'); const response = await fetch(`${API}/job-titles/${jobTitle.id}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !jobTitle.active }) }); if (!response.ok) { setError('Não foi possível alterar o status do cargo.'); return; } await load(); }
  if (loading) return <main className="container">Carregando cargos...</main>;
  return <AppShell title="Cargos" subtitle="Defina os cargos usados no cadastro da sua equipe.">
    <section className="card" style={{ marginBottom: 16 }}><h2>{editing ? 'Editar cargo' : 'Novo cargo'}</h2><form className="compact-form" onSubmit={submit}><div className="field"><label>Nome do cargo</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Operador logístico" /></div><div className="form-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cargo'}</button>{editing && <button className="btn btn-secondary" type="button" onClick={() => { setEditing(null); setName(''); }}>Cancelar</button>}</div></form>{error && <div className="error">{error}</div>}</section>
    <section className="card"><h2>Cargos cadastrados</h2>{jobTitles.length === 0 ? <p className="muted">Cadastre o primeiro cargo para selecioná-lo nos colaboradores.</p> : <div className="table-wrap"><table><thead><tr><th>Cargo</th><th>Colaboradores</th><th>Status</th><th>Ações</th></tr></thead><tbody>{jobTitles.map((jobTitle) => <tr key={jobTitle.id}><td><strong>{jobTitle.name}</strong></td><td>{jobTitle._count.employees}</td><td><span className={jobTitle.active ? 'status' : 'status status-muted'}>{jobTitle.active ? 'ATIVO' : 'INATIVO'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(jobTitle)}>Editar</button><button className="btn btn-danger" onClick={() => toggle(jobTitle)}>{jobTitle.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>}</section>
  </AppShell>;
}
