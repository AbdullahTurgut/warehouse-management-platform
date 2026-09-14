import { LabelButton } from './Labels';
import { ScanInput } from './ScanInput';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowRightLeft, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { api, operationId, query } from './api';
import type { Location, Pallet, Product, Warehouse, Page, ReceivingSession, ReceivingSessionDetail } from './types';
import { Badge, date, Empty, ErrorBox, Field, Loading, message, Modal, number, Pager, useLoad, useOnline } from './ui';
import { OperationForm } from './Forms';

type Shared = { revision: number; changed: (text: string) => void };

export function ReceivingSessionsScreen({ revision, changed }: Shared) {
  const [status, setStatus] = useState('OPEN'); const [page, setPage] = useState(0); const [creating, setCreating] = useState(false);
  const result = useLoad<Page<ReceivingSession>>('/receiving-sessions?' + query({ status, page }), revision);
  return <><section className="panel"><div className="toolbar"><select aria-label="Kabul durumu" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="OPEN">Açık Kayıtlar</option><option value="COMPLETED">Tamamlanan Kayıtlar</option><option value="">Tüm Kayıtlar</option></select><button className="btn" onClick={() => setCreating(true)}><Plus size={17}/>Mal Kabul Kaydı Aç</button></div>
    <ErrorBox>{result.error}</ErrorBox>{result.loading ? <Loading/> : result.data && <>
      {!result.data.items.length ? <Empty title="Mal kabul kaydı bulunamadı">Gelen araç veya teslimat için yeni bir mal kabul kaydı açın.</Empty> : result.data.items.map(s => <article className="location-row" key={s.id}><div><div className="row wrap"><a className="pallet-link" href={'#/receiving-sessions/' + s.id}>{s.code}</a><Badge value={s.status}/></div><strong>{s.warehouseName}</strong><p>{s.deliveryNote ? 'İrsaliye: ' + s.deliveryNote + ' · ' : ''}{s.supplier || 'Tedarikçi belirtilmedi'}</p><p>Gelen: {number(s.receivedCount)}{s.expectedPalletCount !== null ? ' / ' + number(s.expectedPalletCount) : ''} · Yerleştirilen: {number(s.putAwayCount)} / {number(s.receivedCount)} · Bekleyen: {number(s.pendingCount)}</p><small>{date(s.openedAt)} · {s.openedBy}</small></div><a className="btn secondary small" href={'#/receiving-sessions/' + s.id}>Aç <ArrowRight size={15}/></a></article>)}
      <Pager data={result.data} onPage={setPage}/></>}
  </section>{creating && <Modal title="Mal Kabul Kaydı Aç" onClose={() => setCreating(false)}><OpenSessionForm onDone={s => { setCreating(false); changed(s.code + ' mal kabul kaydı açıldı.'); window.location.hash = '/receiving-sessions/' + s.id; }}/></Modal>}</>;
}

