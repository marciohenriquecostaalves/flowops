'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Department = { id: string; name: string };
type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  photoData: string | null;
  status: string;
  department: Department | null;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [editing, setEditing] = useState<Employee | null>(null);
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

    const [employeesResponse, departmentsResponse] = await Promise.all([
      fetch(`${API}/employees`, { headers: authorization }),
      fetch(`${API}/departments`, { headers: authorization }),
    ]);

    if (!employeesResponse.ok || !departmentsResponse.ok) {
      localStorage.clear();
      return router.replace('/');
    }

    setEmployees(await employeesResponse.json());
    setDepartments(await departmentsResponse.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');

    setSaving(true);
    setError('');
    const form = new FormData();
    form.append('name', name);
    if (email) form.append('email', email);
    if (jobTitle) form.append('jobTitle', jobTitle);
    if (departmentId) form.append('departmentId', departmentId);
    if (!editing) form.append('employeeCode', employeeCode);
    if (editing) form.append('status', status);
    if (photo) form.append('photo', photo);

    const response = await fetch(editing ? `${API}/employees/${editing.id}` : `${API}/employees`, {
      method: editing ? 'PATCH' : 'POST',
      headers: authorization,
      body: form,
    });

    setSaving(false);
    if (!response.ok) {
      setError(`Não foi possível ${editing ? 'atualizar' : 'cadastrar'} o colaborador. Verifique os dados informados.`);
      return;
    }

    setEmployeeCode('');
    setName('');
    setEmail('');
    setJobTitle('');
    setPhoto(null);
    setDepartmentId('');
    setStatus('ACTIVE');
    setEditing(null);
    await load();
  }

  function edit(employee: Employee) {
    setEditing(employee);
    setEmployeeCode(employee.employeeCode);
    setName(employee.name);
    setEmail(employee.email ?? '');
    setJobTitle(employee.jobTitle ?? '');
    setPhoto(null);
    setDepartmentId(employee.department?.id ?? '');
    setStatus(employee.status);
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setEmployeeCode('');
    setName('');
    setEmail('');
    setJobTitle('');
    setPhoto(null);
    setDepartmentId('');
    setStatus('ACTIVE');
  }

  async function toggleStatus(employee: Employee) {
    const authorization = headers();
    if (!authorization) return router.replace('/');
    setError('');
    const response = await fetch(`${API}/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    });
    if (!response.ok) {
      setError('Não foi possível alterar o status do colaborador.');
      return;
    }
    await load();
  }

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  if (loading) return <main className="container">Carregando colaboradores...</main>;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="logo">FlowOps</div>
          <div className="muted">Gestão de colaboradores</div>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/dashboard">Dashboard</Link>
          <Link className="btn btn-secondary" href="/departments">Departamentos</Link>
          <Link className="btn btn-secondary" href="/shifts">Turnos</Link>
          <Link className="btn btn-secondary" href="/activities">Atividades</Link>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>{editing ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        <form className="employee-form" onSubmit={submit}>
          <div className="field"><label>Código</label><input required minLength={2} disabled={Boolean(editing)} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP-002" /></div>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
          <div className="field"><label>Cargo</label><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex.: Operador logístico" /></div>
          <div className="field"><label>E-mail (opcional)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" /></div>
          <div className="field"><label>Departamento</label><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}><option value="">Sem departamento</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <div className="field"><label>Foto (JPG, PNG ou WebP)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div>
          {editing && <div className="field"><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option><option value="TERMINATED">Desligado</option></select></div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}</button>
            {editing && <button className="btn btn-secondary" type="button" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Colaboradores</h2>
        {employees.length === 0 ? <p className="muted">Nenhum colaborador cadastrado.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Colaborador</th><th>Código</th><th>Departamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><div className="employee-summary">{employee.photoData ? <img className="avatar" src={employee.photoData} alt={`Foto de ${employee.name}`} /> : <span className="avatar avatar-placeholder">{employee.name.slice(0, 1)}</span>}<div><strong>{employee.name}</strong>{employee.jobTitle && <div className="muted">{employee.jobTitle}</div>}{employee.email && <div className="muted">{employee.email}</div>}</div></div></td><td>{employee.employeeCode}</td><td>{employee.department?.name ?? '—'}</td><td><span className={employee.status === 'ACTIVE' ? 'status' : 'status status-muted'}>{employee.status}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => edit(employee)}>Editar</button><button className="btn btn-danger" onClick={() => toggleStatus(employee)}>{employee.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
