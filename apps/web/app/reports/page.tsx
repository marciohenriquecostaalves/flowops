'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type Option = { id: string; name: string };
type Shift = Option & { startTime: string; endTime: string };
type Employee = Option & { employeeCode: string };
type Row = { id: string; label: string; detail: string; sessions: number; units: number; productiveSeconds: number; productivity: number | null; targetUnits: number; achievementPercent: number | null };
type Report = { summary: Omit<Row, 'id' | 'label' | 'detail'>; byEmployee: Row[]; byDepartment: Row[]; byActivity: Row[] };

function dateForInput(date: Date) { return date.toISOString().slice(0, 10); }
const defaultFrom = dateForInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
const defaultTo = dateForInput(new Date());

export default function ReportsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]); const [departments, setDepartments] = useState<Option[]>([]); const [shifts, setShifts] = useState<Shift[]>([]); const [activities, setActivities] = useState<Option[]>([]);
  const [filters, setFilters] = useState({ from: defaultFrom, to: defaultTo, employeeId: '', departmentId: '', shiftId: '', activityId: '' });
  const [report, setReport] = useState<Report | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  function auth() { const token = localStorage.getItem('flowops_access_token'); return token ? { Authorization: `Bearer ${token}` } : null; }
  async function load(nextFilters = filters) {
    const headers = auth(); if (!headers) return router.replace('/');
    setLoading(true); setError('');
    const query = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
    const [employeeResponse, departmentResponse, shiftResponse, activityResponse, reportResponse] = await Promise.all([
      fetch(`${API}/employees`, { headers }), fetch(`${API}/departments`, { headers }), fetch(`${API}/shifts`, { headers }), fetch(`${API}/activities`, { headers }), fetch(`${API}/reports/productivity?${query}`, { headers }),
    ]);
    if (!reportResponse.ok) { setError('Não foi possível carregar o relatório. Verifique seu perfil de acesso.'); setLoading(false); return; }
    if (employeeResponse.ok) setEmployees(await employeeResponse.json());
    if (departmentResponse.ok) setDepartments(await departmentResponse.json());
    if (shiftResponse.ok) setShifts(await shiftResponse.json());
    if (activityResponse.ok) setActivities(await activityResponse.json());
    setReport(await reportResponse.json()); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  function submit(event: FormEvent) { event.preventDefault(); void load(); }
  function clear() { const clean = { from: defaultFrom, to: defaultTo, employeeId: '', departmentId: '', shiftId: '', activityId: '' }; setFilters(clean); void load(clean); }
  const maximum = useMemo(() => Math.max(1, ...(report?.byEmployee.map((row) => row.productivity ?? 0) ?? [1])), [report]);
  function exportCsv() {
    if (!report) return;
    const rows = [['Colaborador', 'Departamento', 'Sessões', 'Unidades', 'Produtividade por hora', 'Meta atingida (%)'], ...report.byEmployee.map((row) => [row.label, row.detail, String(row.sessions), String(row.units), row.productivity?.toFixed(1) ?? 'Em apuração', row.achievementPercent?.toFixed(1) ?? ''])];
    const content = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `flowops-relatorio-${filters.from}-${filters.to}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  if (loading && !report) return <main className="container">Carregando relatórios...</main>;
  const summary = report?.summary;
  return <AppShell title="Relatórios de produtividade" subtitle="Acompanhe resultados, metas e desempenho por equipe.">
    <section className="card" style={{ marginBottom: 16 }}><form className="report-filters" onSubmit={submit}><div className="field"><label>De</label><input required type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div><div className="field"><label>Até</label><input required type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div><div className="field"><label>Departamento</label><select value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}><option value="">Todos</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Turno</label><select value={filters.shiftId} onChange={(e) => setFilters({ ...filters, shiftId: e.target.value })}><option value="">Todos</option>{shifts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.startTime}–{item.endTime}</option>)}</select></div><div className="field"><label>Colaborador</label><select value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}><option value="">Todos</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} · {item.name}</option>)}</select></div><div className="field"><label>Atividade</label><select value={filters.activityId} onChange={(e) => setFilters({ ...filters, activityId: e.target.value })}><option value="">Todas</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="report-filter-actions"><button className="btn" type="submit" disabled={loading}>{loading ? 'Atualizando...' : 'Aplicar filtros'}</button><button className="btn btn-secondary" type="button" onClick={clear}>Limpar</button></div></form>{error && <div className="error">{error}</div>}</section>
    {summary && <><section className="grid grid-4" style={{ marginBottom: 16 }}><Kpi title="Sessões concluídas" value={String(summary.sessions)} /><Kpi title="Unidades produzidas" value={String(summary.units)} /><Kpi title="Produtividade média" value={summary.productivity === null ? 'Em apuração' : `${summary.productivity.toFixed(1)}/h`} /><Kpi title="Meta atingida" value={summary.achievementPercent === null ? '—' : `${summary.achievementPercent.toFixed(1)}%`} /></section>
    <section className="report-grid"><section className="card"><div className="report-heading"><div><h2>Ranking de colaboradores</h2><p className="muted">A produtividade é consolidada após 15 minutos produtivos.</p></div><button className="btn btn-secondary" type="button" onClick={exportCsv}>Exportar CSV</button></div>{report.byEmployee.length === 0 ? <p className="muted">Não há sessões concluídas para esses filtros.</p> : <div className="report-bars">{report.byEmployee.map((row, index) => <div key={row.id} className="report-bar-row"><span className="report-position">{index + 1}</span><div className="report-bar-content"><div><strong>{row.label}</strong><span>{row.detail} · {formatDuration(row.productiveSeconds)}</span></div><div className="report-bar"><i style={{ width: `${((row.productivity ?? 0) / maximum) * 100}%` }} /></div></div><strong>{row.productivity === null ? 'Em apuração' : `${row.productivity.toFixed(1)}/h`}</strong></div>)}</div>}</section>
    <section className="card"><h2>Desempenho por departamento</h2>{report.byDepartment.length === 0 ? <p className="muted">Sem dados no período.</p> : <div className="report-list">{report.byDepartment.map((row) => <div key={row.id}><strong>{row.label}</strong><span>{row.units} un. · {row.productivity === null ? 'Em apuração' : `${row.productivity.toFixed(1)}/h`}</span></div>)}</div>}<h2 className="report-section-title">Atividades</h2>{report.byActivity.length === 0 ? <p className="muted">Sem dados no período.</p> : <div className="report-list">{report.byActivity.map((row) => <div key={row.id}><strong>{row.label}</strong><span>{row.units} un. · {row.productivity === null ? 'Em apuração' : `${row.productivity.toFixed(1)}/h`}</span></div>)}</div>}</section></section></>}
  </AppShell>;
}

function Kpi({ title, value }: { title: string; value: string }) { return <div className="card"><div className="muted">{title}</div><div className="kpi">{value}</div></div>; }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} h`; }
