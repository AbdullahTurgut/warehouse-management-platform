import { ScanInput } from './ScanInput';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine } from 'lucide-react';
import { api, operationId } from './api';
import { displayLabel } from './turkish';
import type { Location, LocationType, Pallet, Product, Warehouse } from './types';
import { ErrorBox, Field, Loading, message, number, useLoad, useOnline } from './ui';

export function ReceiveForm({ onDone }: { onDone: (p: Pallet) => void }) {
  const products = useLoad<Product[]>('/products');
  const locations = useLoad<Location[]>('/locations');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [requestId] = useState(operationId); const online = useOnline();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try { onDone(await api<Pallet>('/receipts', 'POST', { productId: Number(form.get('productId')), locationId: Number(form.get('locationId')), quantity: Number(form.get('quantity')), reference: form.get('reference'), requestId })); }
    catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  if (products.loading || locations.loading) return <Loading/>;
  const options = locations.data?.filter(l => l.selectable) || [];
  const available = products.data?.filter(p => p.active) || [];
  return <form onSubmit={submit} className="form-stack"><ErrorBox>{products.error || locations.error || error}</ErrorBox>
    <p className="muted">Her palete tek ürün kaydedilir. Palet numarası, stok girişi kaydedildiğinde otomatik oluşturulur.</p>
    {(!available.length || !options.length) && <ErrorBox>Stok girişi yapabilmek için bir yönetici önce aktif bir ürün ve raf gözü veya bekleme alanı oluşturmalıdır.</ErrorBox>}
    <Field label="Ürün"><select name="productId" required defaultValue=""><option value="" disabled>Ürün seçin</option>{available.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></Field>
    <div className="form-grid"><Field label="Koli Miktarı"><input name="quantity" type="number" min="1" max="2147483647" step="1" inputMode="numeric" placeholder="Örn. 80" required/></Field>
    <Field label="Hedef Konum"><select name="locationId" required defaultValue={options.find(l => l.type === 'STAGING' && l.code.includes('RECEIV'))?.id || ''}><option value="" disabled>Konum seçin</option>{options.map(l => <option key={l.id} value={l.id}>{l.path}</option>)}</select></Field></div>
    <Field label="Teslimat Referansı (İsteğe Bağlı)"><input name="reference" maxLength={300} placeholder="İrsaliye numarası, araç plakası veya mal kabul referansı"/></Field>
    <div className="form-footer"><span>Stok ve hareket kaydı birlikte kaydedilir.</span><button className="btn" disabled={busy || !online || !available.length || !options.length}><ArrowDownToLine size={18}/>{busy ? 'Giriş kaydediliyor…' : 'Palet Girişi Yap'}</button></div>
  </form>;
}

export function OperationForm({ pallet, type, onDone, recentDestinationIds = [], scanDestination = false }: { pallet: Pallet; type: 'move' | 'dispatch'; onDone: (p: Pallet) => void; recentDestinationIds?: number[]; scanDestination?: boolean }) {
  const locations = useLoad<Location[]>('/locations'); const online = useOnline();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [requestId] = useState(operationId);
  const [quantity, setQuantity] = useState('');
  const destinationRef = useRef<HTMLSelectElement>(null);
  const [destinationId, setDestinationId] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try { onDone(await api<Pallet>(type === 'move' ? '/transfers' : '/dispatches', 'POST', {
      palletId: pallet.id, version: pallet.version, requestId, reference: form.get('reference'),
      ...(type === 'move' ? { locationId: Number(form.get('locationId')) } : { quantity: Number(quantity) }),
    })); } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  const destinations = (locations.data || []).filter(l => l.selectable && l.id !== pallet.location?.id && l.warehouseId === pallet.location?.warehouseId);
  const recentDestinations = recentDestinationIds.slice(0, 3).map(id => destinations.find(l => l.id === id)).filter((l): l is Location => !!l);
  function selectDestination(id: number) {
    const field = destinationRef.current;
    if (!field) return;
    setDestinationId(String(id)); field.setCustomValidity(''); field.focus();
  }
  return <form onSubmit={submit} className="form-stack"><ErrorBox>{error || (type === 'move' ? locations.error : '')}</ErrorBox>
    <div className="operation-summary"><strong>{pallet.code} · {pallet.productName}</strong><small>SKU: {pallet.sku}</small><span>Mevcut: {number(pallet.quantity)} koli</span><small>{pallet.location?.path}</small></div>
    {type === 'move' && scanDestination && <ScanInput label="2. Konum Kodunu Okutun veya Yazın" placeholder="LOC-42" disabled={busy} onStart={() => setDestinationId('')} onScan={result => {
      if (result.type !== 'LOCATION') throw new Error('Konum kodu bekleniyor. Palet yerine LOC-… etiketini okutun.');
      const l = result.location;
      if (!l.active) throw new Error('Bu konum aktif değil.');
      if (!l.selectable) throw new Error('Hedef bir raf gözü veya bekleme alanı olmalıdır.');
      if (l.warehouseId !== pallet.location?.warehouseId) throw new Error('Palet ve hedef aynı depoda olmalıdır.');
      if (l.id === pallet.location?.id) throw new Error('Palet zaten bu konumda. Farklı bir hedef seçin.');
      if (!destinations.some(d => d.id === l.id)) throw new Error('Hedef seçilemedi. Konum listesini yenileyin.');
      setDestinationId(String(l.id)); destinationRef.current?.setCustomValidity('');
    }}/>}
    {type === 'move' && recentDestinations.length > 0 && <div className="operation-summary"><span>Son Kullanılan Konumlar</span><div className="actions wrap">{recentDestinations.map(l => <button key={l.id} type="button" className="btn secondary small" disabled={busy || !online} title={l.path} onClick={() => selectDestination(l.id)}><span>{l.id === recentDestinationIds[0] ? <>Önceki Konuma Yerleştir<br/></> : null}{l.code}</span></button>)}</div><small>Konumu seçer. İşlemi kaydetmek için Taşımayı Onayla düğmesine basın.</small></div>}
    {type === 'move' ? <Field label="Hedef Raf Gözü veya Bekleme Alanı"><select ref={destinationRef} name="locationId" required value={destinationId} onChange={e => setDestinationId(e.target.value)}><option value="" disabled>Hedef konum seçin</option>{destinations.map(l => <option key={l.id} value={l.id}>{l.path}</option>)}</select></Field> : <>
      <Field label="Çıkış Yapılacak Koli Miktarı"><input name="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="1" max={pallet.quantity} step="1" inputMode="numeric" required autoFocus/></Field>
      <button type="button" className="text-button self-start" onClick={e => { const field = e.currentTarget.form?.elements.namedItem('quantity'); if (field instanceof HTMLInputElement) field.setCustomValidity(''); setQuantity(String(pallet.quantity)); }}>Tamamını seç ({number(pallet.quantity)} koli)</button>
      {Number(quantity) > 0 && Number(quantity) <= pallet.quantity && <div className="info-box">{Number(quantity) === pallet.quantity ? 'Tam çıkış: Palet sevk edildi olarak işaretlenecek ve mevcut konumu kaldırılacak.' : `Mevcut konumda ${number(pallet.quantity - Number(quantity))} koli kalacak.`}</div>}
    </>}
    {type === 'move' && scanDestination && destinationId && <div className="info-box" role="status"><strong>Yerleştirme Onayı</strong><p>{pallet.code} · {pallet.productName} · {pallet.sku} · {number(pallet.quantity)} koli</p><p>{pallet.location?.path} → {destinations.find(l => String(l.id) === destinationId)?.path}</p><p>Fiziksel paleti ve hedefi kontrol edip Taşımayı Onayla düğmesine basın.</p></div>}
    <Field label="Referans (İsteğe Bağlı)"><input name="reference" maxLength={300} placeholder="İşlem nedeni, teslimat veya işlem referansı"/></Field>
    <p className="muted text-sm">{type === 'move' ? 'Tüm koliler birlikte taşınır. Koli miktarı değişmez.' : 'Stok çıkışını kaydetmeden önce fiili koli miktarını kontrol edin.'}</p>
    <button className={`btn ${type === 'dispatch' ? 'dispatch-button' : ''}`} disabled={busy || !online || (type === 'move' && (!destinations.length || (scanDestination && !destinationId)))}>{type === 'move' ? <ArrowRightLeft size={18}/> : <ArrowUpFromLine size={18}/>} {busy ? 'Kaydediliyor…' : type === 'move' ? 'Taşımayı Onayla' : 'Stok Çıkışını Onayla'}</button>
  </form>;
}

export function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await api(product ? `/products/${product.id}` : '/products', product ? 'PUT' : 'POST', { sku: form.get('sku'), name: form.get('name'), description: form.get('description'), active: form.get('active') === 'on' }); onDone(); }
    catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack"><ErrorBox>{error}</ErrorBox><Field label="Stok Kodu (SKU)"><input name="sku" maxLength={60} defaultValue={product?.sku} required autoFocus/></Field><Field label="Ürün Adı"><input name="name" maxLength={160} defaultValue={product?.name} required/></Field><Field label="Açıklama"><textarea name="description" maxLength={2000} rows={3} defaultValue={product?.description}/></Field><label className="checkbox"><input name="active" type="checkbox" defaultChecked={product?.active ?? true}/> Aktif — yeni stok girişlerinde seçilebilir</label><button className="btn" disabled={busy || !online}>{busy ? 'Kaydediliyor…' : 'Ürünü Kaydet'}</button></form>;
}

