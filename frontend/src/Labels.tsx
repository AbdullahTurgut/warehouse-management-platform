import { useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { api } from './api';
import type { Detail, Location, Pallet } from './types';
import { message } from './ui';

export function LabelButton({ pallet, locations }: { pallet?: Pallet; locations?: Location[] }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function print() {
    // Open during the click so browser popup protection does not block the async label preparation.
    const popup = window.open('', '_blank', 'width=800,height=750');
    if (!popup) { setError('Etiket penceresi açılamadı. Bu site için açılır pencerelere izin verin.'); return; }
    popup.opener = null; popup.document.title = 'Etiket Hazırlanıyor';
    setBusy(true); setError('');
    try {
      const labels: { code: string; lines: string[] }[] = [];
      if (pallet) {
        const { pallet: p } = await api<Detail>('/pallets/' + pallet.id);
        labels.push({ code: p.code, lines: [p.productName, 'SKU: ' + p.sku, 'Koli: ' + p.quantity.toLocaleString('tr-TR'), 'Miktar, etiket basım anına aittir.'] });
      } else {
        for (const l of locations || []) if (l.active && l.selectable) labels.push({ code: 'LOC-' + l.id, lines: [l.code, l.path, l.name] });
      }
      if (!labels.length) throw new Error('Yazdırılabilecek aktif konum bulunamadı.');
      const doc = popup.document;
      const style = doc.createElement('style');
      style.textContent = '@page{margin:12mm}body{font:18px Arial,sans-serif;color:#000;background:#fff;margin:16px}.label{width:100mm;max-width:100%;box-sizing:border-box;padding:6mm;border:1px solid #000;break-inside:avoid;margin-bottom:8mm;overflow-wrap:anywhere}.label h1{font-size:26px;margin:0 0 4mm}.label p{margin:2mm 0}.qr{width:32mm;height:32mm;display:block}.barcode{width:85mm;max-width:100%;height:auto}button{padding:12px;margin-bottom:16px}@media print{button{display:none}.label{break-after:page;margin:0}.label:last-child{break-after:auto}}';
      doc.head.append(style); doc.documentElement.lang = 'tr'; doc.title = 'Depo Etiketleri';
      const button = doc.createElement('button'); button.textContent = 'Yazdır / PDF Kaydet'; button.onclick = () => popup.print(); doc.body.replaceChildren(button);
      for (const label of labels) {
        const article = doc.createElement('article'); article.className = 'label';
        const heading = doc.createElement('h1'); heading.textContent = label.code; article.append(heading);
        for (const line of label.lines) { const p = doc.createElement('p'); p.textContent = line; article.append(p); }
        const qr = doc.createElement('div'); qr.className = 'qr'; qr.innerHTML = await QRCode.toString(label.code, { type: 'svg', margin: 4 }); article.append(qr);
        const barcode = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); barcode.classList.add('barcode');
        JsBarcode(barcode, label.code, { format: 'CODE128', displayValue: true, margin: 12, height: 55, fontSize: 18 }); article.append(barcode);
        doc.body.append(article);
      }
      popup.focus();
    } catch (e) { popup.close(); setError(message(e)); } finally { setBusy(false); }
  }
  return <span><button type="button" className="btn secondary small" disabled={busy || (!pallet && !locations?.length)} onClick={() => void print()}>{busy ? 'Etiket Hazırlanıyor…' : locations && locations.length > 1 ? 'Konum Etiketlerini Yazdır' : 'Etiket Yazdır'}</button><span role="alert">{error}</span></span>;
}