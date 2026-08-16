'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type PunchResult = {
  type: 'START' | 'PAUSE' | 'RESUME' | 'FINISH';
  sequence: number;
  nextPunch: 'START' | 'PAUSE' | 'RESUME' | 'FINISH';
  recordedAt: string;
  employee: { name: string; employeeCode: string; photoData: string | null };
  activity: { name: string; code: string };
};

const punchLabels: Record<PunchResult['type'], string> = {
  START: 'Produção iniciada',
  PAUSE: 'Intervalo iniciado',
  RESUME: 'Produção retomada',
  FINISH: 'Produção finalizada',
};

const nextLabels: Record<PunchResult['nextPunch'], string> = {
  START: 'iniciar uma nova produção',
  PAUSE: 'iniciar o intervalo',
  RESUME: 'retomar a produção',
  FINISH: 'finalizar a produção',
};

export default function KioskPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [badgeCode, setBadgeCode] = useState('');
  const [result, setResult] = useState<PunchResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [setupMode, setSetupMode] = useState(true);

  useEffect(() => {
    const savedCode = localStorage.getItem('flowops_kiosk_code');
    const savedToken = localStorage.getItem('flowops_kiosk_token');
    if (savedCode && savedToken) {
      setDeviceCode(savedCode);
      setDeviceToken(savedToken);
      setSetupMode(false);
    }
  }, []);

  useEffect(() => {
    if (!setupMode) inputRef.current?.focus();
  }, [result, setupMode]);

  function saveConfiguration(event: FormEvent) {
    event.preventDefault();
    if (!deviceCode.trim() || !deviceToken.trim()) return;
    setDeviceCode(deviceCode.trim().toUpperCase());
    setDeviceToken(deviceToken.trim());
    localStorage.setItem('flowops_kiosk_code', deviceCode.trim().toUpperCase());
    localStorage.setItem('flowops_kiosk_token', deviceToken.trim());
    setSetupMode(false);
    setError('');
  }

  function clearConfiguration() {
    setDeviceCode('');
    setDeviceToken('');
    localStorage.removeItem('flowops_kiosk_code');
    localStorage.removeItem('flowops_kiosk_token');
    setSetupMode(true);
    setResult(null);
    setError('');
  }

  async function punch(event: FormEvent) {
    event.preventDefault();
    if (!badgeCode.trim() || saving) return;
    setSaving(true);
    setError('');
    const response = await fetch(`${API}/kiosk/punch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kiosk-Code': deviceCode,
        'X-Kiosk-Token': deviceToken,
      },
      body: JSON.stringify({ badgeCode: badgeCode.trim() }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    setBadgeCode('');
    if (!response.ok) {
      setResult(null);
      setError(Array.isArray(body?.message) ? body.message.join('. ') : body?.message || 'Não foi possível registrar a batida.');
      inputRef.current?.focus();
      return;
    }
    setResult(body);
  }

  return (
    <main className="kiosk-page">
      <header className="kiosk-header"><div><span className="kiosk-kicker">FLOWOPS</span><h1>Registro de produção</h1><p>Escaneie o crachá para registrar a próxima batida.</p></div><div className="kiosk-header-actions"><span className="kiosk-device-label">{deviceCode || 'Quiosque não configurado'}</span>{!setupMode && <button className="btn btn-secondary" onClick={() => setSetupMode(true)}>Configurar</button>}</div></header>

      {setupMode ? <section className="card kiosk-setup"><h2>Configurar este quiosque</h2><p className="muted">Informe o código e o token gerados pelo administrador na tela de Quiosques. A configuração ficará salva neste navegador para continuar funcionando após atualizar a página.</p><form className="compact-form" onSubmit={saveConfiguration}><div className="field"><label>Código do quiosque</label><input required value={deviceCode} onChange={(event) => setDeviceCode(event.target.value.toUpperCase())} placeholder="KIOSK-001" /></div><div className="field"><label>Token do quiosque</label><textarea required value={deviceToken} onChange={(event) => setDeviceToken(event.target.value)} placeholder="Cole o token recebido do administrador" /></div><button className="btn" type="submit">Iniciar quiosque</button></form>{deviceCode && <button className="btn btn-secondary kiosk-clear" onClick={clearConfiguration}>Limpar configuração</button>}</section> : <>
        <section className="card kiosk-scan-card"><div className="kiosk-scan-icon">⌁</div><h2>Aproxime ou escaneie seu crachá</h2><p className="muted">O leitor pode funcionar como teclado. Mantenha o campo abaixo focado.</p><form onSubmit={punch}><input ref={inputRef} className="kiosk-scan-input" autoComplete="off" autoFocus value={badgeCode} onChange={(event) => setBadgeCode(event.target.value.toUpperCase())} placeholder="Código do crachá" aria-label="Código do crachá" /><button className="btn kiosk-submit" type="submit" disabled={saving}>{saving ? 'Registrando...' : 'Registrar batida'}</button></form>{error && <div className="error kiosk-error">{error}</div>}</section>
        {result && <section className="card kiosk-result"><div className="kiosk-result-employee">{result.employee.photoData ? <img className="kiosk-avatar" src={result.employee.photoData} alt={`Foto de ${result.employee.name}`} /> : <span className="kiosk-avatar kiosk-avatar-placeholder">{result.employee.name.slice(0, 1)}</span>}<div><span className="kiosk-result-label">{punchLabels[result.type]}</span><h2>{result.employee.name}</h2><p className="muted">{result.employee.employeeCode} · {result.activity.code} · {result.activity.name}</p></div></div><div className="kiosk-result-meta"><strong>{new Date(result.recordedAt).toLocaleTimeString('pt-BR')}</strong><span>Batida {result.sequence} de 4</span><small>Próxima: {nextLabels[result.nextPunch]}</small></div></section>}
      </>}
    </main>
  );
}
