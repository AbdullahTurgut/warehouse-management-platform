import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Inbox, LoaderCircle, X } from 'lucide-react';
import { api } from './api';
import { displayLabel } from './turkish';
import type { Movement, Page } from './types';

export function useLoad<T>(path: string, revision = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date>();
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    setData(undefined); setLoading(true); setError('');
    async function load() {
      if (inFlight) return;
      inFlight = true;
      try { const result = await api<T>(path); if (alive) { setData(result); setError(''); setUpdated(new Date()); } }
      catch (e) { if (alive) setError(message(e)); }
      finally { inFlight = false; if (alive) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 20000);
    window.addEventListener('online', load);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('online', load); };
  }, [path, revision]);
  return { data, error, loading, updated };
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const change = () => setOnline(navigator.onLine); window.addEventListener('online', change); window.addEventListener('offline', change); return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); }; }, []);
  return online;
}
export function message(e: unknown) { return e instanceof Error ? e.message : 'Bir sorun oluştu. Lütfen tekrar deneyin.'; }
export const number = (n: number) => n.toLocaleString('tr-TR');
export const date = (value: string) => new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
export function ErrorBox({ children }: { children?: ReactNode }) { return children ? <div role="alert" className="error-box"><AlertCircle size={18}/><span>{children}</span></div> : null; }
export function Loading() { return <div className="empty" role="status"><LoaderCircle className="spin" size={22}/> Depo bilgileri yükleniyor…</div>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><Inbox size={30}/><strong>{title}</strong>{children && <p>{children}</p>}</div>; }
export function Badge({ value }: { value: string }) { return <span className={`badge ${value.toLowerCase()}`}>{displayLabel(value)}</span>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Pager({ data, onPage }: { data: Page<unknown>; onPage: (p: number) => void }) {
  return <div className="pager"><span>{number(data.total)} sonuç · Sayfa {number(data.page + 1)} / {number(Math.max(1, data.totalPages))}</span><div className="actions"><button className="btn secondary" disabled={data.page === 0} onClick={() => onPage(data.page - 1)}>Önceki</button><button className="btn secondary" disabled={data.page + 1 >= data.totalPages} onClick={() => onPage(data.page + 1)}>Sonraki</button></div></div>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); onClose(); }} className="modal"><header><h2>{title}</h2><button className="icon-btn" aria-label="Pencereyi Kapat" onClick={onClose}><X size={20}/></button></header>{children}</dialog>;
}
export function MovementList({ movements }: { movements: Movement[] }) {
  if (!movements.length) return <Empty title="Henüz stok hareketi yok">Giriş, konum değişikliği ve çıkış işlemleri burada görüntülenir.</Empty>;
  return <div className="movement-list">{movements.map(m => <article className="movement" key={m.id}>
    <span className={`movement-icon ${m.type.toLowerCase()}`}>{m.type === 'RECEIPT' ? <ArrowDownLeft size={19}/> : m.type === 'DISPATCH' ? <ArrowUpRight size={19}/> : <ArrowRightLeft size={19}/>}</span>
    <div className="movement-body"><div className="row wrap"><a href={`#/pallets/${m.palletId}`} className="strong">{m.palletCode}</a><Badge value={m.type}/></div><p>{m.productName} <span className="muted">· {m.sku}</span></p><p className="location-line">{m.sourceLocation || 'Depo Dışı'} <span>→</span> {m.destinationLocation || 'Depo Dışı'}</p>{m.reference && <p className="muted">{m.reference}</p>}<small>{date(m.createdAt)} · {m.actor}</small></div>
    <div className="movement-quantity"><strong>{m.type === 'RECEIPT' ? '+' : m.type === 'DISPATCH' ? '−' : ''}{number(m.quantity)}</strong><span>{m.type === 'TRANSFER' ? 'koli taşındı' : 'koli'}</span><small>Kalan: {number(m.balanceAfter)} koli</small></div>
  </article>)}</div>;
}