function OpenSessionForm({ onDone }: { onDone: (session: ReceivingSession) => void }) {
  const warehouses = useLoad<Warehouse[]>('/warehouses'); const locations = useLoad<Location[]>('/locations');
  const [warehouse, setWarehouse] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  const warehouseId = warehouse || String(warehouses.data?.[0]?.id || '');
  const choices = (locations.data || []).filter(l => l.warehouseId === Number(warehouseId) && l.type === 'STAGING' && l.active);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setError(''); setBusy(true);
    try { onDone(await api<ReceivingSession>('/receiving-sessions', 'POST', {
      warehouseId: Number(warehouseId), receivingLocationId: Number(form.get('locationId')),
      deliveryNote: form.get('deliveryNote'), supplier: form.get('supplier'), note: form.get('note'),
      expectedPalletCount: form.get('expected') ? Number(form.get('expected')) : null,
    })); } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  if (warehouses.loading || locations.loading) return <Loading/>;
  return <form className="form-stack" onSubmit={submit}><ErrorBox>{error || warehouses.error || locations.error}</ErrorBox>
    <Field label="Depo"><select required value={warehouseId} onChange={e => setWarehouse(e.target.value)}><option value="" disabled>Depo seçin</option>{warehouses.data?.map(w => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></Field>
    <Field label="Mal Kabul Alanı"><select key={warehouseId} name="locationId" required defaultValue={choices.find(l => l.code.includes('RECEIV'))?.id || ''}><option value="" disabled>Bekleme alanı seçin</option>{choices.map(l => <option key={l.id} value={l.id}>{l.path} · {l.name}</option>)}</select></Field>
    {!choices.length && <ErrorBox>Seçilen depoda aktif bir bekleme alanı bulunmalıdır.</ErrorBox>}
    <Field label="İrsaliye No (İsteğe Bağlı)"><input name="deliveryNote" maxLength={100}/></Field>
    <Field label="Tedarikçi (İsteğe Bağlı)"><input name="supplier" maxLength={160}/></Field>
    <Field label="Beklenen Palet Sayısı (İsteğe Bağlı)"><input name="expected" type="number" step="1" min="1" max="2147483647" inputMode="numeric" placeholder="Örn. 30"/></Field>
    <Field label="Not (İsteğe Bağlı)"><textarea name="note" rows={2} maxLength={1000}/></Field>
    <button className="btn" disabled={busy || !online || !choices.length}>{busy ? 'Açılıyor…' : 'Mal Kabul Kaydı Aç'}</button>
  </form>;
}

export function ReceivingSessionScreen({ id, revision, changed }: Shared & { id: number }) {
  const [data, setData] = useState<ReceivingSessionDetail>(); const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0); const [tab, setTab] = useState<'receive' | 'queue' | 'pallets' | 'fast'>('receive');
  const [moving, setMoving] = useState<Pallet>(); const [completing, setCompleting] = useState(false);
  const [fastPallet, setFastPallet] = useState<Pallet>();
  const [fastSuccess, setFastSuccess] = useState('');
  const [recentDestinationIds, setRecentDestinationIds] = useState<number[]>([]);
  const [activePlacementPallet, setActivePlacementPallet] = useState<Pallet>();
  const activePlacementTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  function activatePallet(pallet: Pallet) {
    setActivePlacementPallet(pallet); setFastPallet(undefined);
    if (activePlacementTimer.current) clearTimeout(activePlacementTimer.current);
    activePlacementTimer.current = setTimeout(() => setActivePlacementPallet(undefined), 5 * 60 * 1000);
  }
  function clearActivePallet() {
    setActivePlacementPallet(undefined);
    if (activePlacementTimer.current) clearTimeout(activePlacementTimer.current);
  }
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) clearActivePallet(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); if (activePlacementTimer.current) clearTimeout(activePlacementTimer.current); };
  }, []);
  useEffect(() => {
    if (!activePlacementPallet || !data) return;
    const current = data.pallets.find(p => p.id === activePlacementPallet.id);
    if (!current || current.status !== 'ACTIVE' || current.version !== activePlacementPallet.version) clearActivePallet();
  }, [data, activePlacementPallet]);

  // Preserve the receiving form and its previous-pallet shortcut while refreshing server-backed progress.
  useEffect(() => {
    let active = true; let inFlight = false;
    async function load() {
      if (inFlight) return; inFlight = true;
      try { const result = await api<ReceivingSessionDetail>('/receiving-sessions/' + id); if (active) { setData(result); setError(''); } }
      catch(e) { if (active) setError(message(e)); } finally { inFlight = false; }
    }
    void load(); const interval = setInterval(() => { if (!document.hidden) void load(); }, 10000);
    window.addEventListener('online', load); window.addEventListener('focus', load);
    return () => { active = false; clearInterval(interval); window.removeEventListener('online', load); window.removeEventListener('focus', load); };
  }, [id, revision, refresh]);
  function saved(text: string) { changed(text); setRefresh(v => v + 1); }
  if (!data) return <><ErrorBox>{error}</ErrorBox>{!error && <Loading/>}</>;
  const s = data.session;
  return <><a className="back-link" href="#/receiving-sessions"><ArrowLeft size={16}/>Mal Kabul Kayıtlarına Dön</a><ErrorBox>{error}</ErrorBox>
    <section className="panel"><div className="panel-heading"><div><div className="row wrap"><h2>{s.code}</h2><Badge value={s.status}/></div><p className="muted text-sm mt-2">{s.warehouseName} · {s.receivingLocationCode}</p></div><button className="btn secondary icon-only" aria-label="Kuyruğu yenile" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={17}/></button></div>
      <div className="p-5 grid gap-2 text-sm"><p>İrsaliye: {s.deliveryNote || '—'} · Tedarikçi: {s.supplier || '—'}</p>{s.note && <p className="whitespace-pre-wrap">{s.note}</p>}<small>Açan: {s.openedBy} · {date(s.openedAt)}{s.completedAt ? ' · Tamamlandı: ' + date(s.completedAt) : ''}</small></div>
    </section>
    <div className="stats-grid"><article className="stat-card"><span>Gelen</span><strong>{number(s.receivedCount)}{s.expectedPalletCount !== null ? ' / ' + number(s.expectedPalletCount) : ''}</strong></article><article className="stat-card"><span>Yerleştirilen</span><strong>{number(s.putAwayCount)} / {number(s.receivedCount)}</strong></article><article className="stat-card"><span>Bekleyen</span><strong>{number(s.pendingCount)}</strong></article></div>
    {s.dispatchedBeforePutAwayCount > 0 && <div className="info-box mb-5">Rafa yerleştirilmeden tamamen sevk edilen: {number(s.dispatchedBeforePutAwayCount)} palet. Bu paletler yerleştirildi sayılmaz.</div>}
    <div className="actions wrap mb-5"><button className={'btn ' + (tab === 'receive' ? '' : 'secondary')} onClick={() => { setFastPallet(undefined); setTab('receive'); }}>Palet Girişi</button><button className={'btn ' + (tab === 'queue' ? '' : 'secondary')} onClick={() => { setFastPallet(undefined); setTab('queue'); }}>Yerleştirme Kuyruğu ({number(s.pendingCount)})</button><button className={'btn ' + (tab === 'pallets' ? '' : 'secondary')} onClick={() => { setFastPallet(undefined); setTab('pallets'); }}>Gelen Paletler</button><button className={'btn ' + (tab === 'fast' ? '' : 'secondary')} onClick={() => setTab('fast')}>Hızlı Yerleştirme</button></div>
    <section className="panel form-panel" hidden={tab !== 'receive'}><div className="panel-heading"><h2>Kesintisiz Palet Girişi</h2></div>{s.status === 'OPEN' ? (activePlacementPallet ? <div className="form-stack" style={{ padding: '26px' }}><div className="info-box mb-2"><strong>Lütfen dikkat:</strong> Bu paleti fiziksel olarak rafa yerleştirdikten sonra hedef konumu onaylayın.</div><div className="operation-summary"><strong>Aktif Palet (Fiziksel Olarak Sizinle)</strong><span className="text-lg mt-1">{activePlacementPallet.code}</span><span>{activePlacementPallet.productName} · SKU: {activePlacementPallet.sku}</span><span>Koli: <strong>{number(activePlacementPallet.quantity)}</strong></span><small>Mevcut Konum: {activePlacementPallet.location?.path || s.receivingLocationCode}</small><div className="mt-2"><LabelButton pallet={activePlacementPallet}/></div></div><OperationForm key={activePlacementPallet.id} pallet={activePlacementPallet} type="move" scanDestination recentDestinationIds={recentDestinationIds} onDone={p => { if (p.location) { const destinationId = p.location.id; setRecentDestinationIds(ids => [destinationId, ...ids.filter(id => id !== destinationId)].slice(0, 3)); } clearActivePallet(); saved(p.code + ' başarıyla yerleştirildi.'); }}/><button className="btn secondary mt-3" onClick={() => clearActivePallet()}>Aktif Yerleştirmeyi İptal Et (Kuyruğa Bırak)</button></div> : <SessionReceiptForm session={s} onSaved={p => saved(p.code + ' için ' + number(p.quantity) + ' koli giriş kaydedildi.')} onPlace={p => { saved(p.code + ' için ' + number(p.quantity) + ' koli giriş kaydedildi. Yerleştirme başlatıldı.'); activatePallet(p); }}/>) : <Empty title="Mal kabul kaydı tamamlandı">Bu kayda yeni palet eklenemez.</Empty>}</section>
    {tab === 'fast' && <section className="panel form-panel"><div className="panel-heading"><h2>Hızlı Yerleştirme</h2></div><div className="form-stack">
      {fastSuccess && <div className="info-box" role="status">{fastSuccess}</div>}
      {!fastPallet ? <ScanInput label="1. Palet Kodunu Okutun veya Yazın" placeholder="PLT-000123" onScan={result => {
        if (result.type !== 'PALLET') throw new Error('Palet kodu bekleniyor. Konum yerine PLT-… etiketini okutun.');
        const p = result.pallet;
        if (p.status !== 'ACTIVE' || !p.location || p.quantity <= 0) throw new Error('Bu palet sevk edilmiş veya aktif değil.');
        if (p.receivingSessionId !== s.id) throw new Error('Bu palet farklı bir mal kabul kaydına ait. Doğru kaydı açın.');
        if (p.firstPutAwayAt) throw new Error('Bu paletin ilk yerleştirmesi tamamlanmış. Sonraki taşıma için palet detayını açın.');
        setFastSuccess(''); setFastPallet(p);
      }}/> : <><button type="button" className="btn secondary" onClick={() => setFastPallet(undefined)}>Paleti Bırak / Yeniden Okut</button><OperationForm key={fastPallet.id} pallet={fastPallet} type="move" scanDestination recentDestinationIds={recentDestinationIds} onDone={p => {
        if (p.location) { const destinationId = p.location.id; setRecentDestinationIds(ids => [destinationId, ...ids.filter(id => id !== destinationId)].slice(0, 3)); }
        setFastPallet(undefined); const text = p.code + (p.firstPutAwayAt ? ' rafa yerleştirildi. Sonraki paleti okutun.' : ' bekleme alanına taşındı; kuyrukta kalır. Sonraki paleti okutun.'); setFastSuccess(text); saved(text);
      }}/></>}
    </div></section>}
    {tab !== 'receive' && <section className="panel"><div className="panel-heading"><h2>{(tab === 'queue' || tab === 'fast') ? 'Yerleştirme Kuyruğu' : 'Gelen Paletler'}</h2></div>
      {((tab === 'queue' || tab === 'fast') ? data.queue : data.pallets).length === 0 ? <Empty title={(tab === 'queue' || tab === 'fast') ? 'Yerleştirilecek palet yok' : 'Henüz palet alınmadı'}/> : ((tab === 'queue' || tab === 'fast') ? data.queue : data.pallets).map(p => <article key={p.id} className="location-row"><div><a className="pallet-link" href={'#/pallets/' + p.id}>{p.code}</a><p><strong>{p.productName}</strong> · {p.sku} · {number(p.quantity)} koli</p><p>{p.location?.path || 'Sevk edildi'} · {s.code}</p><small>{p.firstPutAwayAt ? 'İlk yerleştirme: ' + date(p.firstPutAwayAt) : p.status === 'DISPATCHED' ? 'Yerleştirilmeden sevk edildi' : 'Yerleştirme bekliyor'}</small><p className="mt-2"><LabelButton pallet={p}/></p></div>{p.status === 'ACTIVE' && !p.firstPutAwayAt && <button className="btn secondary small" onClick={() => { setFastPallet(undefined); setMoving(p); }}><ArrowRightLeft size={15}/>Yerleştir</button>}</article>)}
    </section>}
    <p className="refresh-note mb-5">Ortak kuyruk 10 saniyede bir yenilenir. Diğer operatörler aynı kabul kaydını açabilir.</p>
    {s.status === 'OPEN' && <button className="btn" onClick={() => setCompleting(true)}><CheckCircle2 size={17}/>Mal Kabulü Tamamla</button>}
    {moving && <Modal title={'Paleti Yerleştir · ' + moving.code} onClose={() => { setMoving(undefined); setRefresh(v => v + 1); }}><OperationForm pallet={moving} type="move" scanDestination recentDestinationIds={recentDestinationIds} onDone={p => { if (p.location) { const destinationId = p.location.id; setRecentDestinationIds(ids => [destinationId, ...ids.filter(id => id !== destinationId)].slice(0, 3)); } setMoving(undefined); setTab('queue'); saved(p.firstPutAwayAt ? p.code + ' rafa yerleştirildi.' : p.code + ' bekleme alanına taşındı; yerleştirme kuyruğunda kalır.'); }}/></Modal>}
    {completing && <Modal title="Mal Kabulü Tamamla" onClose={() => setCompleting(false)}><CompleteSessionForm session={s} onDone={() => { setCompleting(false); saved(s.code + ' tamamlandı.'); }}/></Modal>}
  </>;
}

