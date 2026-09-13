import { LabelButton } from './Labels';
import { useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpFromLine, Boxes, Layers3, Package, Plus, Search } from 'lucide-react';
import type { Dashboard, Detail, Location, Movement, Page, Pallet, Product, User, Warehouse } from './types';
import { query } from './api';
import { Badge, date, Empty, ErrorBox, Loading, Modal, MovementList, number, Pager, useLoad } from './ui';
import { LocationForm, OperationForm, ProductForm, ReceiveForm, WarehouseForm } from './Forms';

type Shared = { revision: number; changed: (message: string) => void };

export function DashboardScreen({ revision }: Shared) {
  const { data, error, loading, updated } = useLoad<Dashboard>('/dashboard', revision);
  return <><ErrorBox>{error}</ErrorBox>{loading && <Loading/>}{data && <>
    <div className="stats-grid">{[
      { label: 'Aktif Paletler', value: data.activePallets, Icon: Layers3, note: 'Depoda bulunan paletler' },
      { label: 'Toplam Koli', value: data.totalCartons, Icon: Boxes, note: 'Tüm paletlerdeki mevcut koli miktarı' },
      { label: 'Ürünler', value: data.productCount, Icon: Package, note: 'Katalogda kayıtlı ürünler' },
    ].map(({ label, value, Icon, note }) => <article className="stat-card" key={label}><div className="row between"><span>{label}</span><Icon size={21}/></div><strong>{number(value)}</strong><small>{note}</small></article>)}</div>
    <section className="quick-actions"><div><span className="eyebrow">DEPO İŞLEMLERİ</span><h2>Stok işlemlerinizi kolayca yönetin.</h2><p>Yeni palet girişi yapın, taşınacak veya sevk edilecek paleti bulun.</p></div><div className="actions wrap"><a className="btn" href="#/receive"><ArrowDownToLine size={18}/>Palet Girişi Yap</a><a className="btn secondary" href="#/inventory">Stokları Gör<ArrowRight size={17}/></a></div></section>
    <section className="panel"><div className="panel-heading"><h2>Son Hareketler</h2><a className="text-button" href="#/movements">Tümünü Gör <ArrowRight size={16}/></a></div><MovementList movements={data.recentMovements}/></section>
    <p className="refresh-note">Son güncelleme: {updated?.toLocaleTimeString('tr-TR')} · Ekran açıkken 20 saniyede bir yenilenir</p>
  </>}</>;
}

export function InventoryScreen({ revision }: Shared) {
  const initialLocation = new URLSearchParams(window.location.hash.split('?')[1]).get('locationId') || '';
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('ACTIVE'); const [locationId, setLocation] = useState(initialLocation); const [page, setPage] = useState(0);
  const { data, error, loading } = useLoad<Page<Pallet>>(`/inventory?${query({ search, status, locationId, page })}`, revision);
  const locations = useLoad<Location[]>('/locations', revision);
  return <><section className="panel"><div className="toolbar"><div className="search-input"><Search size={18}/><input aria-label="Stok Ara" placeholder="Palet, stok kodu, ürün veya konum ara…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></div><select aria-label="Duruma Göre Filtrele" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tüm Durumlar</option><option value="ACTIVE">Aktif Paletler</option><option value="DISPATCHED">Sevk Edilen Paletler</option></select><select aria-label="Konuma Göre Filtrele" value={locationId} onChange={e => { setLocation(e.target.value); setPage(0); }}><option value="">Tüm Konumlar</option>{locations.data?.filter(l => l.selectable).map(l => <option key={l.id} value={l.id}>{l.path}</option>)}</select></div><ErrorBox>{error || locations.error}</ErrorBox>{loading ? <Loading/> : data && <>
    {!data.items.length ? <Empty title="Palet bulunamadı">Farklı bir arama yapın veya ilk palet girişinizi kaydedin.</Empty> : <div className="table-wrap"><table className="inventory-table"><thead><tr><th>Palet / Ürün</th><th>Koli</th><th>Mevcut Konum</th><th>Durum</th><th><span className="sr-only">Paleti Aç</span></th></tr></thead><tbody>{data.items.map(p => <tr key={p.id}><td><a className="pallet-link" href={`#/pallets/${p.id}`}>{p.code}</a><div>{p.productName}</div><small>{p.sku}</small></td><td data-label="Koli"><strong className="quantity">{number(p.quantity)}</strong></td><td data-label="Konum"><span className="location-text">{p.location?.path || '—'}</span>{p.location && <small>{p.location.name}</small>}</td><td data-label="Durum"><Badge value={p.status}/></td><td><a className="btn secondary small" href={`#/pallets/${p.id}`}>Aç <ArrowRight size={15}/></a></td></tr>)}</tbody></table></div>}
    <Pager data={data} onPage={setPage}/></>}</section></>;
}