export function WarehouseForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await api('/warehouses', 'POST', { code: form.get('code'), name: form.get('name') }); onDone(); } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack"><ErrorBox>{error}</ErrorBox><Field label="Depo Kodu"><input name="code" maxLength={40} required placeholder="WH-02"/></Field><Field label="Ad"><input name="name" maxLength={160} required/></Field><button className="btn" disabled={busy || !online}>{busy ? 'Kaydediliyor…' : 'Depo Oluştur'}</button></form>;
}

export function LocationForm({ warehouses, locations, onDone }: { warehouses: Warehouse[]; locations: Location[]; onDone: () => void }) {
  const [warehouseId, setWarehouseId] = useState(String(warehouses[0]?.id || '')); const [type, setType] = useState<LocationType>('ZONE');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  const parentType = { ZONE: null, AISLE: 'ZONE', RACK: 'AISLE', SHELF: 'RACK', STAGING: null }[type];
  const parents = locations.filter(l => l.warehouseId === Number(warehouseId) && l.type === parentType && l.active);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await api('/locations', 'POST', { warehouseId: Number(warehouseId), type, parentId: parentType ? Number(form.get('parentId')) : null, code: form.get('code'), name: form.get('name') }); onDone(); } catch(e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form-stack"><ErrorBox>{error}</ErrorBox><Field label="Depo"><select value={warehouseId} required onChange={e => setWarehouseId(e.target.value)}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></Field><Field label="Konum Türü"><select value={type} onChange={e => setType(e.target.value as LocationType)}>{(['ZONE','AISLE','RACK','SHELF','STAGING'] as const).map(t => <option key={t} value={t}>{displayLabel(t)}</option>)}</select></Field>
    {parentType && <Field label={`Üst Konum (${displayLabel(parentType)})`}><select name="parentId" required key={`${warehouseId}-${type}`} defaultValue=""><option value="" disabled>Üst konum seçin</option>{parents.map(l => <option key={l.id} value={l.id}>{l.path}</option>)}</select></Field>}
    <Field label="Depo İçinde Benzersiz Konum Kodu"><input name="code" required maxLength={40} placeholder="A-01-R01-L3"/></Field><Field label="Ad"><input name="name" required maxLength={160} placeholder="3. Seviye"/></Field><p className="muted text-sm">Paletler yalnızca raf gözlerine veya bekleme alanlarına yerleştirilebilir.</p><button className="btn" disabled={busy || !online || !warehouseId || (!!parentType && !parents.length)}>{busy ? 'Kaydediliyor…' : 'Konum Oluştur'}</button></form>;
}
