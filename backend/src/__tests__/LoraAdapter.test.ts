import { describe, it, expect } from 'vitest';
import { LoraAdapter } from '../services/LoraAdapter.js';
import { TelemetryPacket } from '../types/index.js';

describe('LoraAdapter', () => {
  const sampleTelemetry: TelemetryPacket = {
    meter_id: 'GAS-PLG-001',
    serial_number: 'SN-2026-GAS01',
    flow_rate_lpm: 1.5,
    volume_total_m3: 12.3456,
    remaining_quota_m3: 3.456,
    overdraft_m3: 0,
    valve_status: 'OPEN',
    valve_angle_deg: 90,
    battery_pct: 95,
    rssi_dbm: -105,
    network_type: 'LORAWAN',
    is_alert: false,
    timestamp: 1730163600
  };

  it('meng-encode telemetri menjadi 20-karakter Hex string (10 byte)', () => {
    const hex = LoraAdapter.encodeTelemetry(sampleTelemetry);
    expect(hex).toMatch(/^[0-9A-F]{20}$/);
    expect(hex.startsWith('47')).toBe(true); // Header byte 0x47 = 'G'
  });

  it('men-decode payload LoRaWAN dengan benar dan memvalidasi CRC-8', () => {
    const hex = LoraAdapter.encodeTelemetry(sampleTelemetry);
    const decoded = LoraAdapter.decodeUplink(hex, sampleTelemetry.meter_id);

    expect(decoded.meterId).toBe(sampleTelemetry.meter_id);
    expect(decoded.valveStatus).toBe('OPEN');
    expect(decoded.networkType).toBe('LORAWAN');
    expect(decoded.remainingQuotaM3).toBe(3.456);
    expect(decoded.flowRateLpm).toBe(1.5);
    expect(decoded.batteryPct).toBe(95);
    expect(decoded.checksumValid).toBe(true);
  });

  it('mendeteksi payload rusak dengan CRC-8 checksum mismatch', () => {
    const hex = LoraAdapter.encodeTelemetry(sampleTelemetry);
    // Rusak satu byte
    const corruptedHex = hex.slice(0, 10) + 'AA' + hex.slice(12);
    const decoded = LoraAdapter.decodeUplink(corruptedHex, sampleTelemetry.meter_id);

    expect(decoded.checksumValid).toBe(false);
  });

  it('menolak payload dengan panjang tidak valid', () => {
    expect(() => LoraAdapter.decodeUplink('47010203', sampleTelemetry.meter_id)).toThrow(
      'Panjang payload LoRaWAN tidak valid'
    );
  });
});
