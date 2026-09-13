import type { FormEvent } from 'react';

// Display labels only; API values and stored identifiers remain unchanged.
const labels: Record<string, string> = {
  RECEIPT: 'Giriş', TRANSFER: 'Konum Değişikliği', DISPATCH: 'Çıkış', ADJUSTMENT: 'Düzeltme',
  ACTIVE: 'Aktif', INACTIVE: 'Pasif', DISPATCHED: 'Sevk Edildi',
  ADMIN: 'Yönetici', OPERATOR: 'Operatör',
  ZONE: 'Bölge', AISLE: 'Koridor', RACK: 'Raf', SHELF: 'Raf Gözü', STAGING: 'Bekleme Alanı',
};
export const displayLabel = (value: string) => labels[value] || value;

const errors: Record<string, string> = {
  'Sign in with a valid username and password': 'Geçerli bir kullanıcı adı ve şifre ile giriş yapın.',
  'An Admin account is required for this action': 'Bu işlem için yönetici yetkisi gereklidir.',
  'Zones and staging locations must be directly under the warehouse': 'Bölgeler ve bekleme alanları doğrudan depoya bağlı olmalıdır.',
  'Parent must be active and in the same warehouse': 'Üst konum aktif olmalı ve aynı depoda bulunmalıdır.',
  'Choose an active shelf or staging location': 'Aktif bir raf gözü veya bekleme alanı seçin.',
  'This operation was already recorded. Refresh inventory before continuing.': 'Bu işlem zaten kaydedildi. Devam etmeden önce stokları yenileyin.',
  'This pallet changed. Refresh and check the remaining stock before retrying.': 'Palet bilgileri değişti. Tekrar denemeden önce yenileyip kalan stoğu kontrol edin.',
  'This pallet has already been fully dispatched': 'Bu paletin tamamı zaten sevk edildi.',
  'Inactive products cannot be received': 'Pasif ürünler için stok girişi yapılamaz.',
  'Choose a different destination': 'Mevcut konumdan farklı bir hedef konum seçin.',
  'Interwarehouse transfers are outside this prototype': 'Bu prototipte depolar arası taşıma desteklenmiyor.',
  'Invalid request. Check IDs, whole-carton quantities and required fields.': 'Geçersiz istek. Seçimleri, tam sayı olarak girilen koli miktarını ve zorunlu alanları kontrol edin.',
  'A code or operation ID already exists, or this change violates an inventory rule. Refresh and check your entries.': 'Kod veya işlem numarası zaten kayıtlı ya da bu değişiklik stok kurallarına uygun değil. Bilgileri yenileyip girişlerinizi kontrol edin.',
  'Another operation changed this pallet. Refresh before retrying.': 'Başka bir işlem bu paletin bilgilerini değiştirdi. Tekrar denemeden önce yenileyin.',
};
const fields: Record<string, string> = {
  sku: 'Stok kodu (SKU)', name: 'Ad', description: 'Açıklama', code: 'Kod',
  quantity: 'Koli miktarı', productId: 'Ürün', locationId: 'Konum', warehouseId: 'Depo',
  palletId: 'Palet', parentId: 'Üst konum', type: 'Konum türü', version: 'Palet sürümü',
  requestId: 'İşlem numarası', reference: 'Referans',
};
const entities: Record<string, string> = {
  Product: 'Ürün', Warehouse: 'Depo', Location: 'Konum', 'Parent location': 'Üst konum', Pallet: 'Palet',
  SKU: 'Stok kodu (SKU)', 'Product name': 'Ürün adı', 'Warehouse code': 'Depo kodu',
  'Warehouse name': 'Depo adı', 'Location code': 'Konum kodu', 'Location name': 'Konum adı',
};

export function apiError(value: unknown, status: number): string {
  const text = typeof value === 'string' ? value : '';
  if (errors[text]) return errors[text];
  const available = text.match(/^Dispatch quantity exceeds the available (\d+) cartons$/);
  if (available) return `Çıkış miktarı mevcut ${Number(available[1]).toLocaleString('tr-TR')} koliyi aşamaz.`;
  const parent = text.match(/^Parent must be a (ZONE|AISLE|RACK)$/);
  if (parent) return `Üst konum türü ${displayLabel(parent[1])} olmalıdır.`;
  const entity = text.match(/^(.+) (not found|is required)$/);
  if (entity && entities[entity[1]]) return `${entities[entity[1]]} ${entity[2] === 'not found' ? 'bulunamadı.' : 'zorunludur.'}`;
  if (text.includes(': ')) {
    const translated = text.split('; ').map(part => {
      const [field, rule] = part.split(': ');
      if (!fields[field]) return null;
      if (rule === 'must not be null' || rule === 'must not be blank') return `${fields[field]} zorunludur.`;
      if (rule === 'must be greater than 0') return `${fields[field]} sıfırdan büyük olmalıdır.`;
      if (rule === 'must be greater than or equal to 0') return `${fields[field]} sıfır veya daha büyük olmalıdır.`;
      const size = rule?.match(/^size must be between (\d+) and (\d+)$/);
      if (size) return `${fields[field]} en fazla ${Number(size[2]).toLocaleString('tr-TR')} karakter olmalıdır.`;
      return `${fields[field]} alanını kontrol edin.`;
    });
    if (translated.every(Boolean)) return translated.join(' ');
  }
  if (status === 401) return 'Oturum açılamadı. Kullanıcı adı ve şifrenizi kontrol edin.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'İstenen kayıt bulunamadı. Bilgileri yenileyin.';
  if (status === 409) return 'Bilgiler değişmiş veya işlem zaten kaydedilmiş olabilir. Yenileyip kontrol edin.';
  if (status === 400) return 'Girilen bilgileri ve zorunlu alanları kontrol edin.';
  return `İşlem tamamlanamadı (${status}). Sunucu bağlantısını kontrol edip bilgileri yenileyin.`;
}

// Keep native form constraints, but show Turkish messages even in an English browser.
export function clearValidation(event: FormEvent<HTMLElement>) {
  const field = event.target;
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.setCustomValidity('');
}
export function turkishValidation(event: FormEvent<HTMLElement>) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
  field.setCustomValidity('');
  const validity = field.validity;
  let text = 'Lütfen bu alana geçerli bir değer girin.';
  if (validity.valueMissing) text = field instanceof HTMLSelectElement ? 'Lütfen bir seçim yapın.' : 'Lütfen bu alanı doldurun.';
  else if (validity.badInput || validity.stepMismatch) text = 'Lütfen tam sayı girin.';
  else if (validity.rangeUnderflow && field instanceof HTMLInputElement) text = `Değer en az ${Number(field.min).toLocaleString('tr-TR')} olmalıdır.`;
  else if (validity.rangeOverflow && field instanceof HTMLInputElement) text = `Değer en fazla ${Number(field.max).toLocaleString('tr-TR')} olmalıdır.`;
  else if (validity.tooLong) text = 'Girilen metin izin verilen uzunluğu aşıyor.';
  field.setCustomValidity(text);
}
