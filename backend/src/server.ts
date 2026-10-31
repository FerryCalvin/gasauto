import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { AddressInfo } from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { TariffService } from './services/TariffService.js';
import { TokenService } from './services/TokenService.js';
import { MeterEngine } from './services/MeterEngine.js';
import { LoraAdapter } from './services/LoraAdapter.js';
import { TransactionRecord, NetworkType } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

export const app = express();
export const server = http.createServer(app);
export const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(frontendDist));

// Inisialisasi Service Layer
export const tariffService = new TariffService({
  pricePerM3: 11500, // Rp 11.500 / m³
  warningThresholdPct: 10, // 10%
  valveCloseDurationSec: 2.5
});

export const tokenService = new TokenService();

export const METER_ID = 'GAS-PLG-001';
export const METER_SERIAL = 'SN-2026-GAS01';

export const meterEngine = new MeterEngine(
  METER_ID,
  METER_SERIAL,
  'Keluarga Budi Santoso',
  'Jl. Melati Blok C No. 15, Surabaya',
  tariffService,
  tokenService,
  5.0 // Saldo awal simulasi: 5.0 m³
);

// Riwayat Transaksi & Audit
export const transactions: TransactionRecord[] = [
  {
    id: 'TRX-INIT-001',
    meterId: METER_ID,
    type: 'PURCHASE',
    amountIdr: 57500,
    volumeM3: 5.0,
    description: 'Saldo Awal Instalasi Meter Prabayar (5.0 m³)',
    timestamp: new Date().toISOString()
  }
];

