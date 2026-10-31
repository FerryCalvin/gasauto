# GasAuto - Smart Prepaid Gas Meter & IoT Digital Twin Simulation

Sistem pintar prabayar meter gas terintegrasi IoT dengan enkripsi token STS 20-digit, arsitektur proteksi **Anti-Rugi (Mode A: Predictive Cutoff & Overdraft Reconciliation)**, dan simulator fisik virtual (*Digital Twin*) interaktif.

---

## 🎯 Gambaran Sistem

Sistem ini merealisasikan operasional meteran gas pintar utilitas (seperti PGN/LNG prabayar) dari hulu ke hilir:
1. **Transaksi Pembelian Token**: Pelanggan membeli kuota gas dengan mata uang Rupiah. Sistem menghitung konversi volume gas ($m^3$) berdasarkan tarif dasar dinamis (misal Rp 11.500 / $m^3$).
2. **Standar Token STS 20 Digit**: Kode token acak terformat `XXXX-XXXX-XXXX-XXXX-XXXX` yang terikat kriptografis pada nomor seri meter pelanggan, mencegah *replay attack* dan pencurian token antar-rumah.
3. **Kendali Katup Otomatis**: Katup motorik (*motorized ball valve*) terbuka menyalurkan gas, sensor pulsa menghitung aliran gas secara berkala, dan katup menutup otomatis saat kuota habis.
4. **Proteksi Anti-Rugi (Mode A)**:
   - **Bukan Throttling Perlahan**: Penutupan katup bertahap sangat berbahaya pada pipa gas karena penurunan tekanan menyebabkan api kompor kuning, pembentukan gas beracun Karbon Monoksida ($CO$), atau api padam sementara gas bertekanan rendah tetap merembes keluar.
   - **Predictive Cutoff Latency Compensation**: Katup CWX-15Q membutuhkan waktu mekanis $\approx 2.5\text{ detik}$ untuk menutup rapat. Sistem menghitung laju alir sesaat ($Q$) dan mengirim perintah tutup sebelum kuota habis:
     $$V_{\text{trigger}} = Q_{\text{flow}} \times t_{\text{valve\_close}}$$
   - **Overdraft Ledger**: Setiap gas sisa yang lolos selama proses penutupan dicatat ke buku besar saldo minus (`overdraftM3`), yang otomatis dipotong saat pelanggan memasukkan token baru. Perusahaan **100% tidak pernah rugi**.
5. **Universal IoT Connectivity**:
   - **WiFi Rumah Tangga & Seluler 4G LTE/GSM**: Protokol MQTT over TLS berbasis JSON.
   - **NB-IoT**: Protokol hemat daya baterai (MQTT-SN / CoAP).
   - **LoRaWAN**: Adapter webhook dengan enkoder/dekoder *compact binary hex* 10-byte untuk jarak jauh tanpa kartu SIM bulanan.

---

## 🛠️ Tech Stack

### Perangkat Lunak & Simulasi
- **Backend**: Node.js (TypeScript) + Express + WebSocket (`ws`) + Architecture Clean/SOLID
- **Testing**: Vitest dengan Coverage v8 (36 Unit & Integration Tests, 82%+ Coverage)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide React + Web Audio API Synthesizer
- **Protokol Real-time**: WebSocket Live Telemetry Stream (1000 ms per tick)

### Perangkat Keras Fisik (Masa Depan)
- **Mikrokontroler**: ESP32-WROOM-32 (Dual Core, WiFi + BLE)
- **Katup Pengendali**: Motorized Ball Valve 5V CWX-15Q / CR02 (Limit switches internal)
- **Driver Katup**: H-Bridge DRV8833 / Relay Dual Channel (GPIO 18 & 19)
- **Sensor Aliran**: Diaphragm Pulse Reed Contact / Hall Effect YF-B1 (100 imp/m³) (GPIO 4 Interrupt)
- **Antarmuka Pengguna**: Layar LCD 1602 I2C (PCF8574, SDA GPIO 21, SCL GPIO 22), Keypad Matriks 4x4 (GPIO 13, 12, 14, 27, 26, 25, 33, 32), Piezo Buzzer 5V (GPIO 5)

---

## 🚀 Cara Menjalankan Proyek

### 1. Instalasi Dependensi
```bash
npm run install:all
```

### 2. Menjalankan Mode Pengembangan (Hot Reload)
Jalankan backend dan frontend di terminal terpisah:
```bash
# Terminal 1: Backend Server (Port 3001)
npm run dev:backend

# Terminal 2: Frontend Vite (Port 5175)
npm run dev:frontend
```
Buka browser di `http://localhost:5175`.

### 3. Build & Jalankan Mode Produksi (Single Port 3001)
```bash
# Build backend dan frontend
npm run build

# Start server produksi (menyajikan API + Website sekaligus)
npm start
```
Buka browser di `http://localhost:3001`.

---

## 🧪 Pengujian & Test Coverage

Proyek dilengkapi pengujian unit dan integrasi dengan Vitest:
```bash
# Menjalankan seluruh test suite
npm test

# Menjalankan test coverage report
npm run test:coverage
```

### Hasil Test Suite:
- **TariffService.test.ts**: 7/7 tests passed (Uji tarif dinamis, konversi Rupiah $\rightarrow m^3$, validasi boundary)
- **TokenService.test.ts**: 6/6 tests passed (Uji integritas STS 20-digit, anti-tampering, pencegahan replay)
- **MeterEngine.test.ts**: 8/8 tests passed (Uji beban kompor, predictive cutoff, toleransi overdraft, rekonsiliasi top-up)
- **LoraAdapter.test.ts**: 4/4 tests passed (Uji encoding/decoding 10-byte binary hex dan verifikasi CRC-8)
- **ApiServer.test.ts**: 11/11 tests passed (Uji integrasi REST API HTTP end-to-end)

**Total: 36 Tests Passed (100% Success, Coverage > 82%)**

---

## 📡 Spesifikasi Format Data IoT

### 1. JSON Telemetri (WiFi / 4G / NB-IoT)
Topik MQTT: `gas/meter/{meter_id}/telemetry`
```json
{
  "meter_id": "GAS-PLG-001",
  "serial_number": "SN-2026-GAS01",
  "flow_rate_lpm": 1.5,
  "volume_total_m3": 12.3456,
  "remaining_quota_m3": 4.2500,
  "overdraft_m3": 0.0,
  "valve_status": "OPEN",
  "valve_angle_deg": 90,
  "battery_pct": 98,
  "rssi_dbm": -65,
  "network_type": "WIFI",
  "is_alert": false,
  "timestamp": 1793235744
}
```

### 2. LoRaWAN Binary Hex (10 Byte Uplink)
Contoh Payload: `470D00138800006287C2`
- `Byte 0`: Header `0x47` ('G')
- `Byte 1`: Status Katup, Tipe Jaringan, Bendera Alert
- `Byte 2-4`: Sisa Kuota ($m^3 \times 1000$)
- `Byte 5-6`: Laju Alir ($L/\text{min} \times 100$)
- `Byte 7`: Level Baterai (%)
- `Byte 8`: Offset RSSI (dBm + 200)
- `Byte 9`: Checksum CRC-8 Dallas/Maxim
