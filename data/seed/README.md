# Seed datası

Mənbələr: **AYNA ictimai xəritə xidməti** (map.ayna.gov.az) və **opendata.az**.

| Fayl | Mənbə | Məzmun |
| --- | --- | --- |
| `stops.json` | AYNA ictimai xəritə xidməti, 17.10.2026 | 3 456 dayanacaq: id, kod, ad, lat/lon, `isTransportHub`, dayanan marşrutlar (`busId`, `number`, `directionTypeId`, `order`, `towards`) |
| `buses.json` | AYNA ictimai xəritə xidməti | 208 marşrut: `busId`, `number`, `carrier`, `tariffAzn`, `lengthKm`, `durationMin`, `firstPoint`, `lastPoint`, `directions: {"1": [stopId...], "2": [...]}` |
| `bus-lines-ayna.geojson` | AYNA ictimai xəritə xidməti | 398 LineString, hər istiqamət ayrıca; `properties: {busId, number, directionTypeId}` |
| `bakubus_daily_2026.csv` | opendata.az, "Bakı Metropoliteni" QSC | BakuBus gündəlik gediş sayı: `Tarix`, `Marşrutun adı`, `Gündəlik gediş sayı`; 01.01–30.09.2026, 65 marşrut |
| `metro_daily_2026.csv` | opendata.az, "Bakı Metropoliteni" QSC | metro stansiyaları üzrə gündəlik gediş; 27 stansiya (istəyə görə) |
| `metro_exits.csv` | opendata.az | 98 metro çıxışı. Ayırıcı `;`, koordinatlar ×10⁶. "28 May" adı mənbədə tarixə çevrilib (istəyə görə) |

## Qeydlər

- `stops.json` və `buses.json` `{source, fetchedAt, items: [...]}` formatındadır.
- **CSV-ni oxuyanda nəzərə al:**
  - fayllar UTF-8 BOM ilə başlayır;
  - tarix sütunu `"2026-01-01 00:00:00,000"` formatındadır;
  - marşrut adları mətndir ("5", "125", "E1").
- **Marşrut uyğunlaşdırması:** `buses.json.number` ↔ CSV `Marşrutun adı` (mətn kimi müqayisə olunur).
- **Yoxlanmış nümunə:** 49 nömrəli marşrut (busId 37), istiqamət 1: 58 dayanacaq, ilk dayanacaq "28 May m/st" (id 105).
- **Mənbədəki defektlər** seed zamanı düzəldilir (bax `docs/ADR.md`, ADR-006):
  - 6 dayanacağın koordinatı `null`-dur;
  - 7 marşrutun dayanacağı yoxdur;
  - bəzi xətlərdə lat/lon yerləri dəyişib, bəzi xətlər dayanacaqlara uyğun deyil.
