'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type BusinessUnit = {
  id: string;
  code: string;
  name: string;
  type: 'HEADQUARTERS' | 'BRANCH';
  active: boolean;
  parent?: { id: string; code: string; name: string } | null;
  _count: { children: number; employees: number; departments: number; userAccess: number };
};

export default function BusinessUnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'HEADQUARTERS' | 'BRANCH'>('BRANCH');
  const [parentId, setParentId] = useState('');
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<BusinessUnit | null>(null);
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
    const response = await fetch(`${API}/business-units`, { headers: authorization });
    if (!response.ok) return router.replace('/dashboard');
    setUnits(await response.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');
    setSaving(true);
    setError('');
    const response = await fetch(editing ? `${API}/business-units/${editing.id}` : `${API}/business-units`, {
      method: editing ? 'PATCH' : 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, type, parentId: parentId || undefined, ...(editing ? { active } : {}) }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(Array.isArray(body?.message) ? body.message.join('. ') : body?.message ?? 'Não foi possível salvar a unidade.');
      return;
    }
    reset();
    await load();
  }

  function edit(unit: BusinessUnit) {
    setEditing(unit);
    setName(unit.name);
    setCode(unit.code);
    setType(unit.type);
    setParentId(unit.parent?.id ?? '');
    setActive(unit.active);
    setError('');
  }

  async function remove(unit: BusinessUnit) {
    if (!window.confirm(`Excluir a unidade ${unit.name}?`)) return;
    const authorization = headers();
    if (!authorization) return router.replace('/');
    const response = await fetch(`${API}/business-units/${unit.id}`, { method: 'DELETE', headers: authorization });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? 'Não é possível excluir uma unidade com vínculos.');
      return;
    }
    await load();
  }

  function reset() {
    setEditing(null); setName(''); setCode(''); setType('BRANCH'); setParentId(''); setActive(true); setError('');
  }

  if (loading) return <main className="container">Carregando unidades...</main>;

  return (
    <AppShell title="Matriz e filiais" subtitle="Organize a estrutura corporativa e controle o crescimento da empresa.">
      <section className="card" style={{ marginBottom: 16 }}>
        <h2>{editing ? 'Editar unidade' : 'Nova unidade'}</h2>
        <form className="compact-form" onSubmit={submit}>
          <div className="field"><label>Nome da unidade</label><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Filial São Paulo" /></div>
          <div className="field"><label>Código</label><input required pattern="[A-Za-z0-9_-]{2,24}" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ex.: SP01" /></div>
          <div className="field"><label>Tipo</label><select value={type} onChange={(event) => setType(event.target.value as 'HEADQUARTERS' | 'BRANCH')}><option value="BRANCH">Filial</option><option value="HEADQUARTERS">Matriz</option></select></div>
          <div className="field"><label>Unidade superior</label><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Sem unidade superior</option>{units.filter((unit) => unit.id !== editing?.id && unit.active).map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}</select></div>
          {editing && <div className="field checkbox-field"><label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Unidade ativa</label></div>}
          <div className="form-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar unidade'}</button>{editing && <button className="btn btn-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Estrutura corporativa</h2>
        {units.length === 0 ? <p className="muted">Nenhuma unidade cadastrada.</p> : <div className="table-wrap"><table><thead><tr><th>Unidade</th><th>Tipo</th><th>Superior</th><th>Vínculos</th><th>Status</th><th>Ações</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id}><td><strong>{unit.name}</strong><div className="muted">{unit.code}</div></td><td>{unit.type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}</td><td>{unit.parent?.name ?? '—'}</td><td>{unit._count.employees} colaboradores · {unit._count.departments} departamentos · {unit._count.userAccess} acessos</td><td><span className={unit.active ? 'status' : 'status status-inactive'}>{unit.active ? 'ATIVA' : 'INATIVA'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(unit)}>Editar</button>{unit.type !== 'HEADQUARTERS' && <button className="btn btn-danger" onClick={() => remove(unit)}>Excluir</button>}</div></td></tr>)}</tbody></table></div>}
      </section>
    </AppShell>
  );
}
