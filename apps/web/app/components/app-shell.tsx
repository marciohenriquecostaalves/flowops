'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const items = [
  { href: '/dashboard', label: 'Visão geral', icon: '▦' },
  { href: '/operations', label: 'Operação', icon: '◉' },
  { href: '/employees', label: 'Colaboradores', icon: '◌' },
  { href: '/departments', label: 'Departamentos', icon: '▤' },
  { href: '/shifts', label: 'Turnos', icon: '◷' },
  { href: '/activities', label: 'Atividades', icon: '✓' },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('FlowOps');

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) return router.replace('/');

    fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (settings?.name) setCompanyName(settings.name);
      })
      .catch(() => undefined);
  }, [router]);

  const initials = useMemo(() => companyName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'F', [companyName]);

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard" aria-label="Ir para a visão geral">
          <span className="brand-mark">{initials}</span>
          <span><strong>{companyName}</strong><small>Sistema operacional</small></span>
        </Link>

        <nav className="sidebar-nav" aria-label="Menu principal">
          <span className="nav-label">GESTÃO</span>
          {items.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}><span>{item.icon}</span>{item.label}</Link>)}
          <span className="nav-label">SISTEMA</span>
          <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}><span>⚙</span>Configurações</Link>
        </nav>

        <button className="sidebar-logout" onClick={logout}><span>↪</span>Sair do sistema</button>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div><p className="page-kicker">{companyName}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>
          <div className="topbar-user"><span className="topbar-avatar">{initials}</span><span>{companyName}</span></div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
