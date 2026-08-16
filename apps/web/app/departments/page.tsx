'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Department = {
  id: string;
  name: string;
  unit: { id: string; code: string; name: string };
  _count: { employees: number; activities: number };
};
type BusinessUnit = { id: string; code: string; name: string; active: boolean };

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [name, setName] = useState('');
  const [unitId, setUnitId] = useState('');
  const [editing, setEditing] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = () => {
    const token = localStorage.getItem('flowops_access_token');
    const selectedUnitId = localStorage.getItem('flowops_selected_unit_id');
    return token ? { Authorization: `Bearer ${token}`, ...(selectedUnitId ? { 'X-FlowOps-Unit-Id': selectedUnitId } : {}) } : null;
  };

  async function load() {
    const authorization = headers();
    if (!authorization) return router.replace('/');
    const [response, unitsResponse] = await Promise.all([fetch(`${API}/departments`, { headers: authorization }), fetch(`${API}/business-units`, { headers: authorization })]);
    if (!response.ok || !unitsResponse.ok) {
      localStorage.clear();
      return router.replace('/');
    }
    setDepartments(await response.json());
    const nextUnits = await unitsResponse.json();
    setUnits(nextUnits);
    const selectedUnitId = localStorage.getItem('flowops_selected_unit_id');
    if (!unitId && nextUnits[0]) setUnitId(nextUnits.find((unit: BusinessUnit) => unit.id === selectedUnitId)?.id ?? nextUnits[0].id);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');

    setSaving(true);
    setError('');
    const response = await fetch(editing ? `${API}/departments/${editing.id}` : `${API}/departments`, {
      method: editing ? 'PATCH' : 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, unitId }),
    });
    setSaving(false);

    if (!response.ok) {
      setError(`Não foi possível ${editing ? 'atualizar' : 'cadastrar'} o departamento. O nome precisa ser único.`);
      return;
    }

    setName('');
    setUnitId(localStorage.getItem('flowops_selected_unit_id') ?? units[0]?.id ?? '');
    setEditing(null);
    await load();
  }

  function edit(department: Department) {
    setEditing(department);
    setName(department.name);
    setUnitId(department.unit.id);
    setError('');
  }

  async function remove(department: Department) {
    if (!window.confirm(`Excluir o departamento ${department.name}?`)) return;
    const authorization = headers();
    if (!authorization) return router.replace('/');
    setError('');
    const response = await fetch(`${API}/departments/${department.id}`, { method: 'DELETE', headers: authorization });
    if (!response.ok) {
      setError('Não é possível excluir um departamento com colaboradores ou atividades vinculados.');
      return;
    }
    await load();
  }

  if (loading) return <main className="container">Carregando departamentos...</main>;

  return (
    <AppShell title="Departamentos" subtitle="Organize a estrutura que sustenta a operação.">

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>{editing ? 'Editar departamento' : 'Novo departamento'}</h2>
        <form className="compact-form" onSubmit={submit}>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Expedição" /></div>
          <div className="field"><label>Filial</label><select required value={unitId} onChange={(e) => setUnitId(e.target.value)}><option value="">Selecione a filial</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name}</option>)}</select></div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}</button>
            {editing && <button className="btn btn-secondary" type="button" onClick={() => { setEditing(null); setName(''); setUnitId(localStorage.getItem('flowops_selected_unit_id') ?? units[0]?.id ?? ''); }}>Cancelar</button>}
          </div>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Departamentos</h2>
        {departments.length === 0 ? <p className="muted">Nenhum departamento cadastrado.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Departamento</th><th>Filial</th><th>Colaboradores</th><th>Atividades</th><th>Ações</th></tr></thead><tbody>{departments.map((department) => <tr key={department.id}><td><strong>{department.name}</strong></td><td>{department.unit?.code ?? '—'}</td><td>{department._count.employees}</td><td>{department._count.activities}</td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(department)}>Editar</button><button className="btn btn-danger" onClick={() => remove(department)}>Excluir</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </AppShell>
  );
}
