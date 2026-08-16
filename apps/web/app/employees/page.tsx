'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function emailAliasPreview(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? 'colaborador';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  return `${firstName}${lastName ? `.${lastName}` : ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9.]+/g, '').replace(/^\.|\.$/g, '') || 'colaborador';
}

type Department = { id: string; name: string };
type Shift = { id: string; name: string; startTime: string; endTime: string; active: boolean };
type JobTitle = { id: string; name: string; active: boolean };
type EmailConfig = { usesOwnEmailDomain: boolean; emailDomain: string | null };
type Employee = {
  id: string;
  employeeCode: string;
  badgeCode: string | null;
  name: string;
  email: string | null;
  corporateEmail: boolean;
  jobTitle: string | null;
  jobTitleId: string | null;
  jobTitleRef: JobTitle | null;
  photoData: string | null;
  status: string;
  department: Department | null;
  shift: Shift | null;
  userId: string | null;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({ usesOwnEmailDomain: false, emailDomain: null });
  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [corporateEmail, setCorporateEmail] = useState(false);
  const [jobTitleId, setJobTitleId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accessEmployee, setAccessEmployee] = useState<Employee | null>(null);
  const [qrEmployee, setQrEmployee] = useState<Employee | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [accessEmail, setAccessEmail] = useState(''); const [accessPassword, setAccessPassword] = useState(''); const [accessRole, setAccessRole] = useState('OPERATOR'); const [isAdmin, setIsAdmin] = useState(false);

  const headers = () => {
    const token = localStorage.getItem('flowops_access_token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  async function load() {
    const authorization = headers();
    if (!authorization) return router.replace('/');

    const [employeesResponse, departmentsResponse, shiftsResponse, jobTitlesResponse, emailConfigResponse] = await Promise.all([
      fetch(`${API}/employees`, { headers: authorization }),
      fetch(`${API}/departments`, { headers: authorization }),
      fetch(`${API}/shifts`, { headers: authorization }),
      fetch(`${API}/job-titles`, { headers: authorization }),
      fetch(`${API}/settings/email-domain`, { headers: authorization }),
    ]);

    if (!employeesResponse.ok || !departmentsResponse.ok || !shiftsResponse.ok || !jobTitlesResponse.ok || !emailConfigResponse.ok) {
      localStorage.clear();
      return router.replace('/');
    }

    setEmployees(await employeesResponse.json());
    setDepartments(await departmentsResponse.json());
    setShifts((await shiftsResponse.json()).filter((shift: Shift) => shift.active));
    setJobTitles((await jobTitlesResponse.json()).filter((jobTitle: JobTitle) => jobTitle.active));
    setEmailConfig(await emailConfigResponse.json());
    const me = await fetch(`${API}/auth/me`, { headers: authorization }); if (me.ok) setIsAdmin((await me.json()).roles.includes('ADMIN'));
    setLoading(false);
  }

  async function provisionAccess() { const authorization = headers(); if (!accessEmployee || !authorization || accessPassword.length < 8) return setError('Informe uma senha com pelo menos 8 caracteres.'); const response = await fetch(`${API}/employees/${accessEmployee.id}/access`, { method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: accessEmail, password: accessPassword, role: accessRole }) }); if (!response.ok) return setError('Não foi possível criar o acesso.'); setAccessEmployee(null); setAccessPassword(''); await load(); }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl('');
    if (!qrEmployee?.badgeCode) return () => undefined;
    void QRCode.toDataURL(qrEmployee.badgeCode, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#142033', light: '#ffffff' },
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (!cancelled) setError('Não foi possível gerar a etiqueta QR.');
    });
    return () => { cancelled = true; };
  }, [qrEmployee]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization) return router.replace('/');

    setSaving(true);
    setError('');
    const form = new FormData();
    form.append('name', name);
    form.append('corporateEmail', String(corporateEmail));
    if (!corporateEmail && email) form.append('email', email);
    if (jobTitleId || editing) form.append('jobTitleId', jobTitleId);
    if (departmentId || editing) form.append('departmentId', departmentId);
    if (shiftId || editing) form.append('shiftId', shiftId);
    if (!editing && employeeCode.trim()) form.append('employeeCode', employeeCode.trim());
    if (editing) form.append('status', status);
    if (photo) form.append('photo', photo);

    const response = await fetch(editing ? `${API}/employees/${editing.id}` : `${API}/employees`, {
      method: editing ? 'PATCH' : 'POST',
      headers: authorization,
      body: form,
    });

    setSaving(false);
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      const message = Array.isArray(details?.message) ? details.message.join('. ') : details?.message;
      setError(message || `Não foi possível ${editing ? 'atualizar' : 'cadastrar'} o colaborador. Verifique os dados informados.`);
      return;
    }

    setEmployeeCode('');
    setName('');
    setEmail('');
    setCorporateEmail(false);
    setJobTitleId('');
    setPhoto(null);
    setDepartmentId('');
    setShiftId('');
    setStatus('ACTIVE');
    setEditing(null);
    await load();
  }

  function edit(employee: Employee) {
    setEditing(employee);
    setEmployeeCode(employee.employeeCode);
    setName(employee.name);
    setEmail(employee.email ?? '');
    setCorporateEmail(Boolean(employee.corporateEmail));
    setJobTitleId(employee.jobTitleId ?? '');
    setPhoto(null);
    setDepartmentId(employee.department?.id ?? '');
    setShiftId(employee.shift?.id ?? '');
    setStatus(employee.status);
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setEmployeeCode('');
    setName('');
    setEmail('');
    setCorporateEmail(false);
    setJobTitleId('');
    setPhoto(null);
    setDepartmentId('');
    setShiftId('');
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

  if (loading) return <main className="container">Carregando colaboradores...</main>;

  return (
    <AppShell title="Colaboradores" subtitle="Cadastre e mantenha atualizada a equipe operacional.">

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>{editing ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        <form className="employee-form" onSubmit={submit}>
          <div className="field"><label>Código (automático)</label><input disabled value={employeeCode} placeholder="Gerado automaticamente" /></div>
          <div className="field"><label>Nome</label><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
          <div className="field"><label>Crachá (automático)</label><input disabled value={editing ? (editing.badgeCode ?? 'Não atribuído') : 'Gerado automaticamente após o cadastro'} /></div>
          <div className="field"><label>Cargo</label><select value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)}><option value="">Sem cargo definido</option>{jobTitles.map((jobTitle) => <option key={jobTitle.id} value={jobTitle.id}>{jobTitle.name}</option>)}</select></div>
          <div className="field"><label>{corporateEmail ? 'E-mail corporativo' : 'E-mail (opcional)'}</label>{corporateEmail ? <div className="generated-email">{email || `${emailAliasPreview(name)}@${emailConfig.emailDomain ?? 'dominio.com'}`}</div> : <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" />}</div>
          <div className="field checkbox-field"><label><input type="checkbox" checked={corporateEmail} disabled={!emailConfig.usesOwnEmailDomain && !corporateEmail} onChange={(e) => { setCorporateEmail(e.target.checked); if (e.target.checked) setEmail(''); }} /> Colaborador terá e-mail corporativo</label>{!emailConfig.usesOwnEmailDomain && <small>Configure um domínio próprio nas configurações da empresa.</small>}</div>
          <div className="field"><label>Departamento</label><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}><option value="">Sem departamento</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <div className="field"><label>Turno</label><select value={shiftId} onChange={(e) => setShiftId(e.target.value)}><option value="">Sem turno definido</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} · {shift.startTime}–{shift.endTime}</option>)}</select></div>
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
          <div className="table-wrap"><table><thead><tr><th>Colaborador</th><th>Código</th><th>Crachá</th><th>Departamento</th><th>Turno</th><th>Status</th><th>Ações</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><div className="employee-summary">{employee.photoData ? <img className="avatar" src={employee.photoData} alt={`Foto de ${employee.name}`} /> : <span className="avatar avatar-placeholder">{employee.name.slice(0, 1)}</span>}<div><strong>{employee.name}</strong>{employee.jobTitle && <div className="muted">{employee.jobTitle}</div>}</div></div></td><td>{employee.employeeCode}</td><td>{employee.badgeCode ?? '—'}</td><td>{employee.department?.name ?? '—'}</td><td>{employee.shift?.name ?? '—'}</td><td><span className={employee.status === 'ACTIVE' ? 'status' : 'status status-inactive'}>{employee.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}</span></td><td><div className="row-actions">{employee.badgeCode && <button className="btn btn-secondary" onClick={() => setQrEmployee(employee)}>Etiqueta QR</button>}{isAdmin && !employee.userId && <button className="btn btn-secondary" onClick={() => { setAccessEmployee(employee); setAccessEmail(employee.email ?? ''); }}>Conceder acesso</button>}{isAdmin && employee.userId && <button className="btn btn-danger" onClick={async () => { if (!window.confirm(`Cancelar o acesso de ${employee.name}?`)) return; const authorization = headers(); if (authorization) { await fetch(`${API}/employees/${employee.id}/access`, { method: 'DELETE', headers: authorization }); await load(); } }}>Cancelar acesso</button>}<button className="btn btn-secondary" onClick={() => edit(employee)}>Editar</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
      {accessEmployee && <div className="modal-backdrop"><section className="card access-modal"><h2>Conceder acesso</h2><p>{accessEmployee.name}</p><input type="email" value={accessEmail} onChange={(e) => setAccessEmail(e.target.value)} placeholder="E-mail" /><select value={accessRole} onChange={(e) => setAccessRole(e.target.value)}><option value="OPERATOR">Operador</option><option value="SUPERVISOR">Supervisor</option><option value="FOREMAN">Encarregado</option></select><input type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Senha inicial" /><div className="form-actions"><button className="btn" onClick={provisionAccess}>Criar acesso</button><button className="btn btn-secondary" onClick={() => setAccessEmployee(null)}>Cancelar</button></div></section></div>}
      {qrEmployee && <div className="modal-backdrop"><section className="card qr-modal qr-printable"><div className="qr-label"><p className="qr-label-brand">FLOWOPS</p><h2>{qrEmployee.name}</h2><p className="muted">Crachá de produção</p>{qrDataUrl ? <img className="qr-code" src={qrDataUrl} alt={`QR Code do crachá ${qrEmployee.badgeCode}`} /> : <p className="muted">Gerando QR Code...</p>}<strong className="qr-badge-code">{qrEmployee.badgeCode}</strong></div><div className="form-actions qr-modal-actions"><button className="btn" onClick={() => window.print()}>Imprimir etiqueta</button><button className="btn btn-secondary" onClick={() => setQrEmployee(null)}>Fechar</button></div></section></div>}
    </AppShell>
  );
}
