import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDownToLine, Boxes, CheckCircle2, ClipboardList, LayoutDashboard, LogOut, MapPin, Package, RefreshCw, Warehouse as WarehouseIcon, WifiOff, X } from 'lucide-react';
import { api, clearCredentials, setCredentials } from './api';
import { clearValidation, displayLabel, turkishValidation } from './turkish';
import type { User } from './types';
import { ErrorBox, Field, Loading, message, useOnline } from './ui';
import { DashboardScreen, InventoryScreen, LocationsScreen, MovementsScreen, PalletScreen, ProductsScreen, ReceiveScreen } from './Screens';

const navigation = [
  { path: 'dashboard', label: 'Genel Bakış', Icon: LayoutDashboard, description: 'Deponuzun güncel durumunu tek ekranda görün.' },
  { path: 'inventory', label: 'Stok', Icon: Boxes, description: 'Paletleri, kalan koli miktarlarını ve konumlarını bulun.' },
  { path: 'receive', label: 'Mal Kabul', Icon: ArrowDownToLine, description: 'Gelen paleti kaydedin ve depodaki konumunu belirleyin.' },
  { path: 'movements', label: 'Stok Hareketleri', Icon: ClipboardList, description: 'Tüm giriş, konum değişikliği ve çıkış işlemleri bir arada.' },
  { path: 'products', label: 'Ürünler', Icon: Package, description: 'Deponuzdaki ürünleri yönetin.' },
  { path: 'locations', label: 'Konumlar', Icon: MapPin, description: 'Deponuzu bölgelerden raf gözlerine kadar düzenleyin.' },
];