export function ReceiveScreen({ changed }: Shared) {
  return <div className="receive-layout"><section className="panel form-panel"><div className="panel-heading"><h2>Yeni Palet Girişi</h2><span className="step-tag">MAL KABUL</span></div><ReceiveForm onDone={p => { changed(`${p.code} için ${number(p.quantity)} koli giriş kaydedildi.`); window.location.hash = `/pallets/${p.id}`; }}/></section><aside className="helper-card"><ArrowDownToLine size={28}/><h2>Araçtan Depoya</h2><ol><li>Paletteki ürünü seçin.</li><li>Koli miktarını kontrol edin.</li><li>Mal kabul alanını veya bir raf gözünü seçin.</li><li>Paleti ve stok giriş hareketini oluşturmak için kaydedin.</li></ol><p>Her palette tek ürün bulunur. Tarama gerekmez.</p></aside></div>;
}

export function PalletScreen({ id, revision, changed }: Shared & { id: number }) {
  const { data, error, loading } = useLoad<Detail>(`/pallets/${id}`, revision);
  const [operation, setOperation] = useState<{ type: 'move' | 'dispatch'; pallet: Pallet }>();
  return <><a className="back-link" href="#/inventory"><ArrowLeft size={16}/> Stok Listesine Dön</a><ErrorBox>{error}</ErrorBox>{loading && <Loading/>}{data && <>
    <section className="panel pallet-summary"><div><div className="row wrap"><span className="eyebrow">PALET DETAYLARI</span><Badge value={data.pallet.status}/></div><h2>{data.pallet.code}</h2><LabelButton pallet={data.pallet}/><p>{data.pallet.productName} <span className="muted">· {data.pallet.sku}</span></p><small>Giriş tarihi: {date(data.pallet.createdAt)}</small>{data.pallet.receivingSessionId && <p className="mt-2"><a className="text-button" href={'#/receiving-sessions/' + data.pallet.receivingSessionId}>Mal Kabul Kaydı: {data.pallet.receivingSessionCode}</a></p>}</div><div className="pallet-balance"><strong>{number(data.pallet.quantity)}</strong><span>koli kaldı</span></div></section>
    <section className="panel pallet-location"><div><span className="eyebrow">MEVCUT KONUM</span><h3>{data.pallet.location?.path || 'Tamamı Sevk Edildi'}</h3><p className="muted">{data.pallet.location?.name || 'Bu paletin mevcut bir depolama konumu yok.'}</p></div>{data.pallet.status === 'ACTIVE' && <div className="actions wrap"><button className="btn secondary" onClick={() => setOperation({ type: 'move', pallet: data.pallet })}><ArrowRightLeft size={17}/>Palet Taşı</button><button className="btn dispatch-button" onClick={() => setOperation({ type: 'dispatch', pallet: data.pallet })}><ArrowUpFromLine size={17}/>Stok Çıkışı Yap</button></div>}</section>
    <section className="panel"><div className="panel-heading"><h2>Stok Hareketleri</h2><span className="muted text-sm">Eskiden yeniye · {number(data.movements.length)} hareket</span></div><MovementList movements={data.movements}/></section>
  </>}{operation && <Modal title={operation.type === 'move' ? 'Palet Taşı' : 'Stok Çıkışı Yap'} onClose={() => setOperation(undefined)}><OperationForm pallet={operation.pallet} type={operation.type} onDone={p => { setOperation(undefined); changed(`${p.code}: ${number(p.quantity)} koli kaldı. ${p.status === 'DISPATCHED' ? 'Paletin tamamı sevk edildi.' : 'İşlem kaydedildi.'}`); }}/></Modal>}</>;
}

export function MovementsScreen({ revision }: Shared) {
  const [search, setSearch] = useState(''); const [type, setType] = useState(''); const [page, setPage] = useState(0);
  const { data, error, loading } = useLoad<Page<Movement>>(`/movements?${query({ search, type, page })}`, revision);
  return <section className="panel"><div className="toolbar"><div className="search-input"><Search size={18}/><input aria-label="Stok Hareketi Ara" placeholder="Palet, stok kodu veya ürün ara…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></div><select aria-label="Hareket Türü" value={type} onChange={e => { setType(e.target.value); setPage(0); }}><option value="">Tüm Hareket Türleri</option><option value="RECEIPT">Giriş</option><option value="TRANSFER">Konum Değişikliği</option><option value="DISPATCH">Çıkış</option></select></div><ErrorBox>{error}</ErrorBox>{loading ? <Loading/> : data && <><MovementList movements={data.items}/><Pager data={data} onPage={setPage}/></>}</section>;
}

