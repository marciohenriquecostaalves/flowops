'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';
type User = { id: string; name: string; email: string; status: string; createdAt: string; roles: { role: { name: Role } }[] };
type Audit = { id: string; action: string; entityId: string | null; createdAt: string; metadata: { role?: string; status?: string; employee?: string; employeeCode?: string; activity?: string; units?: number; name?: string } | null; user: { name: string; email: string } | null };
const labels: Record<Role, string> = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', OPERATOR: 'Operador' };
const auditLabels: Record<string, string> = { USER_CREATED: 'Usuário criado', USER_UPDATED: 'Usuário atualizado', USER_PASSWORD_RESET: 'Senha redefinida', SESSION_STARTED: 'Sessão iniciada', SESSION_PAUSED: 'Sessão pausada', SESSION_RESUMED: 'Sessão retomada', SESSION_FINISHED: 'Sessão finalizada', SESSION_UNITS_UPDATED: 'Unidades atualizadas', EMPLOYEE_CREATED: 'Colaborador criado', EMPLOYEE_UPDATED: 'Colaborador atualizado', DEPARTMENT_CREATED: 'Departamento criado', DEPARTMENT_UPDATED: 'Departamento atualizado', DEPARTMENT_DELETED: 'Departamento excluído', SHIFT_CREATED: 'Turno criado', SHIFT_UPDATED: 'Turno atualizado', ACTIVITY_CREATED: 'Atividade criada', ACTIVITY_UPDATED: 'Atividade atualizada', JOB_TITLE_CREATED: 'Cargo criado', JOB_TITLE_UPDATED: 'Cargo atualizado' };

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
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
    const [usersResponse, auditResponse] = await Promise.all([fetch(`${API}/users`, { headers }), fetch(`${API}/users/audit?page=${page}`, { headers })]);
    if (!usersResponse.ok) { setError('Seu perfil não tem permissão para gerir usuários.'); setLoading(false); return; }
    setUsers(await usersResponse.json());
    if (auditResponse.ok) { const data = await auditResponse.json(); setAudit(data.items); setAuditTotal(data.total); setAuditPage(data.page); }
    setLoading(false);
  }
  useEffect(() => { void load(1); }, []);
  function reset() { setName(''); setEmail(''); setPassword(''); setRole('OPERATOR'); setEditing(null); setNewPassword(''); setError(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); const headers = auth(); if (!headers) return router.replace('/');
    setSaving(true); setError(''); setMessage('');
    const response = await fetch(editing ? `${API}/users/${editing.id}` : `${API}/users`, { method: editing ? 'PATCH' : 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { name, email, role } : { name, email, password, role }) });
    setSaving(false);
    if (!response.ok) { setError(`Não foi possível ${editing ? 'atualizar' : 'criar'} o usuário. Confira os dados.`); return; }
    setMessage(editing ? 'Usuário atualizado.' : 'Usuário criado. Oriente a pessoa a trocar a senha no primeiro acesso.'); reset(); await load();
  }
  function edit(user: User) { setEditing(user); setName(user.name); setEmail(user.email); setRole(userRole(user)); setPassword(''); setNewPassword(''); setMessage(''); setError(''); }
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
    <section className="card" style={{ marginBottom: 16 }}><h2>{editing ? 'Editar usuário' : 'Novo usuário'}</h2><p className="muted">Administrador gerencia tudo; Supervisor gerencia a operação; Operador utiliza o painel operacional.</p>
      <form className="users-form" onSubmit={submit}>
        <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
        <div className="field"><label>E-mail</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" /></div>
        {!editing && <div className="field"><label>Senha inicial</label><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>}
        <div className="field"><label>Perfil de acesso</label><select value={role} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(labels) as Role[]).map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></div>
        <div className="form-actions"><button className="btn" disabled={saving} type="submit">{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar usuário'}</button>{editing && <button className="btn btn-secondary" type="button" onClick={reset}>Cancelar</button>}</div>
      </form>
      {editing && <div className="password-reset"><strong>Redefinir senha de {editing.name}</strong><div><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha com 8 caracteres ou mais" /><button className="btn btn-secondary" type="button" onClick={resetPassword}>Redefinir senha</button></div></div>}
      {error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}
    </section>
    <section className="card" style={{ marginBottom: 16 }}><h2>Usuários cadastrados</h2>{users.length === 0 ? <p className="muted">Nenhum usuário cadastrado.</p> : <div className="table-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><div className="muted">{user.email}</div></td><td>{labels[userRole(user)]}</td><td><span className={user.status === 'ACTIVE' ? 'status' : 'status status-muted'}>{user.status === 'ACTIVE' ? 'ATIVO' : user.status}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(user)}>Editar</button><button className="btn btn-danger" onClick={() => toggle(user)}>{user.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>}</section>
    <section className="card"><h2>Auditoria de acessos e operação</h2>{audit.length === 0 ? <p className="muted">As alterações de usuários e as ações operacionais aparecerão aqui.</p> : <><div className="audit-list">{audit.map((item) => <div key={item.id}><div><strong>{auditLabels[item.action] ?? item.action}</strong>{item.metadata?.employee && <span className="audit-actor">{item.metadata.employeeCode} · {item.metadata.employee} · {item.metadata.activity}{item.metadata.units !== undefined ? ` · ${item.metadata.units} un.` : ''}</span>}{item.metadata?.name && <span className="audit-actor">{item.metadata.name}</span>}<span className="audit-actor">por {item.user?.name ?? 'usuário removido'}{item.user?.email ? ` · ${item.user.email}` : ''}</span></div><span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span></div>)}</div><div className="pagination"><button className="btn btn-secondary" type="button" disabled={auditPage === 1} onClick={() => void load(auditPage - 1)}>Anterior</button><span>Página {auditPage} de {Math.max(1, Math.ceil(auditTotal / 10))}</span><button className="btn btn-secondary" type="button" disabled={auditPage >= Math.ceil(auditTotal / 10)} onClick={() => void load(auditPage + 1)}>Próxima</button></div></>}</section>
  </AppShell>;
}
