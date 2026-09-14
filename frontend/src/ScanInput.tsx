import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Location, Pallet } from './types';
import { ErrorBox, message, useOnline } from './ui';

export type ScanResult = { type: 'PALLET'; pallet: Pallet; location: null } | { type: 'LOCATION'; location: Location; pallet: null };
export const lookupCode = (code: string) => api<ScanResult>('/scan-lookup?code=' + encodeURIComponent(code));

import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from 'lucide-react';
import { Modal } from './ui';

function CameraScanner({ onClose, onScan }: { onClose: () => void; onScan: (text: string) => void }) {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode('qr-reader');
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, (text) => {
      if (active) { active = false; scanner.stop().then(() => onScan(text)).catch(() => onScan(text)); }
    }, () => {}).catch(() => {
      if (active) setError('Kamera açılamadı. Kamera izni verdiğinizden veya HTTPS ile bağlandığınızdan emin olun.');
    });
    return () => { active = false; if (scanner.isScanning) scanner.stop().catch(() => {}); };
  }, [onScan]);
  return <Modal title="Raf QR Kodunu Okut" onClose={onClose}>
    <div className="form-stack p-4">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <button className="btn secondary" onClick={onClose}>İptal</button>
    </div>
  </Modal>;
}

export function ScanInput({ label, placeholder, onScan, onStart, disabled = false, cameraScannerType }: { label: string; placeholder: string; onScan: (result: ScanResult) => void; onStart?: () => void; disabled?: boolean; cameraScannerType?: 'LOCATION' }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const input = useRef<HTMLInputElement>(null); const pending = useRef(false); const mounted = useRef(false); const online = useOnline();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (!busy && !disabled && !camera) { input.current?.focus(); input.current?.select(); } });
    return () => cancelAnimationFrame(frame);
  }, [busy, disabled, camera]);
  async function performScan(text: string) {
    if (pending.current || disabled || !online || !text) return;
    pending.current = true; setBusy(true); setError(''); onStart?.();
    try { const result = await lookupCode(text); if (mounted.current) { onScan(result); setCode(''); setCamera(false); } }
    catch (e) { if (mounted.current) { setError(message(e)); input.current?.select(); } }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <>
    {camera && <CameraScanner onClose={() => setCamera(false)} onScan={performScan} />}
    <div className="form-stack">
      <label className="field"><span>{label}</span><input ref={input} value={code} maxLength={80} placeholder={placeholder} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={disabled || busy || !online} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void performScan(code); } }}/></label>
      <div className="actions wrap">
        <button type="button" className="btn secondary" style={{ flex: 1 }} disabled={disabled || busy || !online || !code} onClick={() => void performScan(code)}>{busy ? 'Aranıyor…' : 'Kodu Bul'}</button>
        {cameraScannerType === 'LOCATION' && <button type="button" className="btn" style={{ flex: 1 }} disabled={disabled || busy || !online} onClick={() => setCamera(true)}><Camera size={18}/> QR Okut</button>}
      </div>
      <ErrorBox>{error}</ErrorBox>
    </div>
  </>;
}