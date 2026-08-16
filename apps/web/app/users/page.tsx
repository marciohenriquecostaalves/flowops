'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'FOREMAN';
type AccessArea = 'dashboard' | 'operations' | 'employees' | 'jobTitles' | 'departments' | 'shifts' | 'activities' | 'reports';
type Employee = { id: string; name: string; employeeCode: string; userId?: string | null };
type User = { id: string; name: string; email: string; status: string; createdAt: string; accessAreas: AccessArea[]; employee: Employee | null; roles: { role: { name: Role } }[] };
type AuditMetadata = { role?: string; status?: string; employee?: string; employeeCode?: string; activity?: string; units?: number; name?: string; before?: Record<string, unknown>; after?: Record<string, unknown> };
type Audit = { id: string; action: string; entityId: string | null; createdAt: string; metadata: AuditMetadata | null; user: { name: string; email: string } | null };
const labels: Record<Role, string> = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', OPERATOR: 'Operador', FOREMAN: 'Encarregado' };
const accessAreaLabels: Record<AccessArea, string> = { dashboard: 'Visão geral', operations: 'Operação', employees: 'Colaboradores', jobTitles: 'Cargos', departments: 'Departamentos', shifts: 'Turnos', activities: 'Atividades', reports: 'Relatórios' };
const allAccessAreas = Object.keys(accessAreaLabels) as AccessArea[];
function defaultAreas(role: Role): AccessArea[] { return role === 'FOREMAN' ? ['dashboard', 'reports'] : role === 'OPERATOR' ? ['dashboard', 'operations'] : [...allAccessAreas]; }
const auditLabels: Record<string, string> = { USER_CREATED: 'Usuário criado', USER_UPDATED: 'Usuário atualizado', USER_PASSWORD_RESET: 'Senha redefinida', USER_ACCESS_REVOKED: 'Acesso cancelado', USER_ACCESS_REACTIVATED: 'Acesso reativado', SESSION_STARTED: 'Sessão iniciada', SESSION_PAUSED: 'Sessão pausada', SESSION_RESUMED: 'Sessão retomada', SESSION_FINISHED: 'Sessão finalizada', SESSION_UNITS_UPDATED: 'Unidades atualizadas', SETTINGS_UPDATED: 'Configurações atualizadas', EMPLOYEE_CREATED: 'Colaborador criado', EMPLOYEE_UPDATED: 'Colaborador atualizado', DEPARTMENT_CREATED: 'Departamento criado', DEPARTMENT_UPDATED: 'Departamento atualizado', DEPARTMENT_DELETED: 'Departamento excluído', SHIFT_CREATED: 'Turno criado', SHIFT_UPDATED: 'Turno atualizado', ACTIVITY_CREATED: 'Atividade criada', ACTIVITY_UPDATED: 'Atividade atualizada', JOB_TITLE_CREATED: 'Cargo criado', JOB_TITLE_UPDATED: 'Cargo atualizado' };

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [employeeId, setEmployeeId] = useState('');
  const [accessAreas, setAccessAreas] = useState<AccessArea[]>(defaultAreas('OPERATOR'));
  const [editing, setEditing] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function auth() { const token = localStorage.getItem('flowops_access_token'); return token ? { Authorization: `Bearer ${token}` } : null; }
  function userRole(user: User) { return user.roles[0]?.role.name ?? 'OPERATOR'; }
  async function load(page = auditPage) {
    const headers = auth(); if (!headers) return router.replace('/');
    const [usersResponse, auditResponse, employeesResponse] = await Promise.all([fetch(`${API}/users`, { headers }), fetch(`${API}/users/audit?page=${page}`, { headers }), fetch(`${API}/employees`, { headers })]);
    if (!usersResponse.ok) { setError('Seu perfil não tem permissão para gerir usuários.'); setLoading(false); return; }
    setUsers(await usersResponse.json());
    if (employeesResponse.ok) setEmployees(await employeesResponse.json());
    if (auditResponse.ok) { const data = await auditResponse.json(); setAudit(data.items); setAuditTotal(data.total); setAuditPage(data.page); }
    setLoading(false);
  }
  useEffect(() => { void load(1); }, []);
  function reset() { setName(''); setEmail(''); setPassword(''); setRole('OPERATOR'); setEmployeeId(''); setAccessAreas(defaultAreas('OPERATOR')); setEditing(null); setNewPassword(''); setError(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); const headers = auth(); if (!headers) return router.replace('/');
    setSaving(true); setError(''); setMessage('');
    const response = await fetch(editing ? `${API}/users/${editing.id}` : `${API}/users`, { method: editing ? 'PATCH' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { name, email, role, employeeId, accessAreas } : { name, email, password, role, employeeId }) });
    setSaving(false);
    if (!response.ok) { setError(`Não foi possível ${editing ? 'atualizar' : 'criar'} o usuário. Confira os dados.`); return; }
    setMessage(editing ? 'Usuário atualizado.' : 'Usuário criado. Oriente a pessoa a trocar a senha no primeiro acesso.'); reset(); await load();
  }
  function edit(user: User) { const selectedRole = userRole(user); setEditing(user); setName(user.name); setEmail(user.email); setRole(selectedRole); setEmployeeId(user.employee?.id ?? ''); setAccessAreas(user.accessAreas?.length ? user.accessAreas : defaultAreas(selectedRole)); setPassword(''); setNewPassword(''); setMessage(''); setError(''); }
  async function toggle(user: User) {
    const headers = auth(); if (!headers) return router.replace('/');
    const response = await fetch(`${API}/users/${user.id}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }) });
    if (!response.ok) { setError('Não foi possível alterar o status. A empresa precisa manter ao menos um administrador ativo.'); return; }
    await load();
  }
  async function resetPassword() {
    if (!editing || newPassword.length < 8) { setError('Informe uma nova senha com pelo menos 8 caracteres.'); return; }
    const headers = auth(); if (!headers) return router.replace('/');
    const response = await fetch(`${API}/users/${editing.id}/password`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword }) });
    if (!response.ok) { setError('Não foi possível redefinir a senha.'); return; }
    setNewPassword(''); setMessage('Senha redefinida. As sessões anteriores desse usuário foram encerradas.'); await load();
  }

  if (loading) return <main className="container">Carregando usuários...</main>;
  return <AppShell title="Usuários e acessos" subtitle="Defina quem entra no sistema e o nível de acesso de cada pessoa.">
    <section className="card" style={{ marginBottom: 16 }}><h2>{editing ? 'Editar usuário' : 'Novo usuário'}</h2><p className="muted">Administrador gerencia tudo; Supervisor gerencia a operação; Encarregado acompanha indicadores e relatórios do seu departamento; Operador utiliza o painel operacional.</p>
      <form className="users-form" onSubmit={submit}>
        <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
        <div className="field"><label>E-mail</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" /></div>
        {!editing && <div className="field"><label>Senha inicial</label><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>}
        <div className="field"><label>Perfil de acesso</label><select value={role} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(labels) as Role[]).map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></div>
        <div className="field"><label>Colaborador vinculado {role === 'OPERATOR' || role === 'FOREMAN' ? '(obrigatório)' : '(opcional)'}</label><select required={role === 'OPERATOR' || role === 'FOREMAN'} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}><option value="">Selecione</option>{employees.filter((employee) => !employee.userId || employee.id === editing?.employee?.id).map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.name}</option>)}</select></div>
        {editing && role !== 'ADMIN' && <div className="access-areas"><strong>Áreas liberadas para este usuário</strong><p className="muted">Selecione os menus que poderão aparecer para ele.</p><div className="access-area-grid">{allAccessAreas.map((area) => <label className="access-area-option" key={area}><input type="checkbox" checked={accessAreas.includes(area)} onChange={(e) => setAccessAreas(e.target.checked ? [...accessAreas, area] : accessAreas.filter((item) => item !== area))} />{accessAreaLabels[area]}</label>)}</div></div>}
        {editing && role === 'ADMIN' && <p className="muted">Administradores possuem acesso completo ao sistema.</p>}
        <div className="form-actions"><button className="btn" disabled={saving} type="submit">{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar usuário'}</button>{editing && <button className="btn btn-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
      </form>
      {editing && <div className="password-reset"><strong>Redefinir senha de {editing.name}</strong><div><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha com 8 caracteres ou mais" /><button className="btn btn-secondary" type="button" onClick={resetPassword}>Redefinir senha</button></div></div>}
      {error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}
    </section>
    <section className="card" style={{ marginBottom: 16 }}><h2>Usuários com acesso</h2>{users.length === 0 ? <p className="muted">Nenhum usuário com acesso ativo.</p> : <div className="table-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Colaborador</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><div className="muted">{user.email}</div></td><td>{labels[userRole(user)]}</td><td>{user.employee ? `${user.employee.employeeCode} · ${user.employee.name}` : '—'}</td><td><span className="status">ATIVO</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(user)}>Editar</button><button className="btn btn-danger" onClick={() => toggle(user)}>Suspender</button></div></td></tr>)}</tbody></table></div>}</section>
    <section className="card"><h2>Auditoria de acessos e operação</h2>{audit.length === 0 ? <p className="muted">As alterações de usuários e as ações operacionais aparecerão aqui.</p> : <><div className="audit-list">{audit.map((item) => <div key={item.id}><div><strong>{auditLabels[item.action] ?? item.action}</strong>{item.metadata?.employee && <span className="audit-actor">{item.metadata.employeeCode} · {item.metadata.employee} · {item.metadata.activity}{item.metadata.units !== undefined ? ` · ${item.metadata.units} un.` : ''}</span>}{item.metadata?.name && <span className="audit-actor">{item.metadata.name}</span>}{formatChanges(item.metadata) && <span className="audit-change">{formatChanges(item.metadata)}</span>}<span className="audit-actor">por {item.user?.name ?? 'usuário removido'}{item.user?.email ? ` · ${item.user.email}` : ''}</span></div><span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span></div>)}</div><div className="pagination"><button className="btn btn-secondary" type="button" disabled={auditPage === 1} onClick={() => void load(auditPage - 1)}>Anterior</button><span>Página {auditPage} de {Math.max(1, Math.ceil(auditTotal / 10))}</span><button className="btn btn-secondary" type="button" disabled={auditPage >= Math.ceil(auditTotal / 10)} onClick={() => void load(auditPage + 1)}>Próxima</button></div></>}</section>
  </AppShell>;
}

function formatChanges(metadata: AuditMetadata | null) {
  if (!metadata?.before && !metadata?.after) return '';
  const keys = new Set([...Object.keys(metadata.before ?? {}), ...Object.keys(metadata.after ?? {})]);
  return `Alterações: ${Array.from(keys).map((key) => `${key}: ${formatAuditValue(metadata.before?.[key])} → ${formatAuditValue(metadata.after?.[key])}`).join(' · ')}`;
}

function formatAuditValue(value: unknown) {
  if (value === undefined) return '—';
  if (value === null) return 'vazio';
  if (Array.isArray(value)) return value.join(', ') || 'vazio';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
