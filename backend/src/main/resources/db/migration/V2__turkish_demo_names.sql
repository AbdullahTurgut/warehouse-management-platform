-- Translate only unchanged demo text. Preserve codes, quantities and custom names.
UPDATE warehouse SET name = 'Ana Depo'
WHERE code = 'WH-01' AND name = 'Main warehouse';

UPDATE location AS l SET name = translations.turkish
FROM (VALUES
    ('RECEIVING', 'Receiving staging', 'Mal Kabul Alanı'),
    ('DISPATCH', 'Dispatch staging', 'Sevkiyat Bekleme Alanı'),
    ('A', 'General storage', 'Genel Depolama'),
    ('A-01', 'Aisle 01', 'Koridor 01'),
    ('A-01-R01', 'Rack 01', 'Raf 01'),
    ('A-01-R02', 'Rack 02', 'Raf 02'),
    ('A-01-R01-L1', 'Level 1', 'Seviye 1'),
    ('A-01-R01-L2', 'Level 2', 'Seviye 2'),
    ('A-01-R02-L1', 'Level 1', 'Seviye 1')
) AS translations(code, english, turkish)
WHERE l.code = translations.code AND l.name = translations.english
  AND l.warehouse_id IN (SELECT id FROM warehouse WHERE code = 'WH-01');

UPDATE product AS p SET name = translations.turkish
FROM (VALUES
    ('BOX-100', 'Packing cartons', 'Ambalaj Kolileri'),
    ('TAPE-200', 'Packing tape', 'Koli Bandı'),
    ('WRAP-300', 'Stretch wrap', 'Streç Film'),
    ('GLOVE-400', 'Work gloves', 'İş Eldivenleri')
) AS translations(sku, english, turkish)
WHERE p.sku = translations.sku AND p.name = translations.english;

UPDATE product AS p SET description = translations.turkish
FROM (VALUES
    ('BOX-100', 'Medium corrugated cartons', 'Orta boy oluklu mukavva koliler'),
    ('TAPE-200', 'Clear tape cartons', 'Şeffaf koli bandı kolileri'),
    ('WRAP-300', 'Pallet wrap cartons', 'Palet streç filmi kolileri'),
    ('GLOVE-400', 'Warehouse glove cartons', 'Depo iş eldiveni kolileri')
) AS translations(sku, english, turkish)
WHERE p.sku = translations.sku AND p.description = translations.english;

UPDATE stock_movement AS m SET reference = translations.turkish
FROM (VALUES
    ('Demo opening receipt', 'Örnek başlangıç stok girişi'),
    ('Prototype runtime smoke check', 'Prototip çalışma kontrolü')
) AS translations(english, turkish)
WHERE m.reference = translations.english AND m.actor = 'admin'
  AND m.type = 'RECEIPT'
  AND m.destination_id IN (SELECT l.id FROM location l JOIN warehouse w ON w.id = l.warehouse_id WHERE w.code = 'WH-01')
  AND m.pallet_id IN (SELECT p.id FROM pallet p JOIN product pr ON pr.id = p.product_id WHERE pr.sku IN ('BOX-100', 'TAPE-200', 'WRAP-300', 'GLOVE-400'));