export function ProductsScreen({ revision, changed, user }: Shared & { user: User }) {
  const [search, setSearch] = useState(''); const [edit, setEdit] = useState<Product | 'new'>();
  const { data, error, loading } = useLoad<Product[]>(`/products?${query({ search })}`, revision);
  return <><section className="panel"><div className="toolbar"><div className="search-input"><Search size={18}/><input aria-label="Ürün Ara" placeholder="Stok kodu veya ürün adına göre ara…" value={search} onChange={e => setSearch(e.target.value)}/></div>{user.role === 'ADMIN' && <button className="btn" onClick={() => setEdit('new')}><Plus size={17}/>Yeni Ürün</button>}</div><ErrorBox>{error}</ErrorBox>{loading ? <Loading/> : data && (!data.length ? <Empty title="Ürün bulunamadı">Stok girişine başlamak için bir ürün oluşturun.</Empty> : <div className="product-grid">{data.map(p => <article className="product-card" key={p.id}><div className="row between"><span className="sku">{p.sku}</span><Badge value={p.active ? 'ACTIVE' : 'INACTIVE'}/></div><h3>{p.name}</h3><p>{p.description || 'Açıklama yok'}</p>{user.role === 'ADMIN' && <button className="text-button" onClick={() => setEdit(p)}>Ürünü Düzenle <ArrowRight size={15}/></button>}</article>)}</div>)}</section>{edit && <Modal title={edit === 'new' ? 'Ürün Oluştur' : 'Ürünü Düzenle'} onClose={() => setEdit(undefined)}><ProductForm product={edit === 'new' ? undefined : edit} onDone={() => { setEdit(undefined); changed('Ürün kaydedildi.'); }}/></Modal>}</>;
}

export function LocationsScreen({ revision, changed, user }: Shared & { user: User }) {
  const locations = useLoad<Location[]>('/locations', revision); const warehouses = useLoad<Warehouse[]>('/warehouses', revision);
  const [modal, setModal] = useState<'warehouse' | 'location'>(); const [search, setSearch] = useState('');
  const filtered = locations.data?.filter(l => `${l.path} ${l.name}`.toLowerCase().includes(search.toLowerCase())) || [];
  return <><div className="section-intro"><p>Depo → Bölge → Koridor → Raf → Raf Gözü<br/><span className="muted">Paletler raf gözlerinde veya bekleme alanlarında depolanabilir.</span></p>{user.role === 'ADMIN' && <div className="actions wrap"><button className="btn secondary" onClick={() => setModal('warehouse')}><Plus size={16}/>Depo</button><button className="btn" disabled={!warehouses.data?.length} onClick={() => setModal('location')}><Plus size={16}/>Konum</button></div>}</div><ErrorBox>{locations.error || warehouses.error}</ErrorBox>{locations.loading || warehouses.loading ? <Loading/> : <>
    <div className="search-input mb-5"><Search size={18}/><input aria-label="Konum Ara" placeholder="Konum yolu veya adına göre ara…" value={search} onChange={e => setSearch(e.target.value)}/></div>
    {!warehouses.data?.length && <Empty title="Henüz depo yok">Bir depo oluşturun, ardından konumlarını ve mal kabul alanını ekleyin.</Empty>}
    {warehouses.data?.map(w => <section className="panel warehouse-panel" key={w.id}><div className="panel-heading"><h2>{w.name}</h2><div className="actions wrap"><span className="sku">{w.code}</span><LabelButton locations={filtered.filter(l => l.warehouseId === w.id && l.selectable)}/></div></div>{!filtered.some(l => l.warehouseId === w.id) ? <Empty title="Eşleşen konum bulunamadı"/> : <div className="location-list">{filtered.filter(l => l.warehouseId === w.id).sort((a,b) => a.path.localeCompare(b.path)).map(l => <div className="location-row" key={l.id}><div><div className="row wrap"><strong>{l.name}</strong><Badge value={l.type}/></div><p>{l.path}</p></div>{l.selectable && <LabelButton locations={[l]}/ >}{l.selectable && <a className="btn secondary small" href={`#/inventory?locationId=${l.id}`}>Stoğu Gör <ArrowRight size={15}/></a>}</div>)}</div>}</section>)}
  </>}{modal && <Modal title={modal === 'warehouse' ? 'Depo Oluştur' : 'Konum Oluştur'} onClose={() => setModal(undefined)}>{modal === 'warehouse' ? <WarehouseForm onDone={() => { setModal(undefined); changed('Depo oluşturuldu.'); }}/> : <LocationForm warehouses={warehouses.data || []} locations={locations.data || []} onDone={() => { setModal(undefined); changed('Konum oluşturuldu.'); }}/>}</Modal>}</>;
}