function SessionReceiptForm({ session, onSaved, onPlace }: { session: ReceivingSession; onSaved: (pallet: Pallet) => void; onPlace: (pallet: Pallet) => void }) {
  const products = useLoad<Product[]>('/products'); const online = useOnline();
  const [productId, setProductId] = useState(''); const [quantity, setQuantity] = useState('');
  const [previous, setPrevious] = useState<Pallet>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(operationId); const formRef = useRef<HTMLFormElement>(null); const productRef = useRef<HTMLSelectElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement; const isPlace = submitter?.name === 'place';
    setBusy(true); setError(''); const currentRequestId = requestId;
    try {
      const pallet = await api<Pallet>('/receipts', 'POST', { productId: Number(productId), quantity: Number(quantity),
        locationId: session.receivingLocationId, receivingSessionId: session.id, requestId: currentRequestId });
      setPrevious(pallet); setProductId(''); setQuantity(''); setRequestId(operationId());
      if (isPlace) onPlace(pallet); else onSaved(pallet);
      productRef.current?.focus();
    } catch(err: any) {
      if (err.message.includes('Sunucudan onay alınamadı')) {
        try {
          const recovered = await api<Pallet>('/operations/' + currentRequestId);
          setPrevious(recovered); setProductId(''); setQuantity(''); setRequestId(operationId());
          if (isPlace) onPlace(recovered); else onSaved(recovered);
          productRef.current?.focus();
          return;
        } catch {}
      }
      setError(message(err));
    } finally { setBusy(false); }
  }
  function repeat() {
    if (!previous) return;
    formRef.current?.querySelectorAll('input,select').forEach(field => (field as HTMLInputElement).setCustomValidity(''));
    setProductId(String(previous.productId)); setQuantity(String(previous.quantity)); productRef.current?.focus();
  }
  return <form ref={formRef} className="form-stack" onSubmit={submit}><ErrorBox>{error || products.error}</ErrorBox>
    {previous && <div className="operation-summary"><strong>Son alınan palet: <a className="text-button" href={'#/pallets/' + previous.id}>{previous.code}</a></strong><span>{previous.productName} · {number(previous.quantity)} koli</span><button type="button" className="btn secondary" disabled={busy || !online} onClick={repeat}>Önceki Paletle Aynı</button><LabelButton pallet={previous}/><small>Ürün ve miktarı doldurur. Yeni paleti oluşturmak için kaydetmeniz gerekir.</small></div>}
    <fieldset disabled={busy || !online} className="form-stack border-0 p-0 m-0"><Field label="Ürün"><select ref={productRef} required value={productId} onChange={e => setProductId(e.target.value)}><option value="" disabled>Ürün seçin</option>{products.data?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></Field>
    <Field label="Koli Miktarı"><input type="number" inputMode="numeric" min="1" max="2147483647" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Örn. 40"/></Field>
    <p className="muted text-sm">Giriş konumu: {session.receivingLocationCode}. Her kayıt yeni bir palet oluşturur.</p>
    <div className="actions wrap">
      <button name="save" type="submit" className="btn secondary" disabled={products.loading || !products.data?.some(p => p.active)}>{busy ? 'Kaydediliyor…' : 'Kaydet ve Sonraki Palet'}</button>
      <button name="place" type="submit" className="btn" disabled={products.loading || !products.data?.some(p => p.active)}>{busy ? 'Kaydediliyor…' : 'Kaydet ve Yerleştir'}</button>
    </div>
    </fieldset>
  </form>;
}

