'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type NavItem = { href: string; area?: string; areas?: string[]; label: string; icon: string; roles: string[] };
type Unit = { id: string; code: string; name: string; isPrimary?: boolean };

const items: NavItem[] = [
  { href: '/dashboard', area: 'dashboard', label: 'Visão geral', icon: '▦', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN'] },
  { href: '/operations', area: 'operations', label: 'Operação', icon: '◉', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/employees', area: 'employees', label: 'Colaboradores', icon: '◌', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/job-titles', area: 'jobTitles', label: 'Cargos', icon: '◇', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/departments', area: 'departments', label: 'Departamentos', icon: '▤', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/shifts', area: 'shifts', label: 'Turnos', icon: '◷', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/activities', area: 'activities', label: 'Atividades', icon: '✓', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/reports', area: 'reports', label: 'Relatórios', icon: '▥', roles: ['ADMIN', 'SUPERVISOR', 'FOREMAN'] },
  { href: '/history', areas: ['operations', 'reports'], label: 'Histórico', icon: '◷', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN'] },
  { href: '/business-units', area: 'businessUnits', label: 'Matriz e filiais', icon: '⌂', roles: ['ADMIN', 'SUPERVISOR'] },
];

function canAccess(item: NavItem, roles: string[], accessAreas: string[]) {
  const areas = item.areas ?? (item.area ? [item.area] : []);
  return roles.includes('ADMIN') || (item.roles.some((role) => roles.includes(role)) && areas.some((area) => accessAreas.includes(area)));
}

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
  const [accessAreas, setAccessAreas] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('flowops_access_token');
    if (!token) return router.replace('/');

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((user) => {
        setRoles(user?.roles ?? []);
        setAccessAreas(user?.accessAreas ?? []);
        const availableUnits = (user?.units ?? []) as Unit[];
        setUnits(availableUnits);
        const stored = localStorage.getItem('flowops_selected_unit_id');
        const selected = availableUnits.find((unit) => unit.id === stored) ?? availableUnits.find((unit) => unit.isPrimary) ?? availableUnits[0];
        if (selected) {
          setSelectedUnitId(selected.id);
          if (stored !== selected.id) {
            localStorage.setItem('flowops_selected_unit_id', selected.id);
            window.location.reload();
          }
        } else {
          localStorage.removeItem('flowops_selected_unit_id');
        }
        setPermissionsLoaded(true);
      })
      .catch(() => undefined);
    fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (settings?.name) setCompanyName(settings.name);
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    const current = items.find((item) => item.href === pathname);
    if (!current) return;
    const allowed = canAccess(current, roles, accessAreas);
    if (!allowed && pathname !== '/dashboard') router.replace('/dashboard');
  }, [accessAreas, pathname, permissionsLoaded, roles, router]);

  const initials = useMemo(() => companyName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'F', [companyName]);

  function logout() {
    localStorage.clear();
    router.replace('/');
  }

  function changeUnit(unitId: string) {
    setSelectedUnitId(unitId);
    localStorage.setItem('flowops_selected_unit_id', unitId);
    window.location.reload();
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
          {items.filter((item) => canAccess(item, roles, accessAreas)).map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}><span>{item.icon}</span>{item.label}</Link>)}
          <span className="nav-label">SISTEMA</span>
          {roles.includes('ADMIN') && <><Link href="/users" className={`nav-item ${pathname === '/users' ? 'active' : ''}`}><span>◉</span>Usuários e acessos</Link><Link href="/kiosks" className={`nav-item ${pathname === '/kiosks' ? 'active' : ''}`}><span>▣</span>Quiosques</Link><Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}><span>⚙</span>Configurações</Link></>}
        </nav>

        <button className="sidebar-logout" onClick={logout}><span>↪</span>Sair do sistema</button>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div><p className="page-kicker">{companyName}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>
          <div className="topbar-context">
            {units.length > 1 && <label className="unit-switcher"><span>Unidade ativa</span><select value={selectedUnitId} onChange={(event) => changeUnit(event.target.value)} aria-label="Selecionar unidade ativa">{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name}</option>)}</select></label>}
            {units.length === 1 && <span className="unit-current"><small>Unidade</small><strong>{units[0].code} · {units[0].name}</strong></span>}
            <div className="topbar-user"><span className="topbar-avatar">{initials}</span><span>{companyName}</span></div>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
