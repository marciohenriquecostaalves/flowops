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
  const [departmentId, setDepartmentId] = useState('');
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
    const response = await fetch(`${API}/employees`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode,
        name,
        ...(email ? { email } : {}),
        ...(departmentId ? { departmentId } : {}),
      }),
    });

    setSaving(false);
    if (!response.ok) {
      setError('Não foi possível cadastrar o colaborador. Verifique se o código já existe.');
      return;
    }

    setEmployeeCode('');
    setName('');
    setEmail('');
    setDepartmentId('');
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
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Novo colaborador</h2>
        <form className="employee-form" onSubmit={submit}>
          <div className="field"><label>Código</label><input required minLength={2} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP-002" /></div>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
          <div className="field"><label>E-mail (opcional)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" /></div>
          <div className="field"><label>Departamento</label><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}><option value="">Sem departamento</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Colaboradores</h2>
        {employees.length === 0 ? <p className="muted">Nenhum colaborador cadastrado.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Código</th><th>Nome</th><th>Departamento</th><th>Status</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td>{employee.employeeCode}</td><td><strong>{employee.name}</strong>{employee.email && <div className="muted">{employee.email}</div>}</td><td>{employee.department?.name ?? '—'}</td><td><span className="status">{employee.status}</span></td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
