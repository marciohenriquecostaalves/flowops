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
    <main className="container">
      <section className="card form">
        <div className="logo">FlowOps</div>
        <p className="muted">Gestão operacional e produtividade logística.</p>
        <Login />
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
      router.push('/dashboard');
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
      <button className="btn" type="submit">Entrar</button>
    </form>
  );
}
