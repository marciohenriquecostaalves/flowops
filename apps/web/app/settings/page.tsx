'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../components/app-shell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Settings = { name: string; legalName: string | null; supportEmail: string | null; phone: string | null; city: string | null; state: string | null };
const emptySettings: Settings = { name: '', legalName: '', supportEmail: '', phone: '', city: '', state: '' };

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function auth() {
    const token = localStorage.getItem('flowops_access_token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  useEffect(() => {
    const headers = auth();
    if (!headers) return router.replace('/');
    fetch(`${API}/settings`, { headers })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setSettings(await response.json());
      })
      .catch(() => { localStorage.clear(); router.replace('/'); })
      .finally(() => setLoading(false));
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const headers = auth();
    if (!headers) return router.replace('/');
    setSaving(true); setError(''); setMessage('');
    const response = await fetch(`${API}/settings`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false);
    if (!response.ok) { setError('Não foi possível salvar. Confira os dados informados.'); return; }
    setSettings(await response.json());
    setMessage('Configurações salvas com sucesso.');
  }

  if (loading) return <main className="container">Carregando configurações...</main>;

  return <AppShell title="Configurações da empresa" subtitle="Personalize as informações exibidas no sistema.">
    <section className="settings-intro card"><div className="settings-monogram">{settings.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'F'}</div><div><h2>Identidade da empresa</h2><p className="muted">O monograma é gerado automaticamente a partir do nome e aparece em todo o sistema.</p></div></section>
    <section className="card"><h2>Dados da empresa</h2><p className="muted">Essas informações ficam disponíveis somente para usuários autenticados da empresa.</p>
      <form className="settings-form" onSubmit={submit}>
        <div className="field"><label>Nome exibido no sistema</label><input required minLength={2} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} placeholder="Ex.: FlowOps Logística" /></div>
        <div className="field"><label>Razão social (opcional)</label><input value={settings.legalName ?? ''} onChange={(e) => setSettings({ ...settings, legalName: e.target.value })} placeholder="Ex.: FlowOps Operações Ltda." /></div>
        <div className="field"><label>E-mail de suporte (opcional)</label><input type="email" value={settings.supportEmail ?? ''} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} placeholder="suporte@empresa.com" /></div>
        <div className="field"><label>Telefone (opcional)</label><input value={settings.phone ?? ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="(00) 00000-0000" /></div>
        <div className="field"><label>Cidade (opcional)</label><input value={settings.city ?? ''} onChange={(e) => setSettings({ ...settings, city: e.target.value })} placeholder="Ex.: São Paulo" /></div>
        <div className="field"><label>Estado (opcional)</label><input value={settings.state ?? ''} onChange={(e) => setSettings({ ...settings, state: e.target.value.toUpperCase() })} placeholder="SP" maxLength={2} /></div>
        <div className="form-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</button></div>
      </form>
      {error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}
    </section>
  </AppShell>;
}
