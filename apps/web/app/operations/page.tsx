'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type Employee = { id: string; name: string; employeeCode: string; status: string; userId: string | null };
type Activity = { id: string; name: string; code: string; status: string };
type Session = { id: string; status: 'RUNNING' | 'PAUSED'; units: number; employee: Employee; activity: Activity };

export default function OperationsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [units, setUnits] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const auth = () => { const token = localStorage.getItem('flowops_access_token'); return token ? { Authorization: `Bearer ${token}` } : null; };
  async function load() {
    const headers = auth(); if (!headers) return router.replace('/');
    const [employeeResponse, activityResponse, sessionResponse, meResponse] = await Promise.all([
      fetch(`${API}/employees`, { headers }), fetch(`${API}/activities`, { headers }), fetch(`${API}/operations/sessions/active`, { headers }), fetch(`${API}/auth/me`, { headers }),
    ]);
    if (!employeeResponse.ok || !activityResponse.ok || !sessionResponse.ok) { localStorage.clear(); return router.replace('/'); }
    const active = await sessionResponse.json();
    const me = meResponse.ok ? await meResponse.json() : null;
    const allEmployees = await employeeResponse.json();
    setEmployees(allEmployees.filter((employee: Employee) => employee.status === 'ACTIVE' && (!me?.roles?.includes('OPERATOR') || employee.userId === me.id)));
    setActivities((await activityResponse.json()).filter((activity: Activity) => activity.status === 'ACTIVE'));
    setSessions(active); setUnits(Object.fromEntries(active.map((session: Session) => [session.id, String(session.units)]))); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function request(path: string, method = 'POST', body?: object) {
    const headers = auth(); if (!headers) return router.replace('/');
    const response = await fetch(`${API}${path}`, { method, headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) { setError('Não foi possível concluir a operação. Verifique os dados e tente novamente.'); return false; }
    setError(''); await load(); return true;
  }
  async function start(event: FormEvent) { event.preventDefault(); await request('/operations/sessions/start', 'POST', { employeeId, activityId }); setEmployeeId(''); setActivityId(''); }
  if (loading) return <main className="container">Carregando operação...</main>;
  return <AppShell title="Operação" subtitle="Inicie, acompanhe e conclua as sessões de trabalho.">
    <section className="card" style={{ marginBottom:16 }}><h2>Iniciar sessão</h2><form className="operation-form" onSubmit={start}><div className="field"><label>Colaborador</label><select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}><option value="">Selecione</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.name}</option>)}</select></div><div className="field"><label>Atividade</label><select required value={activityId} onChange={(e) => setActivityId(e.target.value)}><option value="">Selecione</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} · {activity.name}</option>)}</select></div><div className="form-actions"><button className="btn" type="submit">Iniciar sessão</button></div></form>{error && <div className="error">{error}</div>}</section>
    <section className="card"><h2>Sessões ativas</h2>{sessions.length === 0 ? <p className="muted">Nenhuma sessão ativa.</p> : <div className="session-list">{sessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.employee.name}</strong><div className="muted">{session.activity.code} · {session.status === 'RUNNING' ? 'Em andamento' : 'Pausada'}</div></div><div className="units-control"><label>Unidades</label><input type="number" min="0" value={units[session.id] ?? '0'} onChange={(e) => setUnits({ ...units, [session.id]: e.target.value })} /><button className="btn btn-secondary" onClick={() => request(`/operations/sessions/${session.id}/units`, 'PATCH', { units: Number(units[session.id] ?? 0) })}>Atualizar</button></div><div className="row-actions">{session.status === 'RUNNING' ? <button className="btn btn-secondary" onClick={() => request(`/operations/sessions/${session.id}/pause`)}>Pausar</button> : <button className="btn btn-secondary" onClick={() => request(`/operations/sessions/${session.id}/resume`)}>Retomar</button>}<button className="btn btn-danger" onClick={() => request(`/operations/sessions/${session.id}/finish`)}>Finalizar</button></div></div>)}</div>}</section>
  </AppShell>;
}
