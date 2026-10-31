# Seed datası

| Fayl | Mənbə | Məzmun | Status |
| --- | --- | --- | --- |
| `stops.json` | AYNA xəritə API-si (map.ayna.gov.az), 17.10.2026 | 3 456 dayanacaq: id, kod, ad, lat/lon, `isTransportHub`, dayanan marşrutlar (`busId`, `number`, `directionTypeId`, `order`, `towards`) | ✅ |
| `buses.json` | AYNA xəritə API-si | 208 marşrut: `busId`, `number`, `carrier`, `tariffAzn`, `lengthKm`, `durationMin`, `firstPoint`, `lastPoint`, `directions: {"1": [stopId...], "2": [...]}` | ✅ |
| `bus-lines-ayna.geojson` | AYNA xəritə API-si | 398 LineString, hər istiqamət ayrıca; `properties: {busId, number, directionTypeId}` | ✅ |
| `bakubus_daily_2026.csv` | opendata.az, "Bakı Metropoliteni" QSC | BakuBus gündəlik gediş sayı: `Tarix`, `Marşrutun adı`, `Gündəlik gediş sayı`; 01.01–30.09.2026, 65 marşrut | ✅ |
| `metro_daily_2026.csv` | opendata.az, "Bakı Metropoliteni" QSC | metro stansiyaları üzrə gündəlik gediş; 27 stansiya | ✅ (istəyə görə) |
| `metro_exits.csv` | opendata.az | 98 metro çıxışı. Ayırıcı `;`, koordinatlar ×10⁶. "28 May" adı mənbədə tarixə çevrilib | ✅ (istəyə görə) |
| `extra/app-hubs.json` | bizim emal (AYNA API + parklanma) | 6 AYNA hub-ı: dayanacaqlar, `busIndex`, metro, skuter/velo parkı sayı | istəyə görə (hub-lar üçün) |
| `extra/ayna-hubs.json` | AYNA API | `isTransportHub` dayanacaq qrupları (27 dayanacaq) | istəyə görə |
| `extra/parks.geojson` | AYNA hakaton KMZ | 779 skuter (MPS) / velo (MPV) parklanması | istəyə görə |
| `extra/lanes.geojson` | AYNA hakaton KMZ | velo zolaqları (~57 km) | istəyə görə |
| `fallback/bus-lines.geojson` | AYNA hakaton KMZ faylından | 239 marşrut xətti (dayanacaqsız), `properties: {id, name}` | ehtiyat |
| `fallback/routes.json` | bizim emal | 239 marşrut + BakuBus orta gündəlik gediş (63 marşrut) | ehtiyat |
| `fallback/metro.json` | bizim emal | 27 stansiya: orta gündəlik gediş, çıxış koordinatları | ehtiyat |

## Qeydlər
- **CSV oxuyanda:**
  - fayllar UTF-8 BOM ilə başlayır;
  - tarix sütunu `"2026-01-01 00:00:00,000"` formatındadır;
  - marşrut adları mətndir ("5", "125", "E1").
- **Marşrut uyğunlaşdırması:** `buses.json.number` ↔ CSV `Marşrutun adı` (mətn kimi müqayisə et).
- **Əsas fayllar:** `stops.json` (3 456), `buses.json` (208), `bus-lines-ayna.geojson` (398 xətt). `stops.json` və `buses.json` `{source, fetchedAt, items: [...]}` formatındadır.
- **Yoxlanmış nümunə:** 49 nömrəli marşrut (busId 37), istiqamət 1: 58 dayanacaq, ilk dayanacaq "28 May m/st" (id 105).
- **`fallback/`** lazım deyil, yalnız ehtiyat üçündür.