function CompleteSessionForm({ session: s, onDone }: { session: ReceivingSession; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  const mismatch = s.expectedPalletCount !== null && s.expectedPalletCount !== s.receivedCount;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('/receiving-sessions/' + s.id + '/complete', 'POST', { version: s.version, confirmCountMismatch: confirmed }); onDone(); }
    catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form className="form-stack" onSubmit={submit}><ErrorBox>{error}</ErrorBox><p>Gelen: {number(s.receivedCount)}{s.expectedPalletCount !== null ? ' / Beklenen: ' + number(s.expectedPalletCount) : ''}</p><p>Yerleştirme kuyruğunda: {number(s.pendingCount)} palet</p>
    {s.pendingCount > 0 && <ErrorBox>Kuyrukta bekleyen paletler var. Önce yerleştirme işlemlerini tamamlayın.</ErrorBox>}
    {s.receivedCount === 0 && <ErrorBox>Tamamlamak için en az bir palet alınmalıdır.</ErrorBox>}
    {mismatch && <div className="info-box"><p>Beklenen ve gelen palet sayıları farklı.</p><label className="checkbox mt-3"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Sayı farkını kontrol ettim; bu haliyle tamamla.</label></div>}
    <p className="muted text-sm">Tamamlandıktan sonra bu kayda yeni palet eklenemez.</p>
    <button className="btn" disabled={busy || !online || s.pendingCount > 0 || !s.receivedCount || (mismatch && !confirmed)}>{busy ? 'Tamamlanıyor…' : 'Tamamlamayı Onayla'}</button>
  </form>;
}
