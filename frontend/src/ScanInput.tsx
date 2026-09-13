import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Location, Pallet } from './types';
import { ErrorBox, message, useOnline } from './ui';

export type ScanResult = { type: 'PALLET'; pallet: Pallet; location: null } | { type: 'LOCATION'; location: Location; pallet: null };
export const lookupCode = (code: string) => api<ScanResult>('/scan-lookup?code=' + encodeURIComponent(code));

export function ScanInput({ label, placeholder, onScan, onStart, disabled = false }: { label: string; placeholder: string; onScan: (result: ScanResult) => void; onStart?: () => void; disabled?: boolean }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null); const pending = useRef(false); const mounted = useRef(false); const online = useOnline();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (!busy && !disabled) { input.current?.focus(); input.current?.select(); } });
    return () => cancelAnimationFrame(frame);
  }, [busy, disabled]);
  async function scan() {
    if (pending.current || disabled || !online || !code) return;
    pending.current = true; setBusy(true); setError(''); onStart?.();
    try { const result = await lookupCode(code); if (mounted.current) { onScan(result); setCode(''); } }
    catch (e) { if (mounted.current) { setError(message(e)); input.current?.select(); } }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <div className="form-stack"><label className="field"><span>{label}</span><input ref={input} value={code} maxLength={80} placeholder={placeholder} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={disabled || busy || !online} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void scan(); } }}/></label><button type="button" className="btn secondary" disabled={disabled || busy || !online || !code} onClick={() => void scan()}>{busy ? 'Kod aranıyor…' : 'Kodu Bul'}</button><ErrorBox>{error}</ErrorBox></div>;
}