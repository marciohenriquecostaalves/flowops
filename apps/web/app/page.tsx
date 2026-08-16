'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (token) router.replace('/dashboard');
    else setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <main className="login-page">
      <section className="login-presentation">
        <div className="login-brand"><span className="login-mark">F</span><strong>FlowOps</strong></div>
        <div className="login-copy"><p className="page-kicker">GESTÃO OPERACIONAL</p><h1>Uma visão clara para cada etapa da sua operação.</h1><p>Organize equipes, acompanhe sessões de trabalho e transforme dados operacionais em decisões melhores.</p></div>
        <div className="login-feature"><span>✓</span><div><strong>Operação conectada</strong><small>Equipe, atividades e produtividade em um único lugar.</small></div></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="page-kicker">ACESSO SEGURO</p>
          <h2>Entrar no sistema</h2>
          <p className="muted">Use suas credenciais para acessar a área operacional.</p>
          <Login />
        </div>
      </section>
    </main>
  );
}

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@flowops.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Credenciais inválidas');

      const data = await response.json();
      localStorage.setItem('flowops_access_token', data.accessToken);
      localStorage.setItem('flowops_refresh_token', data.refreshToken);
      const primaryUnit = data.user?.units?.find((unit: { isPrimary?: boolean }) => unit.isPrimary) ?? data.user?.units?.[0];
      if (primaryUnit?.id) localStorage.setItem('flowops_selected_unit_id', primaryUnit.id);
      router.replace('/dashboard');
    } catch {
      setError('Não foi possível entrar. Verifique a API e as credenciais.');
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </div>
      <div className="field">
        <label>Senha</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn login-submit" type="submit">Entrar no sistema</button>
    </form>
  );
}
