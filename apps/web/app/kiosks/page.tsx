'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Activity = { id: string; name: string; code: string; status?: string };
type Kiosk = { id: string; name: string; code: string; active: boolean; activity: Activity };

export default function KiosksPage() {
  const router = useRouter();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState('');
  const [activityId, setActivityId] = useState('');
  const [tokenResult, setTokenResult] = useState<{ name: string; code: string; token: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  function headers() {
    const token = localStorage.getItem('flowops_access_token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function load() {
    const authorization = headers();
    if (!authorization) return router.replace('/');
    const [kiosksResponse, activitiesResponse] = await Promise.all([
      fetch(`${API}/kiosk/devices`, { headers: authorization }),
      fetch(`${API}/activities`, { headers: authorization }),
    ]);
    if (!kiosksResponse.ok || !activitiesResponse.ok) return router.replace('/dashboard');
    setKiosks(await kiosksResponse.json());
    setActivities((await activitiesResponse.json()).filter((item: Activity) => item.status !== 'INACTIVE'));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    const authorization = headers();
    if (!authorization || !name.trim() || !activityId) return;
    setError('');
    setMessage('');
    const response = await fetch(`${API}/kiosk/devices`, {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), activityId }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(Array.isArray(body?.message) ? body.message.join('. ') : body?.message || 'Não foi possível criar o quiosque.');
      return;
    }
    setName('');
    setActivityId('');
    setTokenResult({ name: body.name, code: body.code, token: body.token });
    await load();
  }

  async function toggle(kiosk: Kiosk) {
    const authorization = headers();
    if (!authorization) return;
    setError('');
    const response = await fetch(`${API}/kiosk/devices/${kiosk.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !kiosk.active }),
    });
    if (!response.ok) return setError('Não foi possível alterar o status do quiosque.');
    setMessage(kiosk.active ? 'Quiosque desativado.' : 'Quiosque ativado.');
    await load();
  }

  async function rotateToken(kiosk: Kiosk) {
    if (!window.confirm(`Gerar um novo token para ${kiosk.name}? O token atual deixará de funcionar imediatamente.`)) return;
    const authorization = headers();
    if (!authorization) return;
    setError('');
    setMessage('');
    const response = await fetch(`${API}/kiosk/devices/${kiosk.id}/token`, {
      method: 'POST',
      headers: authorization,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || 'Não foi possível gerar um novo token.');
      return;
    }
    setTokenResult({ name: body.name, code: body.code, token: body.token });
    setMessage('Novo token gerado. Reconfigure o aparelho do quiosque.');
  }

  async function copyToken() {
    if (!tokenResult) return;
    await navigator.clipboard?.writeText(tokenResult.token);
    setMessage('Token copiado. Guarde-o em local seguro.');
  }

  if (loading) return <main className="container">Carregando quiosques...</main>;

  return (
    <AppShell title="Quiosques" subtitle="Configure os pontos de registro de produção por crachá.">
      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Novo quiosque</h2>
        <p className="muted">Cada quiosque fica vinculado a uma atividade. O colaborador só precisa aproximar ou escanear o crachá.</p>
        <form className="compact-form" onSubmit={create}>
          <div className="field"><label>Nome do quiosque</label><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Estação de separação 01" /></div>
          <div className="field"><label>Atividade da estação</label><select required value={activityId} onChange={(event) => setActivityId(event.target.value)}><option value="">Selecione uma atividade</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} · {activity.name}</option>)}</select></div>
          <button className="btn" type="submit">Criar quiosque</button>
        </form>
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
      </section>

      <section className="card">
        <h2>Quiosques cadastrados</h2>
        {kiosks.length === 0 ? <p className="muted">Nenhum quiosque cadastrado.</p> : <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Código</th><th>Atividade</th><th>Status</th><th>Ações</th></tr></thead><tbody>{kiosks.map((kiosk) => <tr key={kiosk.id}><td><strong>{kiosk.name}</strong></td><td>{kiosk.code}</td><td>{kiosk.activity.code} · {kiosk.activity.name}</td><td><span className={kiosk.active ? 'status' : 'status status-inactive'}>{kiosk.active ? 'ATIVO' : 'INATIVO'}</span></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => void rotateToken(kiosk)}>Gerar novo token</button><button className={kiosk.active ? 'btn btn-danger' : 'btn btn-secondary'} onClick={() => void toggle(kiosk)}>{kiosk.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>}
      </section>

      {tokenResult && <div className="modal-backdrop"><section className="card access-modal kiosk-token-modal"><h2>Novo token do quiosque</h2><p><strong>{tokenResult.name}</strong> · {tokenResult.code}</p><p className="muted">Este novo token é exibido somente agora. O token anterior foi invalidado; copie este valor e reconfigure o aparelho.</p><textarea readOnly value={tokenResult.token} aria-label="Novo token do quiosque" /><div className="form-actions"><button className="btn" onClick={() => void copyToken()}>Copiar token</button><button className="btn btn-secondary" onClick={() => setTokenResult(null)}>Fechar</button></div></section></div>}
    </AppShell>
  );
}
