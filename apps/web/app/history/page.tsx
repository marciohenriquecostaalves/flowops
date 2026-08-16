'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const defaultFrom = dateForInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
const defaultTo = dateForInput(new Date());

type Option = { id: string; name: string };
type HistoryItem = {
  id: string;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  productiveSeconds: number;
  pausedSeconds: number;
  units: number;
  employee: { id: string; name: string; employeeCode: string; department: Option | null; shift: { id: string; name: string; startTime: string; endTime: string } | null };
  activity: { id: string; name: string; code: string };
};
type HistoryResponse = { items: HistoryItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

const emptyFilters = { from: defaultFrom, to: defaultTo, departmentId: '', shiftId: '', employeeId: '', activityId: '', status: '' };

export default function HistoryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(emptyFilters);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [shifts, setShifts] = useState<Option[]>([]);
  const [activities, setActivities] = useState<Option[]>([]);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  function auth() {
    const token = localStorage.getItem('flowops_access_token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function load(nextFilters = filters, page = 1) {
    const headers = auth();
    if (!headers) return router.replace('/');
    setLoading(true);
    setError('');
    const query = toQuery(nextFilters, page);
    const [meResponse, historyResponse] = await Promise.all([
      fetch(`${API}/auth/me`, { headers }),
      fetch(`${API}/history/sessions?${query}`, { headers }),
    ]);
    if (meResponse.status === 401 || historyResponse.status === 401) {
      localStorage.clear();
      return router.replace('/');
    }
    if (!historyResponse.ok) {
      setError('Não foi possível carregar o histórico. Verifique seu perfil de acesso.');
      setLoading(false);
      return;
    }

    const me = meResponse.ok ? await meResponse.json() : null;
    const nextRoles = me?.roles ?? [];
    setRoles(nextRoles);
    setHistory(await historyResponse.json());
    setLoading(false);

    if (employees.length === 0 && (nextRoles.includes('ADMIN') || nextRoles.includes('SUPERVISOR'))) {
      await loadOptions(headers);
    }
  }

  async function loadOptions(headers: { Authorization: string }) {
    const [employeeResponse, departmentResponse, shiftResponse, activityResponse] = await Promise.all([
      fetch(`${API}/employees`, { headers }),
      fetch(`${API}/departments`, { headers }),
      fetch(`${API}/shifts`, { headers }),
      fetch(`${API}/activities`, { headers }),
    ]);
    if (employeeResponse.ok) setEmployees(await employeeResponse.json());
    if (departmentResponse.ok) setDepartments(await departmentResponse.json());
    if (shiftResponse.ok) setShifts(await shiftResponse.json());
    if (activityResponse.ok) setActivities(await activityResponse.json());
  }

  useEffect(() => { void load(); }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void load(filters, 1);
  }

  function clear() {
    setFilters(emptyFilters);
    void load(emptyFilters, 1);
  }

  async function exportCsv() {
    const headers = auth();
    if (!headers) return router.replace('/');
    setExporting(true);
    setError('');
    const response = await fetch(`${API}/history/sessions/export?${toQuery(filters, 1)}`, { headers });
    if (!response.ok) {
      setError('Não foi possível exportar o histórico.');
      setExporting(false);
      return;
    }
    const data = await response.json() as { items: HistoryItem[] };
    const rows = [
      ['Colaborador', 'Código', 'Departamento', 'Atividade', 'Início', 'Fim', 'Tempo produtivo', 'Tempo pausado', 'Unidades', 'Status'],
      ...data.items.map((item) => [
        item.employee.name,
        item.employee.employeeCode,
        item.employee.department?.name ?? 'Sem departamento',
        `${item.activity.code} · ${item.activity.name}`,
        formatDateTime(item.startedAt),
        item.endedAt ? formatDateTime(item.endedAt) : 'Em andamento',
        formatDuration(item.productiveSeconds),
        formatDuration(item.pausedSeconds),
        String(item.units),
        statusLabel(item.status),
      ]),
    ];
    const content = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowops-historico-${filters.from}-${filters.to}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    setExporting(false);
  }

  if (loading && !history) return <main className="container">Carregando histórico...</main>;
  const pagination = history?.pagination;
  const isRestricted = roles.includes('OPERATOR') || roles.includes('FOREMAN');

  return <AppShell title="Histórico operacional" subtitle={isRestricted ? 'Consulte os registros disponíveis para o seu perfil.' : 'Consulte sessões, tempos e produtividade da operação.'}>
    <section className="card history-filters" style={{ marginBottom: 16 }}>
      <form className="report-filters" onSubmit={submit}>
        <div className="field"><label>De</label><input required type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></div>
        <div className="field"><label>Até</label><input required type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></div>
        <div className="field"><label>Status</label><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option><option value="RUNNING">Em andamento</option><option value="PAUSED">Pausada</option><option value="COMPLETED">Concluída</option><option value="CANCELLED">Cancelada</option></select></div>
        {!isRestricted && <><div className="field"><label>Departamento</label><select value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}><option value="">Todos</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Turno</label><select value={filters.shiftId} onChange={(event) => setFilters({ ...filters, shiftId: event.target.value })}><option value="">Todos</option>{shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Colaborador</label><select value={filters.employeeId} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}><option value="">Todos</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Atividade</label><select value={filters.activityId} onChange={(event) => setFilters({ ...filters, activityId: event.target.value })}><option value="">Todas</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></>}
        <div className="report-filter-actions"><button className="btn" type="submit" disabled={loading}>{loading ? 'Atualizando...' : 'Aplicar filtros'}</button><button className="btn btn-secondary" type="button" onClick={clear}>Limpar</button></div>
      </form>
      {error && <div className="error">{error}</div>}
    </section>

    <section className="card">
      <div className="report-heading history-heading"><div><h2>Sessões registradas</h2><p className="muted">{pagination?.total ?? 0} registro(s) encontrado(s).</p></div><button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={exporting}>{exporting ? 'Exportando...' : 'Exportar CSV'}</button></div>
      {history?.items.length === 0 ? <p className="muted">Não há sessões para os filtros selecionados.</p> : <div className="table-wrap"><table className="history-table"><thead><tr><th>Colaborador</th><th>Atividade</th><th>Início</th><th>Fim</th><th>Tempos</th><th>Unidades</th><th>Status</th></tr></thead><tbody>{history?.items.map((item) => <tr key={item.id}><td><strong>{item.employee.name}</strong><small>{item.employee.employeeCode} · {item.employee.department?.name ?? 'Sem departamento'}</small></td><td><strong>{item.activity.code}</strong><small>{item.activity.name}</small></td><td>{formatDateTime(item.startedAt)}</td><td>{item.endedAt ? formatDateTime(item.endedAt) : 'Em andamento'}</td><td><strong>{formatDuration(item.productiveSeconds)}</strong><small>pausa {formatDuration(item.pausedSeconds)}</small></td><td>{item.units} un.</td><td><span className={`history-status history-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></td></tr>)}</tbody></table></div>}
      {pagination && <div className="pagination history-pagination"><button className="btn btn-secondary" disabled={pagination.page <= 1 || loading} onClick={() => void load(filters, pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {pagination.totalPages}</span><button className="btn btn-secondary" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => void load(filters, pagination.page + 1)}>Próxima</button></div>}
    </section>
  </AppShell>;
}

function toQuery(filters: typeof emptyFilters, page: number) {
  const query = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  return query;
}

function dateForInput(date: Date) { return date.toISOString().slice(0, 10); }

function formatDateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`; }

function statusLabel(status: HistoryItem['status']) { return ({ RUNNING: 'Em andamento', PAUSED: 'Pausada', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' })[status]; }
