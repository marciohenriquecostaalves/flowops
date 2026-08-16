'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  active: boolean;
  unit: { id: string; code: string; name: string };
  _count: { employees: number };
};
type BusinessUnit = { id: string; code: string; name: string; active: boolean };

export default function ShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [toleranceMinutes, setToleranceMinutes] = useState('0');
  const [editing, setEditing] = useState<Shift | null>(null);
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
    const [response, unitsResponse] = await Promise.all([fetch(`${API}/shifts`, { headers: authorization }), fetch(`${API}/business-units`, { headers: authorization })]);
    if (!response.ok || !unitsResponse.ok) {
      localStorage.clear();
      return router.replace('/');
    }
    setShifts(await response.json());
    const nextUnits = await unitsResponse.json();
    setUnits(nextUnits);
    if (!unitId && nextUnits[0]) setUnitId(nextUnits[0].id);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');
    setSaving(true);
    setError('');

    const response = await fetch(editing ? `${API}/shifts/${editing.id}` : `${API}/shifts`, {
      method: editing ? 'PATCH' : 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startTime, endTime, toleranceMinutes: Number(toleranceMinutes), unitId }),
    });
    setSaving(false);

    if (!response.ok) {
      setError(`Não foi possível ${editing ? 'atualizar' : 'cadastrar'} o turno. Verifique os horários e o nome informado.`);
      return;
    }

    setName('');
    setStartTime('08:00');
    setEndTime('17:00');
    setToleranceMinutes('0');
    setUnitId(units[0]?.id ?? '');
    setEditing(null);
    await load();
  }

  function edit(shift: Shift) {
    setEditing(shift);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setToleranceMinutes(String(shift.toleranceMinutes));
    setUnitId(shift.unit.id);
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setName('');
    setStartTime('08:00');
    setEndTime('17:00');
    setToleranceMinutes('0');
    setUnitId(units[0]?.id ?? '');
  }

  async function toggleActive(shift: Shift) {
    const authorization = headers();
    if (!authorization) return router.replace('/');
    setError('');
    const response = await fetch(`${API}/shifts/${shift.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !shift.active }),
    });
    if (!response.ok) {
      setError('Não foi possível alterar o status do turno.');
      return;
    }
    await load();
  }

  if (loading) return <main className="container">Carregando turnos...</main>;

  return (
    <AppShell title="Turnos e jornadas" subtitle="Defina horários e tolerâncias para a equipe.">

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>{editing ? 'Editar turno' : 'Novo turno'}</h2>
        <form className="shift-form" onSubmit={submit}>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Turno da manhã" /></div>
          <div className="field"><label>Início</label><input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div className="field"><label>Fim</label><input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          <div className="field"><label>Tolerância (min.)</label><input required type="number" min="0" max="180" value={toleranceMinutes} onChange={(e) => setToleranceMinutes(e.target.value)} /></div>
          <div className="field"><label>Filial</label><select required value={unitId} onChange={(e) => setUnitId(e.target.value)}><option value="">Selecione a filial</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name}</option>)}</select></div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}</button>
            {editing && <button className="btn btn-secondary" type="button" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Turnos cadastrados</h2>
        {shifts.length === 0 ? <p className="muted">Nenhum turno cadastrado.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Turno</th><th>Filial</th><th>Horário</th><th>Tolerância</th><th>Colaboradores</th><th>Status</th><th>Ações</th></tr></thead><tbody>{shifts.map((shift) => <tr key={shift.id}><td><strong>{shift.name}</strong></td><td>{shift.unit?.code ?? '—'}</td><td>{shift.startTime} – {shift.endTime}</td><td>{shift.toleranceMinutes} min.</td><td>{shift._count.employees}</td><td><span className={shift.active ? 'status' : 'status status-muted'}>{shift.active ? 'ATIVO' : 'INATIVO'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(shift)}>Editar</button><button className="btn btn-danger" onClick={() => toggleActive(shift)}>{shift.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </AppShell>
  );
}
