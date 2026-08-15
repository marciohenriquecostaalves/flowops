'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type User = { name: string; email: string; roles: string[] };
type ActiveSession = {
  id: string;
  status: string;
  startedAt: string;
  units: number;
  employee: { name: string; employeeCode: string };
  activity: { name: string; code: string; targetPerHour: string | null };
};
type Productivity = {
  employeeId: string;
  employee: string;
  units: number;
  productiveSeconds: number;
  productivity: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState<ActiveSession[]>([]);
  const [ranking, setRanking] = useState<Productivity[]>([]);
  const [error, setError] = useState('');

  async function load(token: string) {
    const headers = { Authorization: `Bearer ${token}` };
    const [me, sessions, productivity] = await Promise.all([
      fetch(`${API}/auth/me`, { headers }),
      fetch(`${API}/operations/sessions/active`, { headers }),
      fetch(`${API}/operations/productivity`, { headers }),
    ]);

    if (!me.ok) throw new Error();
    setUser(await me.json());
    if (sessions.ok) setActive(await sessions.json());
    if (productivity.ok) setRanking(await productivity.json());
  }

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) return router.replace('/');
    load(token).catch(() => {
      localStorage.clear();
      router.replace('/');
    });
  }, [router]);

  async function finish(id: string) {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) return;
    setError('');
    const response = await fetch(`${API}/operations/sessions/${id}/finish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError('Não foi possível finalizar a sessão.');
      return;
    }
    await load(token);
  }

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  if (!user) return <main className="container">Carregando FlowOps...</main>;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="logo">FlowOps</div>
          <div className="muted">Core Operacional · Fase 2</div>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/employees">Colaboradores</Link>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="grid grid-4" style={{ marginBottom: 16 }}>
        <Kpi title="Sessões ativas" value={String(active.length)} />
        <Kpi title="Unidades em sessões ativas" value={String(active.reduce((n, s) => n + s.units, 0))} />
        <Kpi title="Colaboradores no ranking" value={String(ranking.length)} />
        <Kpi title="Melhor produtividade" value={ranking[0] ? `${ranking[0].productivity.toFixed(1)}/h` : '—'} />
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Operação em tempo real</h2>
        {active.length === 0 ? (
          <p className="muted">Nenhuma sessão ativa.</p>
        ) : (
          active.map((session) => (
            <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{session.employee.name}</strong>
                <div className="muted">{session.activity.name} · {session.status} · {session.units} unidades</div>
              </div>
              <button className="btn" onClick={() => finish(session.id)}>Finalizar</button>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Ranking de produtividade</h2>
        {ranking.length === 0 ? (
          <p className="muted">Ainda não existem sessões concluídas.</p>
        ) : ranking.map((row, index) => (
          <div key={row.employeeId} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 120px', gap: 12, padding: '12px 0', borderBottom: '1px solid #eee' }}>
            <strong>#{index + 1}</strong>
            <span>{row.employee}</span>
            <span>{row.units} un.</span>
            <strong>{row.productivity.toFixed(1)}/h</strong>
          </div>
        ))}
      </section>
    </main>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return <div className="card"><div className="muted">{title}</div><div className="kpi">{value}</div></div>;
}