// Siarkan pembaruan telemetri ke semua WebSocket client
export function broadcastTelemetry() {
  const telemetry = meterEngine.generateTelemetryPacket();
  const state = meterEngine.getState();
  const appliances = meterEngine.getAppliances();
  const tariff = tariffService.getConfig();
  const vTrigger = meterEngine.getPredictiveCutoffTriggerVolume();
  const loraHex = LoraAdapter.encodeTelemetry(telemetry);

  const payload = JSON.stringify({
    type: 'TELEMETRY_UPDATE',
    telemetry,
    state,
    appliances,
    tariff,
    vTrigger,
    loraHex,
    timestamp: Date.now()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Simulasi Loop Fisik
let simulationTimer: any = null;
export function startSimulationLoop() {
  if (simulationTimer) return;
  simulationTimer = setInterval(() => {
    const result = meterEngine.tick(1.0);

    if (result.event === 'OVERDRAFT_RECORDED') {
      transactions.unshift({
        id: `TRX-OVD-${Date.now().toString().slice(-6)}`,
        meterId: METER_ID,
        type: 'OVERDRAFT_DEDUCTION',
        volumeM3: result.state.overdraftM3,
        description: `Pencatatan sisa gas lolos (overrun) saat penutupan katup: ${result.state.overdraftM3.toFixed(4)} m³`,
        timestamp: new Date().toISOString()
      });
    }

    broadcastTelemetry();
  }, 1000);
}

export function stopSimulationLoop() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

// --- REST API ENDPOINTS ---

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/meter', (req: Request, res: Response) => {
  res.json({
    state: meterEngine.getState(),
    appliances: meterEngine.getAppliances(),
    telemetry: meterEngine.generateTelemetryPacket(),
    vTrigger: meterEngine.getPredictiveCutoffTriggerVolume(),
    loraHex: LoraAdapter.encodeTelemetry(meterEngine.generateTelemetryPacket())
  });
});

app.get('/api/tariff', (req: Request, res: Response) => {
  res.json(tariffService.getConfig());
});

app.put('/api/tariff', (req: Request, res: Response) => {
  try {
    const updated = tariffService.updateConfig(req.body);
    transactions.unshift({
      id: `TRX-TRF-${Date.now().toString().slice(-6)}`,
      meterId: METER_ID,
      type: 'TARIFF_UPDATE',
      volumeM3: 0,
      description: `Perubahan tarif admin: Rp ${updated.pricePerM3.toLocaleString('id-ID')}/m³, Ambang: ${updated.warningThresholdPct}%`,
      timestamp: new Date().toISOString()
    });
    broadcastTelemetry();
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/tokens/purchase', (req: Request, res: Response) => {
  try {
    const { amountIdr, meterId = METER_ID } = req.body;
    if (!amountIdr || amountIdr <= 0) {
      return res.status(400).json({ error: 'Nominal Rupiah harus lebih besar dari 0' });
    }

    const { volumeM3, pricePerM3 } = tariffService.calculateVolumeFromRupiah(amountIdr);
    const token = tokenService.generateToken(meterId, amountIdr, volumeM3);

    transactions.unshift({
      id: `TRX-BUY-${Date.now().toString().slice(-6)}`,
      meterId,
      type: 'PURCHASE',
      amountIdr,
      volumeM3,
      description: `Pembelian Token Gas Rp ${amountIdr.toLocaleString('id-ID')} (${volumeM3.toFixed(4)} m³ @ Rp ${pricePerM3}/m³)`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      token,
      pricePerM3,
      volumeM3
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/tokens/redeem', (req: Request, res: Response) => {
  try {
    const { tokenCode } = req.body;
    if (!tokenCode) {
      return res.status(400).json({ error: 'Kode token wajib diisi' });
    }

    const result = meterEngine.redeemToken(tokenCode);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    transactions.unshift({
      id: `TRX-RDM-${Date.now().toString().slice(-6)}`,
      meterId: METER_ID,
      type: 'REDEEM',
      volumeM3: result.creditedVolumeM3 || 0,
      description: result.message,
      timestamp: new Date().toISOString()
    });

    broadcastTelemetry();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appliances', (req: Request, res: Response) => {
  const updated = meterEngine.setAppliances(req.body);
  broadcastTelemetry();
  res.json({ success: true, appliances: updated });
});

app.post('/api/valve', (req: Request, res: Response) => {
  const { action } = req.body;
  if (action !== 'OPEN' && action !== 'CLOSE') {
    return res.status(400).json({ error: 'Aksi harus OPEN atau CLOSE' });
  }

  const success = meterEngine.setValveManual(action);
  if (!success) {
    return res.status(400).json({
      success: false,
      message: 'Gagal membuka katup: Kuota gas kosong (0 m³). Silakan isi token terlebih dahulu.'
    });
  }

  broadcastTelemetry();
  res.json({ success: true, state: meterEngine.getState() });
});

app.post('/api/network', (req: Request, res: Response) => {
  const { networkType } = req.body as { networkType: NetworkType };
  if (!['WIFI', 'CELLULAR_4G', 'NBIOT', 'LORAWAN'].includes(networkType)) {
    return res.status(400).json({ error: 'Tipe jaringan tidak valid' });
  }

  meterEngine.setNetworkType(networkType);
  broadcastTelemetry();
  res.json({ success: true, state: meterEngine.getState() });
});

app.post('/api/lora/uplink', (req: Request, res: Response) => {
  try {
    const { hex, meterId = METER_ID } = req.body;
    if (!hex) {
      return res.status(400).json({ error: 'Payload hex LoRaWAN wajib diisi' });
    }

    const decoded = LoraAdapter.decodeUplink(hex, meterId);
    res.json({ success: true, decoded });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/transactions', (req: Request, res: Response) => {
  res.json(transactions);
});

// Middleware penanganan error global (termasuk JSON parse error)
app.use((err: any, req: Request, res: Response, _next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Format JSON request tidak valid' });
  }
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({ error: err.message || 'Terjadi kesalahan pada server' });
});

// WebSocket Handler
wss.on('connection', (ws: WebSocket) => {
  const telemetry = meterEngine.generateTelemetryPacket();
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    telemetry,
    state: meterEngine.getState(),
    appliances: meterEngine.getAppliances(),
    tariff: tariffService.getConfig(),
    vTrigger: meterEngine.getPredictiveCutoffTriggerVolume(),
    loraHex: LoraAdapter.encodeTelemetry(telemetry),
    timestamp: Date.now()
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'SET_APPLIANCE') {
        meterEngine.setAppliances(data.payload);
        broadcastTelemetry();
      } else if (data.type === 'SET_NETWORK') {
        meterEngine.setNetworkType(data.payload);
        broadcastTelemetry();
      }
    } catch {
      // Abaikan
    }
  });
});

export function startServer(port: number = 3001): Promise<http.Server> {
  return new Promise((resolve) => {
    server.listen(port, () => {
      startSimulationLoop();
      const addr = server.address() as AddressInfo;
      console.log(`[GasAuto Backend] Server berjalan di port ${addr.port}`);
      resolve(server);
    });
  });
}

// Hanya jalankan listener otomatis jika dijalankan langsung bukan saat test
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3001;
  startServer(PORT);
}
