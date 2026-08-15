'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Department = {
  id: string;
  name: string;
  _count: { employees: number; activities: number };
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
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
    const response = await fetch(`${API}/departments`, { headers: authorization });
    if (!response.ok) {
      localStorage.clear();
      return router.replace('/');
    }
    setDepartments(await response.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');

    setSaving(true);
    setError('');
    const response = await fetch(`${API}/departments`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);

    if (!response.ok) {
      setError('Não foi possível cadastrar o departamento. O nome precisa ser único.');
      return;
    }

    setName('');
    await load();
  }

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  if (loading) return <main className="container">Carregando departamentos...</main>;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="logo">FlowOps</div>
          <div className="muted">Gestão de departamentos</div>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/dashboard">Dashboard</Link>
          <Link className="btn btn-secondary" href="/employees">Colaboradores</Link>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Novo departamento</h2>
        <form className="compact-form" onSubmit={submit}>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Expedição" /></div>
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Departamentos</h2>
        {departments.length === 0 ? <p className="muted">Nenhum departamento cadastrado.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Departamento</th><th>Colaboradores</th><th>Atividades</th></tr></thead><tbody>{departments.map((department) => <tr key={department.id}><td><strong>{department.name}</strong></td><td>{department._count.employees}</td><td>{department._count.activities}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