export default function App() {
  const [user, setUser] = useState<User>(); const [route, setRoute] = useState(window.location.hash.slice(2) || 'dashboard');
  const [restoring, setRestoring] = useState(true); const [sessionError, setSessionError] = useState('');
  useEffect(() => { let active = true; api<User>('/auth/me').then(value => { if (active) setUser(value); }).catch(() => {}).finally(() => { if (active) setRestoring(false); }); return () => { active = false; }; }, []);
  const [revision, setRevision] = useState(0); const [notice, setNotice] = useState(''); const online = useOnline();
  useEffect(() => { const change = () => setRoute(window.location.hash.slice(2) || 'dashboard'); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 7000); return () => clearTimeout(timer); }, [notice]);
  function changed(text: string) { setNotice(text); setRevision(v => v + 1); }
  if (restoring) return <Loading/>;
  if (!user) return <Login onLogin={value => { clearCredentials(); setSessionError(''); setUser(value); }}/>;
  const page = route.split('?')[0]; const isPallet = /^pallets\/\d+$/.test(page);
  const current = navigation.find(n => n.path === page) || navigation[0];
  const shared = { revision, changed };
  return <div className="app-shell" onInvalidCapture={turkishValidation} onInputCapture={clearValidation} onChangeCapture={clearValidation}><aside className="sidebar"><a href="#/dashboard" className="brand"><span className="brand-icon"><WarehouseIcon size={24}/></span><span>stockroom<small>DEPO YÖNETİMİ</small></span></a><span className="nav-label">ÇALIŞMA ALANI</span><nav>{navigation.map(({ path, label, Icon }) => <a key={path} href={`#/${path}`} className={(page === path || (path === 'inventory' && isPallet)) ? 'selected' : ''}><Icon size={19}/><span>{label}</span></a>)}</nav><div className="sidebar-footer"><div className="avatar">{user.username[0].toUpperCase()}</div><div><strong>{user.username}</strong><small>{displayLabel(user.role)}</small></div><button title="Çıkış Yap" aria-label="Çıkış Yap" className="icon-btn" onClick={async () => { try { await api('/auth/logout', 'POST'); clearCredentials(); setUser(undefined); setNotice(''); setSessionError(''); } catch (e) { setSessionError(message(e)); } }}><LogOut size={18}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><span><span className="status-dot"/> Depo Yönetimi</span><span className="prototype-label">FAZ 1 · PROTOTİP</span></header><main><div className="page-heading"><div><span className="eyebrow">İŞLEMLER / {isPallet ? 'STOK' : current.label.toLocaleUpperCase('tr-TR')}</span><h1>{isPallet ? 'Palet Detayı' : current.label}</h1><p>{isPallet ? 'Kalan stoğu kontrol edin, paleti taşıyın veya stok çıkışı yapın.' : current.description}</p></div><div className="actions"><button className="btn secondary icon-only" aria-label="Bilgileri Yenile" title="Bilgileri Yenile" onClick={() => setRevision(v => v + 1)}><RefreshCw size={17}/></button>{page !== 'receive' && <a href="#/receive" className="btn"><ArrowDownToLine size={18}/>Palet Girişi Yap</a>}</div></div>
    <ErrorBox>{sessionError}</ErrorBox>
    {!online && <div className="error-box"><WifiOff size={18}/>Bağlantı yok. Görüntülenen stok güncel olmayabilir. İşlem kaydetmek için yeniden bağlanın.</div>}
    {notice && <div role="status" className="success-box"><CheckCircle2 size={19}/><span>{notice}</span><button className="icon-btn" aria-label="Bildirimi Kapat" onClick={() => setNotice('')}><X size={17}/></button></div>}
    <div key={route}>
      {isPallet ? <PalletScreen {...shared} id={Number(page.split('/')[1])}/> : page === 'inventory' ? <InventoryScreen {...shared}/> : page === 'receive' ? <ReceiveScreen {...shared}/> : page === 'products' ? <ProductsScreen {...shared} user={user}/> : page === 'locations' ? <LocationsScreen {...shared} user={user}/> : page === 'movements' ? <MovementsScreen {...shared}/> : <DashboardScreen {...shared}/>}
    </div></main><footer className="main-footer">Stockroom · Çevrimiçi Stok İşlemleri<span>Miktarlar tam koli olarak takip edilir.</span></footer></div></div>;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const online = useOnline();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    setCredentials(String(form.get('username')), String(form.get('password')));
    try { onLogin(await api<User>('/auth/me')); } catch(e) { clearCredentials(); setError(message(e)); } finally { setBusy(false); }
  }
  return <div className="login-page" onInvalidCapture={turkishValidation} onInputCapture={clearValidation} onChangeCapture={clearValidation}><section className="login-story"><a href="#/dashboard" className="brand"><span className="brand-icon"><WarehouseIcon size={27}/></span><span>stockroom<small>DEPO YÖNETİMİ</small></span></a><div><span className="eyebrow">KOLAY İŞLEM. NET STOK TAKİBİ.</span><h1>Her paletin yeri belli.<br/>Her hareket kayıtlı.</h1><p>Mal kabulden son kolinin sevkiyatına kadar deponuzdaki tüm stokları takip edin.</p></div><span className="login-caption">MAL KABUL → DEPOLAMA → TAŞIMA → SEVKİYAT</span></section><section className="login-card"><span className="eyebrow">STOCKROOM’A HOŞ GELDİNİZ</span><h2>Depo Yönetimine Giriş Yapın</h2><p className="muted">Stoklarınızı kolayca ve güvenle yönetin.</p><form onSubmit={submit} className="form-stack"><ErrorBox>{error || (!online ? 'Giriş yapmak için yeniden bağlanın.' : '')}</ErrorBox><Field label="Kullanıcı Adı"><input name="username" autoComplete="username" required autoFocus placeholder="admin veya operator"/></Field><Field label="Şifre"><input name="password" type="password" autoComplete="current-password" required/></Field><button className="btn" disabled={busy || !online}>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</button></form><div className="demo-note"><strong>Yerel Demo Hesapları</strong><span>admin / admin123</span><span>operator / operator123</span><small>Sunucu ayarlarında şifreler değiştirilmediyse bu hesapları kullanabilirsiniz. Oturumunuz sayfa yenilemelerinde korunur.</small></div></section></div>;
}
