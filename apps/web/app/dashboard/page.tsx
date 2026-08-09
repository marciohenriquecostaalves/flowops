'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type User = {
  name: string;
  email: string;
  roles: string[];
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) {
      router.replace('/');
      return;
    }

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setUser)
      .catch(() => {
        localStorage.clear();
        router.replace('/');
      });
  }, [router]);

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  if (!user) return <main className="container">Carregando...</main>;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="logo">FlowOps</div>
          <div className="muted">Painel operacional</div>
        </div>
        <button className="btn" onClick={logout}>Sair</button>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <strong>Olá, {user.name}</strong>
        <div className="muted">{user.email} · {user.roles.join(', ')}</div>
      </section>

      <section className="grid grid-4">
        <Kpi title="Produtividade" value="—" />
        <Kpi title="SLA" value="—" />
        <Kpi title="Tempo produtivo" value="—" />
        <Kpi title="Backlog" value="—" />
      </section>
    </main>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div className="kpi">{value}</div>
    </div>
  );
}
