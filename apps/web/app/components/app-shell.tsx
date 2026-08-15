'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const items = [
  { href: '/dashboard', label: 'Visão geral', icon: '▦', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/operations', label: 'Operação', icon: '◉', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/employees', label: 'Colaboradores', icon: '◌', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/job-titles', label: 'Cargos', icon: '◇', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/departments', label: 'Departamentos', icon: '▤', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/shifts', label: 'Turnos', icon: '◷', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/activities', label: 'Atividades', icon: '✓', roles: ['ADMIN', 'SUPERVISOR'] },
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
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) return router.replace('/');

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((user) => setRoles(user?.roles ?? []))
      .catch(() => undefined);
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
          {items.filter((item) => item.roles.some((role) => roles.includes(role))).map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}><span>{item.icon}</span>{item.label}</Link>)}
          <span className="nav-label">SISTEMA</span>
          {roles.includes('ADMIN') && <><Link href="/users" className={`nav-item ${pathname === '/users' ? 'active' : ''}`}><span>◉</span>Usuários e acessos</Link><Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}><span>⚙</span>Configurações</Link></>}
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
