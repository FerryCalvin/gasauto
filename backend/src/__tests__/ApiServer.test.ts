import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AddressInfo } from 'net';
import http from 'http';
import { startServer, stopSimulationLoop } from '../server.js';

let runningServer: http.Server;
let baseUrl: string;

describe('Backend API Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    runningServer = await startServer(0); // Port dinamis bebas bentrok
    const addr = runningServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    stopSimulationLoop();
    await new Promise((resolve) => runningServer.close(resolve));
  });

  it('GET /api/health mengembalikan status OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('OK');
  });

  it('GET /api/meter mengembalikan status meter lengkap', async () => {
    const res = await fetch(`${baseUrl}/api/meter`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state.id).toBe('GAS-PLG-001');
    expect(data.telemetry).toBeDefined();
    expect(data.loraHex).toBeDefined();
  });

  it('GET /api/tariff dan PUT /api/tariff dapat membaca dan memperbarui tarif', async () => {
    const getRes = await fetch(`${baseUrl}/api/tariff`);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.pricePerM3).toBeDefined();

    const putRes = await fetch(`${baseUrl}/api/tariff`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricePerM3: 12500, warningThresholdPct: 15 })
    });
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.pricePerM3).toBe(12500);
    expect(putData.warningThresholdPct).toBe(15);
  });

  it('PUT /api/tariff menolak tarif tidak valid', async () => {
    const res = await fetch(`${baseUrl}/api/tariff`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricePerM3: -100 })
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('POST /api/tokens/purchase menghasilkan token 20 digit', async () => {
    const res = await fetch(`${baseUrl}/api/tokens/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountIdr: 50000, meterId: 'GAS-PLG-001' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token.tokenCode).toMatch(/^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/);
    expect(data.volumeM3).toBeGreaterThan(0);
  });

  it('POST /api/tokens/purchase menolak nominal <= 0', async () => {
    const res = await fetch(`${baseUrl}/api/tokens/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountIdr: 0 })
    });

    expect(res.status).toBe(400);
  });

  it('POST /api/tokens/redeem berhasil mengisi token valid', async () => {
    // 1. Beli token
    const buyRes = await fetch(`${baseUrl}/api/tokens/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountIdr: 25000, meterId: 'GAS-PLG-001' })
    });
    const buyData = await buyRes.json();
    const tokenCode = buyData.token.tokenCode;

    // 2. Redeem
    const redeemRes = await fetch(`${baseUrl}/api/tokens/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenCode })
    });

    expect(redeemRes.status).toBe(200);
    const redeemData = await redeemRes.json();
    expect(redeemData.success).toBe(true);
    expect(redeemData.creditedVolumeM3).toBe(buyData.volumeM3);
  });

  it('POST /api/appliances memperbarui beban kompor', async () => {
    const res = await fetch(`${baseUrl}/api/appliances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stove1: 'HIGH', waterHeater: 'ON' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.appliances.stove1).toBe('HIGH');
    expect(data.appliances.waterHeater).toBe('ON');
  });

  it('POST /api/network mengubah tipe jaringan IoT', async () => {
    const res = await fetch(`${baseUrl}/api/network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkType: 'LORAWAN' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state.networkType).toBe('LORAWAN');
  });

  it('POST /api/lora/uplink men-decode payload hex LoRaWAN', async () => {
    const meterRes = await fetch(`${baseUrl}/api/meter`);
    const meterData = await meterRes.json();
    const validHex = meterData.loraHex;

    const res = await fetch(`${baseUrl}/api/lora/uplink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hex: validHex, meterId: 'GAS-PLG-001' })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.decoded.checksumValid).toBe(true);
  });

  it('GET /api/transactions mengembalikan riwayat transaksi', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});
